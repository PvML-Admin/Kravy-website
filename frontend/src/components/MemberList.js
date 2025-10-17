import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersAPI, syncAPI, clanAPI } from '../services/api';
import './MemberList.css';

const CLAN_RANKS = [
  'Owner', 'Deputy Owner', 'Overseer', 'Coordinator', 'Admin',
  'General', 'Captain', 'Lieutenant', 'Sergeant', 'Corporal',
  'Recruit',
];

function MemberList() {
  const navigate = useNavigate();
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [newMember, setNewMember] = useState('');
  const [bulkMembers, setBulkMembers] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showClanImport, setShowClanImport] = useState(false);
  const [clanName, setClanName] = useState('');
  const [message, setMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('All');
  const membersPerPage = 20;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await membersAPI.getAll(true, null); // Fetch all active members
      setAllMembers(response.data.members);
      setCurrentPage(1);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    let members = allMembers;
    if (searchTerm) {
      members = members.filter(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.display_name && member.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (rankFilter !== 'All') {
      members = members.filter(member => member.clan_rank === rankFilter);
    }
    return members;
  }, [allMembers, searchTerm, rankFilter]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.trim()) return;

    try {
      await membersAPI.create(newMember, true);
      setNewMember('');
      setMessage({ type: 'success', text: `Member ${newMember} added successfully!` });
      loadMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    const names = bulkMembers.split('\n').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;

    try {
      const response = await membersAPI.bulkCreate(names);
      setBulkMembers('');
      setShowBulkAdd(false);
      setMessage({
        type: 'success',
        text: `Added ${response.data.results.added.length} members. Skipped ${response.data.results.skipped.length}.`
      });
      loadMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('Sync all members? This will run in the background and you can see the progress.')) return;

    try {
      setSyncing(true);
      const response = await syncAPI.syncAllAsync();
      const { syncId, total } = response.data;
      
      setMessage({
        type: 'success',
        text: `Sync started! Syncing ${total} members in background...`
      });

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await syncAPI.getSyncProgress(syncId);
          const progress = progressResponse.data.progress;
          setSyncProgress(progress);

          if (progress.status === 'completed') {
            clearInterval(pollInterval);
            setSyncing(false);
            setMessage({
              type: 'success',
              text: `Sync completed! ${progress.successful} successful, ${progress.failed} failed out of ${progress.total} members.`
            });
            loadMembers();
            setTimeout(() => setSyncProgress(null), 10000); // Clear after 10 seconds
          }
        } catch (err) {
          console.error('Error polling sync progress:', err);
        }
      }, 2000); // Poll every 2 seconds

    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
      setSyncing(false);
    }
  };

  const handleSyncUnsynced = async () => {
    if (!window.confirm('Sync all unsynced members? This will run in the background.')) return;

    try {
      setSyncing(true);
      const response = await syncAPI.syncUnsyncedAsync();
      const { syncId, total, message } = response.data;

      if (total === 0) {
        setMessage({ type: 'info', text: message });
        setSyncing(false);
        return;
      }
      
      setMessage({
        type: 'success',
        text: `Sync started! Syncing ${total} new members in background...`
      });

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await syncAPI.getSyncProgress(syncId);
          const progress = progressResponse.data.progress;
          setSyncProgress(progress);

          if (progress.status === 'completed') {
            clearInterval(pollInterval);
            setSyncing(false);
            setMessage({
              type: 'success',
              text: `Sync completed! ${progress.successful} successful, ${progress.failed} failed out of ${progress.total} members.`
            });
            loadMembers();
            setTimeout(() => setSyncProgress(null), 10000); // Clear after 10 seconds
          }
        } catch (err) {
          console.error('Error polling sync progress:', err);
        }
      }, 2000); // Poll every 2 seconds

    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
      setSyncing(false);
    }
  };

  const handleClanImport = async (e) => {
    e.preventDefault();
    if (!clanName.trim()) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: `Fetching members from clan "${clanName}"...` });
      
      const response = await clanAPI.importMembers(clanName);
      const { results } = response.data;
      
      setClanName('');
      setShowClanImport(false);
      setMessage({
        type: 'success',
        text: `Imported ${results.added} new members, ${results.skipped} already existed. (Source: ${results.source})`
      });
      loadMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMembership = async (e) => {
    e.preventDefault();
    if (!clanName.trim()) return;

    if (!window.confirm(`This will sync membership with clan "${clanName}":\n- Add new clan members\n- Remove members who left\n\nContinue?`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: 'info', text: `Syncing membership with clan "${clanName}"...` });
      
      const response = await clanAPI.syncMembership(clanName);
      const { results } = response.data;
      
      setClanName('');
      setShowClanImport(false);
      
      let messageText = `Membership synced! ${results.kept} kept, ${results.added} added, ${results.removed} removed. (Source: ${results.source})`;
      if (results.addedNames.length > 0) {
        messageText += `\nAdded: ${results.addedNames.slice(0, 5).join(', ')}${results.addedNames.length > 5 ? '...' : ''}`;
      }
      if (results.removedNames.length > 0) {
        messageText += `\nRemoved: ${results.removedNames.slice(0, 5).join(', ')}${results.removedNames.length > 5 ? '...' : ''}`;
      }
      
      setMessage({
        type: 'success',
        text: messageText
      });
      loadMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('DELETE ALL MEMBERS?\n\nThis will permanently delete all members and their data from the database.\n\nAre you absolutely sure?')) {
      return;
    }

    if (!window.confirm('This cannot be undone! Type confirmation is recommended.\n\nLast chance - delete everything?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await membersAPI.deleteAll();
      setMessage({
        type: 'success',
        text: `Deleted ${response.data.count} members successfully.`
      });
      loadMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id, name) => {
    if (!window.confirm(`Delete member ${name}?`)) return;

    try {
      await membersAPI.delete(id);
      setMessage({ type: 'success', text: `Member ${name} deleted successfully!` });
      loadMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const formatXp = (xp) => {
    if (xp >= 1000000000) return `${(xp / 1000000000).toFixed(2)}B`;
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatLastActive = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const formatShortNumber = (num) => {
    if (!num) return '0';
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toLocaleString();
  };

  if (loading) return <div className="loading">Loading members...</div>;

  return (
    <div>
      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Clan Members ({filteredMembers.length})</h2>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <input 
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
            <select 
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="form-control"
            >
              <option value="All">All Ranks</option>
              {CLAN_RANKS.map(rank => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {filteredMembers.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Total XP</th>
                <th>Clan XP</th>
                <th>Kills</th>
                <th>Combat Level</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers
                .slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage)
                .map((member) => (
                <tr key={member.id}>
                  <td 
                    onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}
                    style={{ 
                      cursor: 'pointer',
                      color: '#4a90e2',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {member.rank_icon && (
                        <img 
                          src={member.rank_icon} 
                          alt={member.clan_rank}
                          title={member.clan_rank}
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            marginRight: '8px',
                            flexShrink: 0
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <div style={{ color: member.rank_color || '#4a90e2', fontWeight: '500' }}>
                          {member.display_name || member.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                          {member.joined_at && (
                            <div>Join date: {new Date(member.joined_at).toLocaleDateString()}</div>
                          )}
                          {member.days_inactive !== null && member.days_inactive > 0 && (
                            <div style={{ color: member.days_inactive > 90 ? '#dc3545' : '#666' }}>
                              Inactive: {member.days_inactive} days
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatXp(member.total_xp)}</td>
                  <td>{formatXp(member.clan_xp || 0)}</td>
                  <td>{member.kills || 0}</td>
                  <td>{member.combat_level || 0}</td>
                  <td style={{ color: member.last_xp_gain ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                    {formatLastActive(member.last_xp_gain)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No members found. Add some members to get started!</p>
        )}

        {/* Pagination Controls */}
        {filteredMembers.length > membersPerPage && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '10px',
            marginTop: '20px',
            padding: '15px'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{ padding: '8px 16px' }}
            >
              Previous
            </button>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              {Array.from({ length: Math.ceil(filteredMembers.length / membersPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and pages around current
                  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1;
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span style={{ padding: '8px' }}>...</span>}
                      <button
                        className={`btn ${page === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCurrentPage(page)}
                        style={{ 
                          padding: '8px 12px',
                          minWidth: '40px',
                          fontWeight: page === currentPage ? 'bold' : 'normal'
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>
            
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredMembers.length / membersPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(filteredMembers.length / membersPerPage)}
              style={{ padding: '8px 16px' }}
            >
              Next
            </button>
            
            <div style={{ marginLeft: '15px', color: '#666', fontSize: '0.9rem' }}>
              Page {currentPage} of {Math.ceil(filteredMembers.length / membersPerPage)} 
              ({filteredMembers.length} total members)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberList;

