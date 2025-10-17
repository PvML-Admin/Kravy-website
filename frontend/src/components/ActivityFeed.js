import React, { useState, useEffect } from 'react';
import { activitiesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './ActivityFeed.css';

const WIKI_BASE_URL = 'https://runescape.wiki';

const getIconForActivity = (text) => {
  if (!text) return `${WIKI_BASE_URL}/images/RuneScape_icon.png`;

  const lowerText = text.toLowerCase();

  // A complete and accurate map of skill names to their official icon filenames.
  const skillIconMap = {
    'attack': 'Attack_detail', 'defence': 'Defence_detail', 'strength': 'Strength_detail',
    'constitution': 'Constitution_detail', 'ranged': 'Ranged_detail', 'prayer': 'Prayer_detail',
    'magic': 'Magic_detail', 'runecrafting': 'Runecrafting_detail', 'construction': 'Construction_detail',
    'dungeoneering': 'Dungeoneering_detail', 'smithing': 'Smithing_detail', 'mining': 'Mining_detail',
    'herblore': 'Herblore_detail', 'agility': 'Agility_detail', 'thieving': 'Thieving_detail',
    'farming': 'Farming_detail', 'fletching': 'Fletching_detail', 'hunter': 'Hunter_detail',
    'summoning': 'Summoning_detail', 'woodcutting': 'Woodcutting_detail', 'firemaking': 'Firemaking_detail',
    'crafting': 'Crafting_detail', 'fishing': 'Fishing_detail', 'cooking': 'Cooking_detail',
    'slayer': 'Slayer_detail', 'divination': 'Divination_detail', 'invention': 'Invention_detail',
    'archaeology': 'Archaeology_detail', 'necromancy': 'Necromancy_detail'
  };

  for (const [skill, iconName] of Object.entries(skillIconMap)) {
    if (lowerText.includes(skill)) {
      return `https://runescape.wiki/images/thumb/${encodeURIComponent(iconName)}.png/25px-${encodeURIComponent(iconName)}.png`;
    }
  }

  // Fallback icons for common activities
  if (lowerText.includes('quest')) return `${WIKI_BASE_URL}/images/Quest_point_icon.png`;
  if (lowerText.includes('clue') || lowerText.includes('treasure')) return `${WIKI_BASE_URL}/images/Treasure_Trails_icon.png`;
  if (lowerText.includes('found') || lowerText.includes('looted') || lowerText.includes('drop')) return `${WIKI_BASE_URL}/images/Rare_drop_symbol.png`;

  return `${WIKI_BASE_URL}/images/RuneScape_icon.png`;
};

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
        memberName: activity.memberName,
        timestamp: new Date(activity.date).toISOString(),
        text: activity.text,
        details: activity.details,
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
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
                  src={getIconForActivity(activity.text)} 
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

