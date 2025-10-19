import React, { useState, useEffect } from 'react';
import { adminAPI, twitterAPI } from '../../services/api';
import './DashboardOverview.css';

function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [twitterStatus, setTwitterStatus] = useState(null);
  const [refreshingTwitter, setRefreshingTwitter] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTwitterStatus();
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

  const fetchTwitterStatus = async () => {
    try {
      const response = await twitterAPI.getStatus();
      setTwitterStatus(response.data);
    } catch (err) {
      console.error('Error fetching Twitter status:', err);
    }
  };

  const refreshTwitterFeed = async () => {
    setRefreshingTwitter(true);
    try {
      const response = await twitterAPI.refresh();
      const data = response.data;
      
      if (data.success) {
        alert(`✓ Twitter feed refreshed successfully!\n\nFetched ${data.count} tweets.`);
        fetchTwitterStatus(); // Update status
      } else {
        alert(`✗ Failed to refresh Twitter feed:\n${data.message}`);
      }
    } catch (error) {
      console.error('Error refreshing Twitter feed:', error);
      
      // Check if it's a rate limit error
      if (error.response?.status === 429) {
        alert('⏱️ Twitter API Rate Limit Reached\n\nThe Twitter Free tier has strict rate limits. Please wait 15 minutes before refreshing again.\n\nThe cache will automatically refresh after 24 hours.');
      } else {
        alert('✗ Error refreshing Twitter feed. Please try again later.');
      }
    } finally {
      setRefreshingTwitter(false);
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

      {/* Twitter Feed Management */}
      <div className="section-card">
        <h3>Twitter Feed</h3>
        {twitterStatus?.configured ? (
          <div className="twitter-management">
            <div className="twitter-info">
              <div className="info-item">
                <span className="info-label">Account:</span>
                <span className="info-value">@{twitterStatus.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Cache Status:</span>
                <span className="info-value">
                  {twitterStatus.cache?.has_data ? (
                    <>
                      {twitterStatus.cache.tweets_count} tweets cached
                      {twitterStatus.cache.age_minutes > 0 && (
                        <span className="cache-age"> ({twitterStatus.cache.age_minutes} min ago)</span>
                      )}
                    </>
                  ) : (
                    'No cached data'
                  )}
                </span>
              </div>
            </div>
            <button 
              className="btn-refresh-twitter"
              onClick={refreshTwitterFeed}
              disabled={refreshingTwitter}
            >
              {refreshingTwitter ? 'Refreshing...' : 'Refresh Twitter Feed'}
            </button>
            <p className="twitter-hint">
              Click refresh after posting a new tweet. Twitter Free tier: 1,500 requests/month (~50/day). Cache auto-refreshes every 24 hours. Use sparingly!
            </p>
          </div>
        ) : (
          <div className="twitter-not-configured">
            <p>Twitter feed is not configured</p>
          </div>
        )}
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

