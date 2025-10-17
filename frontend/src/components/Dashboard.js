import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../services/api';
import DashboardHeader from './DashboardHeader';
import HighestRanks from './HighestRanks';
import DashboardActivityFeed from './DashboardActivityFeed';
import ClanActivitiesGrid from './ClanActivitiesGrid';
import MemberList from './MemberList';
import Leaderboard from './Leaderboard';
import ClanHiscores from './ClanHiscores';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [topGainers, setTopGainers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('About');

  const aboutText = `"discord.gg/kravy Everybody welcome!"
Do the things you enjoy with the people you enjoy doing them with.

Social | PvM | Clues | Skilling | DnDs | Watchalongs | Other Games

Kravy is a welcoming and incredibly active clan on W124. We have all types of players from the most knowledgeable of PVMers to the best Clue minds in the game. Skillers with 5.8B XP to up-and-coming players from across the board, keen to get stuck in.

* A Discord that is well-designed and filled with resources and support.
* Plenty of VC and CC activity.
* Events! Events! Events!
* A Leadership team that is present and active.
* Support for ALL tiers of PvM with our PVM Mentors team and the 'Reaper Crew' Crew.

Info:
* Requirements: 2.5k total level.
* Rank up: Clan Contributions.
* Home worlds: 124.
* Founded: 24th September 2021.
* Meeting Point: Wars Steps.`;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const gainersRes = await leaderboardAPI.getTopGainers(15);
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

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'About':
        return (
          <div className="dashboard-grid">
            {/* Left Column */}
            <div className="grid-column">
              <HighestRanks />
              <DashboardActivityFeed />
            </div>
            
            {/* Center Column */}
            <div className="grid-column-large">
              <div className="card">
                <h2>About</h2>
                <p className="about-text">{aboutText}</p>
              </div>
              <ClanActivitiesGrid />
            </div>

            {/* Right Column */}
            <div className="grid-column">
              <div className="card today-xp-card">
                <h2>Today XP</h2>
                {topGainers?.daily?.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topGainers.daily.map((member, index) => (
                        <tr key={member.id}>
                          <td>{index + 1}</td>
                          <td>{member.name}</td>
                          <td className="xp-gain">{formatXp(member.xpGain)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No XP gains recorded today.</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'List':
        return <MemberList />;
      case 'Hiscore':
        return <ClanHiscores />;
      case 'XP tracker':
        return <Leaderboard />;
      default:
        return (
          <div className="card">
            <h2>{activeTab}</h2>
            <p>This feature is coming soon!</p>
          </div>
        );
    }
  };

  if (loading && activeTab === 'About') return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="dashboard-body">
        {renderActiveTabContent()}
      </div>
    </div>
  );
}

export default Dashboard;

