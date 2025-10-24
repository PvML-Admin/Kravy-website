import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import './DailyClanXpGain.css';

function DailyClanXpGain() {
  const [currentDailyXp, setCurrentDailyXp] = useState(0);
  const [currentWeeklyXp, setCurrentWeeklyXp] = useState(0);
  const [currentMonthlyXp, setCurrentMonthlyXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAllClanXp = async () => {
    try {
      const [dailyResponse, weeklyResponse, monthlyResponse] = await Promise.all([
        leaderboardAPI.getCurrentDailyClanXp(),
        leaderboardAPI.getCurrentWeeklyClanXp(),
        leaderboardAPI.getCurrentMonthlyClanXp()
      ]);
      
      setCurrentDailyXp(dailyResponse.data.data.total_xp);
      setCurrentWeeklyXp(weeklyResponse.data.data.total_xp);
      setCurrentMonthlyXp(monthlyResponse.data.data.total_xp);
    } catch (err) {
      console.error("Could not load clan XP data.", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAllClanXp();
      setLoading(false);
    };
    
    loadData();

    const interval = setInterval(fetchAllClanXp, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const formatXp = (xp) => {
    if (!xp) return '0';
    if (xp >= 1000000000) return `${(xp / 1000000000).toFixed(1)}B`;
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toLocaleString();
  };

  const getNextReset = (period) => {
    const now = new Date();
    
    if (period === 'daily') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow;
    } else if (period === 'weekly') {
      // Next Monday at 00:00 UTC
      const nextMonday = new Date(now);
      const daysUntilMonday = (8 - now.getUTCDay()) % 7;
      nextMonday.setDate(now.getUTCDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
      nextMonday.setUTCHours(0, 0, 0, 0);
      return nextMonday;
    } else if (period === 'monthly') {
      // First day of next month at 00:00 UTC
      const nextMonth = new Date(now);
      nextMonth.setUTCMonth(now.getUTCMonth() + 1, 1);
      nextMonth.setUTCHours(0, 0, 0, 0);
      return nextMonth;
    }
  };

  const getTimeUntilReset = (period) => {
    const now = new Date();
    const resetTime = getNextReset(period);
    const diff = resetTime - now;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Clan XP Progress</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Clan XP Progress</h2>
      <div className="clan-xp-container">
        <div className="clan-xp-item daily">
          <div className="xp-period">
            <span className="period-label">Today</span>
            <span className="reset-timer">Resets in {getTimeUntilReset('daily')}</span>
          </div>
          <span className="xp-gain daily-xp">{formatXp(currentDailyXp)}</span>
        </div>
        
        <div className="clan-xp-item weekly">
          <div className="xp-period">
            <span className="period-label">This Week</span>
            <span className="reset-timer">Resets in {getTimeUntilReset('weekly')}</span>
          </div>
          <span className="xp-gain weekly-xp">{formatXp(currentWeeklyXp)}</span>
        </div>
        
        <div className="clan-xp-item monthly">
          <div className="xp-period">
            <span className="period-label">This Month</span>
            <span className="reset-timer">Resets in {getTimeUntilReset('monthly')}</span>
          </div>
          <span className="xp-gain monthly-xp">{formatXp(currentMonthlyXp)}</span>
        </div>
      </div>
    </div>
  );
}

export default DailyClanXpGain;
