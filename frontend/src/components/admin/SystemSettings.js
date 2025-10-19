import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './SystemSettings.css';

function SystemSettings() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [twitterStatus, setTwitterStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      // Fetch system info
      try {
        const sysInfo = await adminAPI.getSystemInfo();
        console.log('System Info Response:', sysInfo.data);
        setSystemInfo(sysInfo.data.info);
        console.log('Set systemInfo to:', sysInfo.data.info);
      } catch (err) {
        console.error('Error fetching system info:', err);
      }

      // Fetch twitter status separately to not block system info
      try {
        const twitterStat = await adminAPI.getTwitterStatus();
        console.log('Twitter Status Response:', twitterStat.data);
        setTwitterStatus(twitterStat.data.status);
        console.log('Set twitterStatus to:', twitterStat.data.status);
      } catch (err) {
        console.error('Error fetching twitter status:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="system-settings">
      <div className="section-header">
        <h2>System Settings</h2>
      </div>

      {/* System Information */}
      <div className="section-card">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">Environment:</span>
            <span className="info-value">{systemInfo?.environment || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Node Version:</span>
            <span className="info-value">{systemInfo?.nodeVersion || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Platform:</span>
            <span className="info-value">{systemInfo?.platform || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Uptime:</span>
            <span className="info-value">{formatUptime(systemInfo?.uptime)}</span>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="section-card">
        <h3>Memory Usage</h3>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">Heap Used:</span>
            <span className="info-value">
              {formatBytes(systemInfo?.memoryUsage?.heapUsed)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Heap Total:</span>
            <span className="info-value">
              {formatBytes(systemInfo?.memoryUsage?.heapTotal)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">RSS:</span>
            <span className="info-value">
              {formatBytes(systemInfo?.memoryUsage?.rss)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">External:</span>
            <span className="info-value">
              {formatBytes(systemInfo?.memoryUsage?.external)}
            </span>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="section-card">
        <h3>API Configuration</h3>
        <div className="config-status">
          <div className={`status-item ${systemInfo?.configured?.twitter ? 'configured' : 'not-configured'}`}>
            <span className="status-icon">{systemInfo?.configured?.twitter ? '✓' : '✗'}</span>
            <span className="status-label">Twitter API</span>
          </div>
          <div className={`status-item ${systemInfo?.configured?.oauth ? 'configured' : 'not-configured'}`}>
            <span className="status-icon">{systemInfo?.configured?.oauth ? '✓' : '✗'}</span>
            <span className="status-label">Google OAuth</span>
          </div>
          <div className={`status-item ${systemInfo?.configured?.database ? 'configured' : 'not-configured'}`}>
            <span className="status-icon">{systemInfo?.configured?.database ? '✓' : '✗'}</span>
            <span className="status-label">Database</span>
          </div>
        </div>
      </div>

      {/* Twitter Status */}
      {twitterStatus && (
        <div className="section-card">
          <h3>Twitter API Status</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className={`info-value ${twitterStatus.configured ? 'text-success' : 'text-error'}`}>
                {twitterStatus.configured ? 'Configured' : 'Not Configured'}
              </span>
            </div>
            {twitterStatus.cache && (
              <>
                <div className="info-row">
                  <span className="info-label">Cache Status:</span>
                  <span className="info-value">
                    {twitterStatus.cache.has_data ? 'Active' : 'Empty'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Cache Age:</span>
                  <span className="info-value">
                    {twitterStatus.cache.age_minutes} minutes
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Cached Tweets:</span>
                  <span className="info-value">
                    {twitterStatus.cache.tweets_count}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemSettings;

