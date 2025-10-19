import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI, membersAPI } from '../services/api';
import DashboardHeader from './DashboardHeader';
import HighestRanks from './HighestRanks';
import DailyClanXpGain from './DailyClanXpGain';
import TwitterFeed from './TwitterFeed';
import ClanActivitiesGrid from './ClanActivitiesGrid';
import PlayerDisplayName from './PlayerDisplayName';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allMembers, setAllMembers] = useState([]);

  const aboutText = `Founded: 24th September 2021.
Social | PvM | Clues | Skilling | DnDs | Watchalongs | Other Games

Kravy is a welcoming and incredibly active clan on W124. Home to all types of players from the most knowledgeable of PvMers to the best Clue minds in the game. Skillers with maximum XP to up-and-coming players from across the board, keen to get stuck in.

• A Discord that is well-designed and filled with support.
• Plenty of Voice Chat and Clan Chat activity.
• Events! Events! Events!
• A Leadership team that is present and active.
• Support for ALL tiers of PvM with our PvM Mentors.
• Affiliated with many Runescape Discords.`;

  const toggleShowFullInfo = () => {
    const newValue = !showFullInfo;
    setShowFullInfo(newValue);
    localStorage.setItem('showFullClanInfo', newValue);
  };

  useEffect(() => {
    loadDashboardData();
    loadAllMembers();
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

  const loadAllMembers = async () => {
    try {
      const response = await membersAPI.getAll(true, null);
      setAllMembers(response.data.members);
    } catch (err) {
      console.error('Failed to load members for search:', err);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 0) {
      // Filter members based on search query
      const filtered = allMembers
        .filter(member => 
          member.name.toLowerCase().includes(query.toLowerCase()) ||
          (member.display_name && member.display_name.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 8); // Limit to 8 results
      setSearchResults(filtered);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSelectPlayer = (memberName) => {
    navigate(`/profile/${encodeURIComponent(memberName)}`);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleSearchBlur = () => {
    // Delay to allow click on result to register
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
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
            {/* Player Search Box */}
            <div className="card player-search-card">
              <h2 style={{ marginBottom: '15px' }}>Find Player</h2>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search player name..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  onBlur={handleSearchBlur}
                  className="player-search-input"
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        className="search-result-item"
                        onClick={() => handleSelectPlayer(member.name)}
                      >
                        <img 
                          src={`http://services.runescape.com/m=avatar-rs/${encodeURIComponent(member.name)}/chat.png`}
                          alt={member.name}
                          className="search-result-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="search-result-info">
                          <div className="search-result-name">
                            <PlayerDisplayName member={member} />
                          </div>
                          <div className="search-result-stats">
                            {formatXp(member.total_xp)} XP • Lvl {member.combat_level > 152 ? 152 : member.combat_level || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showSearchResults && searchQuery && searchResults.length === 0 && (
                  <div className="search-results-dropdown">
                    <div className="search-no-results">
                      No players found
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                          <PlayerDisplayName member={member} />
                        </td>
                        <td className={member.xpGain > 0 ? 'xp-gain' : ''}>
                          {formatXp(member.xpGain)}
                        </td>
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

