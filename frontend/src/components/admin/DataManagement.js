import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './DataManagement.css';

function DataManagement() {
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [inactiveDays, setInactiveDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchInactiveMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactiveDays]);

  const fetchInactiveMembers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getInactiveMembers(inactiveDays);
      setInactiveMembers(response.data.members);
    } catch (err) {
      console.error('Error fetching inactive members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDailyXp = async () => {
    if (!window.confirm('Are you sure you want to clear all daily XP gains? This cannot be undone.')) return;
    
    try {
      await adminAPI.clearDailyXp();
      setMessage({ type: 'success', text: 'Daily XP cleared successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear daily XP' });
    }
  };

  const handleClearWeeklyXp = async () => {
    if (!window.confirm('Are you sure you want to clear all weekly XP gains? This cannot be undone.')) return;
    
    try {
      await adminAPI.clearWeeklyXp();
      setMessage({ type: 'success', text: 'Weekly XP cleared successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear weekly XP' });
    }
  };

  const handleClearTwitterCache = async () => {
    try {
      await adminAPI.clearTwitterCache();
      setMessage({ type: 'success', text: 'Twitter cache cleared!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear Twitter cache' });
    }
  };

  return (
    <div className="data-management">
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="message-close">×</button>
        </div>
      )}

      <div className="section-header">
        <h2>Data Management</h2>
      </div>

      {/* XP Management */}
      <div className="section-card">
        <h3>XP Data Management</h3>
        <p className="section-description">
          Manage XP gain tracking data for leaderboards and statistics
        </p>
        <div className="action-buttons">
          <button 
            className="btn btn-warning"
            onClick={handleClearDailyXp}
          >
            Clear Daily XP
          </button>
          <button 
            className="btn btn-warning"
            onClick={handleClearWeeklyXp}
          >
            Clear Weekly XP
          </button>
        </div>
        <div className="warning-note">
          ⚠️ This will reset XP gain tracking but won't affect member totals
        </div>
      </div>

      {/* Cache Management */}
      <div className="section-card">
        <h3>Cache Management</h3>
        <p className="section-description">
          Clear cached data to force fresh fetches from external APIs
        </p>
        <div className="action-buttons">
          <button 
            className="btn btn-secondary"
            onClick={handleClearTwitterCache}
          >
            Clear Twitter Cache
          </button>
        </div>
      </div>

      {/* Inactive Members */}
      <div className="section-card">
        <h3>Inactive Members</h3>
        <div className="filter-bar">
          <label>
            Show members inactive for:
            <select 
              value={inactiveDays}
              onChange={(e) => setInactiveDays(parseInt(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <span className="count-badge">{inactiveMembers.length} members</span>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="inactive-list">
            {inactiveMembers.slice(0, 20).map(member => (
              <div key={member.id} className="inactive-item">
                <span className="member-name">{member.display_name || member.name}</span>
                <span className="member-xp">{member.total_xp?.toLocaleString() || 0} XP</span>
                <span className="last-active">
                  Last: {member.last_activity_date 
                    ? new Date(member.last_activity_date).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            ))}
            {inactiveMembers.length === 0 && (
              <div className="empty-state">No inactive members found</div>
            )}
            {inactiveMembers.length > 20 && (
              <div className="more-items">And {inactiveMembers.length - 20} more...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataManagement;

