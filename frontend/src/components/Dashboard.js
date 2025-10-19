import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../services/api';
import DashboardHeader from './DashboardHeader';
import HighestRanks from './HighestRanks';
import DailyClanXpGain from './DailyClanXpGain';
import TwitterFeed from './TwitterFeed';
import ClanActivitiesGrid from './ClanActivitiesGrid';
import SpecialName from './SpecialNames';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [topGainers, setTopGainers] = useState(null);
  const [xpGainPeriod, setXpGainPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFullInfo, setShowFullInfo] = useState(
    localStorage.getItem('showFullClanInfo') === 'true'
  );

  const aboutText = `discord.gg/kravy Everybody welcome!
Do the things you enjoy with the people you enjoy doing them with.

Social | PvM | Clues | Skilling | DnDs | Watchalongs | Other Games

Kravy is a welcoming and incredibly active clan on W124. We have all types of players from the most knowledgeable of PVMers to the best Clue minds in the game. Skillers with 5.8B XP to up-and-coming players from across the board, keen to get stuck in.

• A Discord that is well-designed and filled with resources and support.
• Plenty of VC and CC activity.
• Events! Events! Events!
• A Leadership team that is present and active.
• Support for ALL tiers of PvM with our PVM Mentors team and the 'Reaper Crew' Crew.

Info:
• Requirements: 2.5k total level.
• Rank up: Clan Contributions.
• Home worlds: 124.
• Founded: 24th September 2021.
• Meeting Point: Wars Steps.`;

  const toggleShowFullInfo = () => {
    const newValue = !showFullInfo;
    setShowFullInfo(newValue);
    localStorage.setItem('showFullClanInfo', newValue);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const gainersRes = await leaderboardAPI.getTopGainers(25);
      setTopGainers(gainersRes.data.topGainers);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatXp = (xp) => {
    if (!xp) return '0';
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <DashboardHeader />
      <div className="dashboard-body">
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="grid-column">
            <HighestRanks />
            <DailyClanXpGain />
            <TwitterFeed />
          </div>
          
          {/* Center Column */}
          <div className="grid-column-large">
            <div className="card">
              <div className="clan-info-header">
                <h2>Clan Information</h2>
                <button onClick={toggleShowFullInfo} className="btn-toggle-info">
                  {showFullInfo ? 'Show Less' : 'Show More'}
                </button>
              </div>
              <p className={`about-text ${showFullInfo ? 'expanded' : ''}`}>{aboutText}</p>
            </div>
            <ClanActivitiesGrid />
          </div>

          {/* Right Column */}
          <div className="grid-column">
            <div className="card today-xp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0 }}>XP Gain</h2>
                <div className="filter-pills">
                  <button
                    className={`filter-pill ${xpGainPeriod === 'daily' ? 'active' : ''}`}
                    onClick={() => setXpGainPeriod('daily')}
                  >
                    Daily
                  </button>
                  <button
                    className={`filter-pill ${xpGainPeriod === 'weekly' ? 'active' : ''}`}
                    onClick={() => setXpGainPeriod('weekly')}
                  >
                    Weekly
                  </button>
                </div>
              </div>
              {topGainers?.[xpGainPeriod]?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topGainers[xpGainPeriod].map((member, index) => (
                      <tr 
                        key={member.id}
                        onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}
                        style={{ cursor: 'pointer' }}
                        className="clickable-row"
                      >
                        <td>{index + 1}</td>
                        <td>
                          <SpecialName name={member.display_name || member.name} />
                        </td>
                        <td className="xp-gain">{formatXp(member.xpGain)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No XP gains recorded for this period.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

