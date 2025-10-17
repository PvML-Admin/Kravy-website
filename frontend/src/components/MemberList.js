import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersAPI } from '../services/api';
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

  const formatXp = (xp) => {
    if (xp >= 1000000000) return `${(xp / 1000000000).toFixed(2)}B`;
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
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

  if (loading) return <div className="loading">Loading members...</div>;

  return (
    <div>
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

