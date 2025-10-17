import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import './DashboardActivityFeed.css';

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (days > 1) return `${days} days ago`;
  if (days === 1) return '1 day ago';
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function DashboardActivityFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getRecent(5);
        setEvents(response.data.events);
      } catch (err) {
        console.error("Could not load dashboard events.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div className="card"><h2>Activity</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <h2>Activity</h2>
      <ul className="dashboard-activity-feed">
        {events.map(event => (
          <li key={event.id} onClick={() => navigate(`/profile/${encodeURIComponent(event.member_name)}`)}>
            <div className="activity-member-name">{event.member_name}</div>
            <div className="activity-details">
              <span className={`activity-tag ${event.event_type}`}>
                {event.event_type}
              </span>
              <span className="activity-time">{formatTimeAgo(event.timestamp)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DashboardActivityFeed;
