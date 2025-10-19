import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../services/api';
import { getSkillIcon, skillOrder } from '../utils/skills';
import PlayerDisplayName from './PlayerDisplayName';
import './Leaderboard.css';

function Leaderboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('daily');
  const [selectedSkill, setSelectedSkill] = useState('Overall');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 25;

  useEffect(() => {
    loadLeaderboard();
    setCurrentPage(1); // Reset to page 1 when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, selectedSkill]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await leaderboardAPI.getByPeriod(period, 500, selectedSkill); // Fetch more users
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

  if (loading) return <div className="loading">Loading leaderboard...</div>;

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-title">
        <h2>XP Tracker</h2>
      </div>
      
      <div className="card">
        {/* Skill Filter Icons */}
        <div className="leaderboard-filters">
          {skillOrder.map(skill => (
            <div 
              key={skill}
              className={`skill-icon-wrapper ${selectedSkill === skill ? 'active' : ''}`}
              onClick={() => setSelectedSkill(skill)}
            >
              <img 
                src={getSkillIcon(skill)} 
                alt={skill}
                title={skill}
                className="skill-icon"
              />
            </div>
          ))}
        </div>

        <div className="leaderboard-divider"></div>

        {/* Period Filter Pills */}
        <div className="period-filters">
          <button
            className={`period-btn ${period === 'daily' ? 'active' : ''}`}
            onClick={() => setPeriod('daily')}
          >
            Daily
          </button>
          <button
            className={`period-btn ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
          >
            Weekly
          </button>
          <button
            className={`period-btn ${period === 'monthly' ? 'active' : ''}`}
            onClick={() => setPeriod('monthly')}
          >
            Monthly
          </button>
        </div>

        {error && <div className="error">Error: {error}</div>}

        {!error && (
          <>
            {leaderboard.length > 0 ? (
              <>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Total XP</th>
                      <th>XP Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard
                      .slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage)
                      .map((member, index) => (
                        <tr 
                          key={member.id}
                          onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}
                        >
                          <td>{(currentPage - 1) * membersPerPage + index + 1}</td>
                          <td className="member-name-cell">
                            <img 
                              src={`http://services.runescape.com/m=avatar-rs/${encodeURIComponent(member.name)}/chat.png`}
                              alt={member.name}
                              className="member-avatar"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <PlayerDisplayName member={member} />
                          </td>
                          <td>{formatXp(member.totalXp)}</td>
                          <td className="xp-gain">+{formatXp(member.xpGain)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {leaderboard.length > membersPerPage && (
                  <div className="pagination-controls">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    
                    <div className="pagination-pages">
                      {Array.from({ length: Math.ceil(leaderboard.length / membersPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(leaderboard.length / membersPerPage);
                          return page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && <span className="pagination-ellipsis">...</span>}
                              <button
                                className={`btn ${page === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>
                    
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(leaderboard.length / membersPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(leaderboard.length / membersPerPage)}
                    >
                      Next
                    </button>
                    
                    <div className="pagination-info">
                      Page {currentPage} of {Math.ceil(leaderboard.length / membersPerPage)} 
                      ({leaderboard.length} total users)
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-data">
                No data available for this period. Make sure members are synced.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
