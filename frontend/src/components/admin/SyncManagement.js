import React, { useState, useEffect } from 'react';
import { adminAPI, syncAPI } from '../../services/api';
import './SyncManagement.css';

function SyncManagement() {
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSyncData();
    const interval = setInterval(fetchSyncData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSyncData = async () => {
    try {
      const [progressRes, logsRes] = await Promise.all([
        adminAPI.getSyncProgress(),
        adminAPI.getSyncLogs(50)
      ]);
      
      setSyncProgress(progressRes.data.progress);
      setSyncLogs(logsRes.data.logs);
    } catch (err) {
      console.error('Error fetching sync data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('Sync all members? This may take a while.')) return;
    
    try {
      setSyncing(true);
      await syncAPI.syncAllAsync();
      alert('Sync started in background!');
      fetchSyncData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncUnsynced = async () => {
    if (!window.confirm('Sync all unsynced members?')) return;
    
    try {
      setSyncing(true);
      await syncAPI.syncUnsyncedAsync();
      alert('Sync started in background!');
      fetchSyncData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const activeSyncs = Object.keys(syncProgress || {});

  return (
    <div className="sync-management">
      <div className="section-header">
        <h2>Sync Management</h2>
        <div className="sync-actions">
          <button 
            className="btn btn-primary"
            onClick={handleSyncUnsynced}
            disabled={syncing}
          >
            Sync New Members
          </button>
          <button 
            className="btn btn-success"
            onClick={handleSyncAll}
            disabled={syncing}
          >
            Sync All Members
          </button>
        </div>
      </div>

      {/* Active Syncs */}
      <div className="section-card">
        <h3>Active Syncs</h3>
        {activeSyncs.length > 0 ? (
          <div className="active-syncs">
            {activeSyncs.map(syncId => {
              const sync = syncProgress[syncId];
              const progress = (sync.processed / sync.total * 100).toFixed(1);
              
              return (
                <div key={syncId} className="active-sync-item">
                  <div className="sync-info">
                    <strong>Sync {syncId}</strong>
                    <span>{sync.processed} / {sync.total} members</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="sync-stats">
                    <span className="stat-success">✓ {sync.successful}</span>
                    <span className="stat-error">✗ {sync.failed}</span>
                    {sync.rateLimited > 0 && (
                      <span className="stat-warning">⚠ {sync.rateLimited} rate limited</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No active syncs</div>
        )}
      </div>

      {/* Recent Sync Logs */}
      <div className="section-card">
        <h3>Recent Sync Logs</h3>
        <div className="sync-logs">
          {syncLogs.map((log, index) => (
            <div key={index} className={`log-item status-${log.status}`}>
              <div className="log-member">{log.member_name || 'Unknown'}</div>
              <div className="log-details">
                <span className="log-status">{log.status}</span>
                {log.xp_gained > 0 && (
                  <span className="log-xp">+{log.xp_gained.toLocaleString()} XP</span>
                )}
                <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {syncLogs.length === 0 && (
            <div className="empty-state">No sync logs available</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SyncManagement;

