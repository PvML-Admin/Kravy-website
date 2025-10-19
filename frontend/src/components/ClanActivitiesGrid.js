import React, { useState, useEffect } from 'react';
import { activitiesAPI } from '../services/api';
import SpecialName from './SpecialNames';
import { formatRelativeTimeBST } from '../utils/dateFormatter';
import { getActivityIcon } from '../utils/activityIcons';
import './ClanActivitiesGrid.css';

const FILTERS = ['All', 'Achievement', 'Skills', 'Pets', 'Drops'];
const ACTIVITIES_PER_PAGE = 21;

// Format skill XP text to be more readable
function formatActivityText(text) {
  // Match patterns like "106000000XP in Attack"
  const xpPattern = /(\d+)(XP\s+in\s+)/i;
  return text.replace(xpPattern, (match, number, rest) => {
    // Add commas to the number
    const formattedNumber = parseInt(number).toLocaleString();
    // Add space between number and XP
    return `${formattedNumber} ${rest}`;
  });
}

function ClanActivitiesGrid() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await activitiesAPI.getClanActivities(100); // Fetch more for filtering
        const sortedActivities = response.data.activities.sort((a, b) => {
          return new Date(b.activity_date) - new Date(a.activity_date);
        });
        setActivities(sortedActivities);
      } catch (err) {
        console.error("Could not load clan activities.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const filteredActivities = activeFilter === 'All'
    ? activities
    : activities.filter(act => act.category === activeFilter);

  const totalPages = Math.ceil(filteredActivities.length / ACTIVITIES_PER_PAGE);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * ACTIVITIES_PER_PAGE,
    currentPage * ACTIVITIES_PER_PAGE
  );

  if (loading) return <div className="card"><h2>Clan Activities</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <div className="activities-header">
        <h2>Clanmate Achievements</h2>
        <div className="filter-pills">
          {FILTERS.map(filter => (
            <button 
              key={filter}
              className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="clan-activities-grid">
        {paginatedActivities.map(activity => (
          <div key={activity.id} className="activity-card">
            <div className="activity-card-header">
              <img src={`http://services.runescape.com/m=avatar-rs/${encodeURIComponent(activity.member_name)}/chat.png`} alt={activity.member_name} className="activity-avatar" />
              <div className="activity-card-info">
                <span className="activity-card-member">
                  <SpecialName name={activity.display_name || activity.member_name} />
                </span>
                <span className="activity-card-time">{formatRelativeTimeBST(activity.activity_date)}</span>
              </div>
            </div>
            <div className="activity-card-body">
              <img 
                src={getActivityIcon(activity)} 
                alt={activity.category}
                className="activity-icon"
              />
              <p>{formatActivityText(activity.text)}</p>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn-pagination"
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn-pagination"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default ClanActivitiesGrid;
