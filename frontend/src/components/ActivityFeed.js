import React, { useState, useEffect } from 'react';
import { activitiesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { getActivityIcon } from '../utils/activityIcons';
import './ActivityFeed.css';

function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await activitiesAPI.getClanActivities(20);

      // Map RuneMetrics activities to our format
      const mappedActivities = response.data.activities.map((activity, index) => ({
        id: `activity-${activity.timestamp}-${index}`,
        type: 'achievement',
        memberName: activity.memberName || activity.member_name,
        timestamp: new Date(activity.date || activity.activity_date).toISOString(),
        text: activity.text,
        details: activity.details,
        category: activity.category,
        message: activity.text
      }));

      setActivities(mappedActivities);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatXp = (xp) => {
    if (xp >= 1000000000) return `${(xp / 1000000000).toFixed(2)}B`;
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    
    // Format as DD/MM/YYYY HH:MM
    return date.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleMemberClick = (memberName) => {
    navigate(`/profile/${encodeURIComponent(memberName)}`);
  };

  if (loading && activities.length === 0) {
    return (
      <div className="card">
        <h3>Activity Feed</h3>
        <p>Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Recent Activity</h3>
        <button 
          onClick={loadActivities} 
          className="btn btn-secondary"
          style={{ fontSize: '0.9rem', padding: '5px 15px' }}
        >
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="activity-feed">
        {activities.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            No recent activity
          </p>
        ) : (
          <div className="activity-list">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`activity-item ${activity.memberName ? 'clickable' : ''}`}
                onClick={() => activity.memberName && handleMemberClick(activity.memberName)}
              >
                <img 
                  src={getActivityIcon(activity)} 
                  alt=""
                  className="activity-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                
                <div className="activity-content">
                  <div className="activity-text">
                    <span className="activity-member-name">{activity.memberName}</span> {activity.text}
                  </div>
                </div>

                <div className="activity-timestamp">
                  {formatTimestamp(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;

