import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import './DailyClanXpGain.css';

function DailyClanXpGain() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await leaderboardAPI.getDailyClanXpHistory(15);
        setHistory(response.data.history);
      } catch (err) {
        console.error("Could not load daily clan XP history.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatXp = (xp) => {
    if (!xp) return '0';
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Daily Clan XP</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Daily Clan XP</h2>
      <div className="daily-xp-history">
        {history.map((day, index) => (
          <div key={index} className="daily-xp-item">
            <span className="xp-date">{formatDate(day.date)}</span>
            <span className="xp-gain">{formatXp(day.total_xp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DailyClanXpGain;
