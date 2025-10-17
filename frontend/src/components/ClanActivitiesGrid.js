import React, { useState, useEffect } from 'react';
import { activitiesAPI } from '../services/api';
import './ClanActivitiesGrid.css';

const FILTERS = ['All', 'Achievement', 'Skills', 'Pets', 'Drops'];

function ClanActivitiesGrid() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await activitiesAPI.getClanActivities(100); // Fetch more for filtering
        setActivities(response.data.activities);
      } catch (err) {
        console.error("Could not load clan activities.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const filteredActivities = activeFilter === 'All'
    ? activities
    : activities.filter(act => act.category === activeFilter);

  if (loading) return <div className="card"><h2>Clan Activities</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <div className="activities-header">
        <h2>Clanmate Achievements</h2>
        <div className="activities-filters">
          {FILTERS.map(filter => (
            <button 
              key={filter}
              className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="clan-activities-grid">
        {filteredActivities.map(activity => (
          <div key={activity.id} className="activity-card">
            <div className="activity-card-header">
              <img src={`http://services.runescape.com/m=avatar-rs/${encodeURIComponent(activity.member_name)}/chat.png`} alt={activity.member_name} className="activity-avatar" />
              <div className="activity-card-info">
                <span className="activity-card-member">{activity.display_name || activity.member_name}</span>
                <span className="activity-card-time">{new Date(activity.activity_date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="activity-card-body">
              <p>{activity.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClanActivitiesGrid;
