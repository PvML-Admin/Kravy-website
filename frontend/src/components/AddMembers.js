import React, { useState } from 'react';
import { membersAPI, syncAPI, clanAPI } from '../services/api';
import './AddMembers.css';

function AddMembers() {
  const [newMember, setNewMember] = useState('');
  const [bulkMembers, setBulkMembers] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showClanImport, setShowClanImport] = useState(false);
  const [clanName, setClanName] = useState('');
  const [message, setMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.trim()) return;

    try {
      await membersAPI.create(newMember, true);
      setNewMember('');
      setMessage({ type: 'success', text: `Member ${newMember} added successfully!` });
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
            setTimeout(() => setSyncProgress(null), 10000);
          }
        } catch (err) {
          console.error('Error polling sync progress:', err);
        }
      }, 2000);

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
            setTimeout(() => setSyncProgress(null), 10000);
          }
        } catch (err) {
          console.error('Error polling sync progress:', err);
        }
      }, 2000);

    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
      setSyncing(false);
    }
  };

  const handleClanImport = async (e) => {
    e.preventDefault();
    if (!clanName.trim()) return;

    try {
      setMessage({ type: 'info', text: `Fetching members from clan "${clanName}"...` });
      
      const response = await clanAPI.importMembers(clanName);
      const { results } = response.data;
      
      setClanName('');
      setShowClanImport(false);
      setMessage({
        type: 'success',
        text: `Imported ${results.added} new members, ${results.skipped} already existed. (Source: ${results.source})`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleSyncMembership = async (e) => {
    e.preventDefault();
    if (!clanName.trim()) return;

    if (!window.confirm(`This will sync membership with clan "${clanName}":\n- Add new clan members\n- Remove members who left\n\nContinue?`)) {
      return;
    }

    try {
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
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  return (
    <div>
      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      <div className="card">
        <h2>Admin Tools</h2>
        <form onSubmit={handleAddMember}>
          <div className="form-group">
            <label>Add Single Member (RSN)</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-control"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Enter RuneScape username"
                style={{ flex: '1', minWidth: '200px' }}
              />
              <button type="submit" className="btn btn-primary">Add</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBulkAdd(!showBulkAdd)}>
                Bulk Add
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ backgroundColor: '#7289da', color: 'white' }}
                onClick={() => setShowClanImport(!showClanImport)}
              >
                Import Clan
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleSyncUnsynced} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync New'}
              </button>
              <button type="button" className="btn btn-success" onClick={handleSyncAll} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync All'}
              </button>
            </div>
          </div>
        </form>

        {syncProgress && (
          <div className="sync-progress-box">
            <h4>Sync Progress</h4>
            <div style={{ marginBottom: '8px' }}>
              <strong>Status:</strong> {syncProgress.status}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Progress:</strong> {syncProgress.processed} / {syncProgress.total} members
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Successful:</strong> {syncProgress.successful} | <strong>Failed:</strong> {syncProgress.failed}
              {syncProgress.rateLimited > 0 && (
                <span className="rate-limited-text">
                  | <strong>Rate Limited:</strong> {syncProgress.rateLimited}
                </span>
              )}
            </div>
            <div className="sync-progress-bar-container">
              <div
                className="sync-progress-bar"
                style={{
                  width: `${(syncProgress.processed / syncProgress.total * 100)}%`,
                }}
              ></div>
            </div>
            {syncProgress.status === 'running' && (
              <div className="sync-status-text">
                Auto-adjusting speed to avoid rate limits...
              </div>
            )}
          </div>
        )}

        {showClanImport && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <div className="form-group">
              <label>Clan Management</label>
              <p style={{ fontSize: '0.9rem', color: '#666', margin: '5px 0 15px 0' }}>
                Manage your clan membership
              </p>
              <input
                type="text"
                className="form-control"
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                placeholder="Enter your clan name (e.g., Kravy)"
                style={{ marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleClanImport}
                  disabled={!clanName.trim()}
                >
                  Import Only (Add New)
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ backgroundColor: '#28a745', color: 'white' }}
                  onClick={handleSyncMembership}
                  disabled={!clanName.trim()}
                >
                  Sync Membership (Add + Remove)
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowClanImport(false)}
                >
                  Cancel
                </button>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                <strong>Import Only:</strong> Adds new members, keeps existing ones<br/>
                <strong>Sync Membership:</strong> Adds new members AND removes members who left the clan
              </div>
            </div>
          </div>
        )}

        {showBulkAdd && (
          <form onSubmit={handleBulkAdd} style={{ marginTop: '15px' }}>
            <div className="form-group">
              <label>Bulk Add Members (one per line)</label>
              <textarea
                className="form-control"
                value={bulkMembers}
                onChange={(e) => setBulkMembers(e.target.value)}
                placeholder="Enter one username per line&#10;Example:&#10;PlayerName1&#10;PlayerName2&#10;PlayerName3"
                rows="10"
              />
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Add All</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkAdd(false)}>Cancel</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddMembers;
