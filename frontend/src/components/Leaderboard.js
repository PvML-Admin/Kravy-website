import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../services/api';

function Leaderboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await leaderboardAPI.getByPeriod(period, 50);
      setLeaderboard(response.data.leaderboard);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
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

  return (
    <div className="card">
      <h2>XP Gain Leaderboard</h2>
      
      <div className="tabs">
        <button
          className={`tab ${period === 'daily' ? 'active' : ''}`}
          onClick={() => setPeriod('daily')}
        >
          Daily
        </button>
        <button
          className={`tab ${period === 'weekly' ? 'active' : ''}`}
          onClick={() => setPeriod('weekly')}
        >
          Weekly
        </button>
        <button
          className={`tab ${period === 'monthly' ? 'active' : ''}`}
          onClick={() => setPeriod('monthly')}
        >
          Monthly
        </button>
      </div>

      {loading && <div className="loading">Loading leaderboard...</div>}
      {error && <div className="error">Error: {error}</div>}

      {!loading && !error && (
        <>
          {leaderboard.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Total XP</th>
                  <th>XP Gain</th>
                  <th>Combat Level</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((member, index) => (
                  <tr 
                    key={member.id}
                    onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td>
                      <span className={`rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500', color: '#4a90e2' }}>{member.name}</td>
                    <td>{formatXp(member.totalXp)}</td>
                    <td className="xp-gain">+{formatXp(member.xpGain)}</td>
                    <td>{member.combatLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No data available for this period. Make sure members are synced.</p>
          )}
        </>
      )}
    </div>
  );
}

export default Leaderboard;

