import React, { useState, useEffect } from 'react';
import { syncAPI } from '../services/api';
import './SyncProgress.css';

function SyncProgress() {
  const [syncs, setSyncs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const progress = await syncAPI.getSyncProgress();
      setSyncs(progress);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
    const interval = setInterval(loadProgress, 1000); // Poll every second
    return () => clearInterval(interval);
  }, []);

  const startSync = async () => {
    try {
      await syncAPI.syncAllAsync();
      // After starting a sync, refresh the progress list
      loadProgress();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="sync-progress-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Sync Progress</h2>
        <button onClick={startSync} className="btn btn-primary">Sync All Members</button>
      </div>

      {loading && <p>Loading sync progress...</p>}
      {error && <div className="error">{error}</div>}

      <div className="sync-progress-container">
        {syncs.length > 0 ? (
          syncs.map(sync => (
            <div key={sync.syncId} className="sync-item">
              <p><strong>Sync ID:</strong> {sync.syncId}</p>
              <p><strong>Status:</strong> {sync.status}</p>
              <p><strong>Progress:</strong> {sync.processed} / {sync.total}</p>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar"
                  style={{ width: `${(sync.processed / sync.total) * 100}%` }}
                >
                  {Math.round((sync.processed / sync.total) * 100)}%
                </div>
              </div>
              {sync.errors && sync.errors.length > 0 && (
                <div>
                  <h4>Errors:</h4>
                  <ul className="error-list">
                    {sync.errors.map((err, index) => (
                      <li key={index}>{err.member}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>No active syncs.</p>
        )}
      </div>
    </div>
  );
}

export default SyncProgress;
