import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import './DailyClanXpGain.css';

function DailyClanXpGain() {
  const [currentDailyXp, setCurrentDailyXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCurrentDailyXp = async () => {
    try {
      const response = await leaderboardAPI.getCurrentDailyClanXp();
      setCurrentDailyXp(response.data.data.total_xp);
    } catch (err) {
      console.error("Could not load current daily clan XP.", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCurrentDailyXp();
      setLoading(false);
    };
    
    loadData();

    const interval = setInterval(fetchCurrentDailyXp, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const formatXp = (xp) => {
    if (!xp) return '0';
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
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
      <div className="daily-xp-today">
        <div className="daily-xp-item today">
          <span className="xp-date">Today</span>
          <span className="xp-gain">{formatXp(currentDailyXp)}</span>
        </div>
      </div>
    </div>
  );
}

export default DailyClanXpGain;
