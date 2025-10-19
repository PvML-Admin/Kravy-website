import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './DashboardOverview.css';

function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.stats);
      setError(null);
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard-overview">
      <div className="stats-grid">
        {/* Member Stats */}
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Members</div>
            <div className="stat-value">{stats?.totalMembers || 0}</div>
            <div className="stat-details">
              <span className="stat-detail success">{stats?.activeMembers || 0} active</span>
              <span className="stat-detail error">{stats?.inactiveMembers || 0} inactive</span>
            </div>
          </div>
        </div>

        {/* Recently Active */}
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Recently Active</div>
            <div className="stat-value">{stats?.recentlyActive || 0}</div>
            <div className="stat-details">
              <span className="stat-detail">Last 7 days</span>
            </div>
          </div>
        </div>

        {/* Activities */}
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Activities</div>
            <div className="stat-value">{stats?.database?.activity_count?.toLocaleString() || 0}</div>
            <div className="stat-details">
              <span className="stat-detail">{stats?.database?.snapshot_count?.toLocaleString() || 0} snapshots</span>
            </div>
          </div>
        </div>

        {/* Sync Status */}
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Sync Status</div>
            <div className="stat-value">
              {stats?.syncStatus && Object.keys(stats.syncStatus).length > 0 ? (
                <span className="status-active">Active</span>
              ) : (
                <span className="status-idle">Idle</span>
              )}
            </div>
            <div className="stat-details">
              <span className="stat-detail">
                {Object.keys(stats?.syncStatus || {}).length} running
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Syncs */}
      <div className="section-card">
        <h3>Recent Syncs</h3>
        <div className="sync-list">
          {stats?.recentSyncs?.slice(0, 10).map((sync, index) => (
            <div key={index} className="sync-item">
              <div className="sync-member">{sync.member_name || 'Unknown'}</div>
              <div className="sync-details">
                <span className={`sync-status ${sync.status}`}>{sync.status}</span>
                <span className="sync-time">{new Date(sync.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {(!stats?.recentSyncs || stats.recentSyncs.length === 0) && (
            <div className="empty-state">No recent syncs</div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="section-card">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Database Records:</span>
            <span className="info-value">{stats?.database?.member_count?.toLocaleString() || 0} members</span>
          </div>
          <div className="info-item">
            <span className="info-label">Clan Events:</span>
            <span className="info-value">{stats?.database?.event_count?.toLocaleString() || 0} events</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;

