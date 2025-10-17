import React, { useState, useEffect } from 'react';
import { syncAPI } from '../services/api';
import './SyncStatus.css';

function SyncStatus() {
  const [syncs, setSyncs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        setLoading(true);
        const response = await syncAPI.getSyncStatus();
        setSyncs(response);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && syncs.length === 0) {
    return (
      <div className="sync-status-container">
        <h4>Sync Progress</h4>
        <p>Loading sync status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sync-status-container">
        <h4>Sync Progress</h4>
        <p>Error: {error.message}</p>
      </div>
    );
  }

  if (syncs.length === 0) {
    return (
      <div className="sync-status-container">
        <h4>Sync Progress</h4>
        <p>No active sync processes.</p>
      </div>
    );
  }

  const sync = syncs[0]; // Assuming we only show the most recent sync
  const progress = sync.total > 0 ? (sync.processed / sync.total) * 100 : 0;

  return (
    <div className="sync-status-container">
      <h4>Sync Progress</h4>
      <div className="progress-bar-container">
        <div 
          className="progress-bar"
          style={{ width: `${progress}%` }}
        >
          {Math.round(progress)}%
        </div>
      </div>
      <p>{sync.status === 'running' ? 'Auto-adjusting speed to avoid rate limits...' : 'Sync completed.'}</p>
    </div>
  );
}

export default SyncStatus;
