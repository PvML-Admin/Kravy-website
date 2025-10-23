import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BingoActivity from './BingoActivity';
import './BingoPage.css';

const BingoPage = () => {
  console.log('🎯 BingoPage component is mounting/rendering');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [completions, setCompletions] = useState({});
  
  console.log('🎯 BingoPage state initialized, user:', user?.name || 'Not logged in');

  // Fetch active boards
  const fetchActiveBoards = useCallback(async () => {
    try {
      console.log('🎯 Fetching active boards...');
      setLoading(true);
      const response = await api.get('/bingo/boards');

      console.log('🎯 Boards response:', response.data);

      if (response.data.success) {
        // Backend now returns only active boards
        const activeBoards = response.data.boards;
        console.log('🎯 Active boards found:', activeBoards.length);
        setActiveBoards(activeBoards);
        
        // Auto-select first active board
        if (activeBoards.length > 0) {
          console.log('🎯 Auto-selecting first board:', activeBoards[0]);
          setSelectedBoard(activeBoards[0]);
        } else {
          // No active boards - stop loading
          console.log('🎯 No active boards, stopping loading');
          setLoading(false);
        }
      } else {
        console.error('🎯 Boards API returned success: false', response.data);
        setError('Failed to load bingo boards');
        setLoading(false);
      }
    } catch (error) {
      console.error('🎯 Error fetching boards:', error);
      setError('Failed to load bingo boards');
      setLoading(false);
    }
  }, []); // Remove selectedBoard dependency to prevent loops

  // Fetch board data with grid
  const fetchBoardData = useCallback(async (board) => {
    if (!board) {
      console.log('🎯 No board provided to fetchBoardData');
      return;
    }

    try {
      console.log('🎯 Fetching board data for board:', board.id);
      setLoading(true);
      const [boardResponse, teamsResponse, completionsResponse] = await Promise.all([
        api.get(`/bingo/boards/${board.id}`),
        api.get(`/bingo/boards/${board.id}/teams`),
        api.get(`/bingo/boards/${board.id}/completions`)
      ]);

      console.log('🎯 Board responses:', {
        board: boardResponse.data.success,
        teams: teamsResponse.data.success,
        completions: completionsResponse.data.success
      });

      if (boardResponse.data.success && teamsResponse.data.success) {
        console.log('🎯 Setting board data and teams');
        setBoardData(boardResponse.data.data);
        setTeams(teamsResponse.data.teams);
        
        // Process completions data
        if (completionsResponse.data.success) {
          const completionsMap = {};
          completionsResponse.data.completions.forEach(completion => {
            const key = `${board.id}-${completion.row_number}-${completion.column_number}-${completion.team_id}`;
            completionsMap[key] = completion;
          });
          setCompletions(completionsMap);
          console.log('🎯 Processed completions:', Object.keys(completionsMap).length);
        }
        
        // Find user's team
        if (user) {
          const userTeam = teamsResponse.data.teams.find(team => 
            team.members && team.members.some(member => 
              (member.member_name && member.member_name.toLowerCase() === user.name.toLowerCase()) ||
              (member.display_name && member.display_name.toLowerCase() === user.name.toLowerCase())
            )
          );
          setSelectedTeam(userTeam || null);
          console.log('🎯 User team found:', userTeam?.team_name || 'None');
        }
        console.log('🎯 Board data loading completed successfully');
      } else {
        console.error('🎯 Board data API calls failed:', {
          boardSuccess: boardResponse.data.success,
          teamsSuccess: teamsResponse.data.success,
          boardError: boardResponse.data.error,
          teamsError: teamsResponse.data.error
        });
        setError('Failed to load board data');
      }
    } catch (error) {
      console.error('🎯 Error fetching board data:', error);
      setError('Failed to load board data');
    } finally {
      console.log('🎯 Setting loading to false');
      setLoading(false);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    console.log('🎯 BingoPage useEffect triggered - calling fetchActiveBoards');
    fetchActiveBoards();
  }, [fetchActiveBoards]);


  // Load board data when board changes
  useEffect(() => {
    if (selectedBoard) {
      fetchBoardData(selectedBoard);
    }
  }, [selectedBoard, fetchBoardData]);


  // Handle board selection
  const handleBoardSelect = (board) => {
    setSelectedBoard(board);
    setBoardData(null);
    setTeams([]);
    setSelectedTeam(null);
    setCompletions({});
  };

  // Handle team selection for viewing
  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  // Get team progress with milestone timestamps for ranking tie-breakers
  const getTeamProgress = (team) => {
    if (!boardData || !team || !selectedBoard) return { 
      completed: 0, 
      total: 0, 
      percentage: 0, 
      milestones: [] 
    };
    
    const total = boardData.board.rows * boardData.board.columns;
    const teamCompletions = Object.keys(completions)
      .filter(key => key.endsWith(`-${team.id}`))
      .map(key => completions[key])
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
    
    const completed = teamCompletions.length;
    
    // Create milestone timestamps for tie-breaking (when team reached 1st, 2nd, 3rd completion, etc.)
    const milestones = teamCompletions.map((completion, index) => ({
      count: index + 1,
      timestamp: new Date(completion.completed_at).getTime()
    }));
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      milestones
    };
  };

  // Check if square is completed by selected team
  const isSquareCompleted = (row, column) => {
    if (!selectedTeam || !selectedBoard) return false;
    const squareKey = `${selectedBoard.id}-${row}-${column}-${selectedTeam.id}`;
    return !!completions[squareKey];
  };


  if (loading) {
    return (
      <div className="bingo-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading bingo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bingo-page">
      <div className="bingo-header">
        <div className="bingo-header-content">
          <img 
            src="/clan_banner.png" 
            alt="Clan Banner" 
            className="clan-banner"
          />
          <div className="bingo-header-text">
            <h1>Bingoooo</h1>
            <p className="bingo-description">

            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {activeBoards.length === 0 ? (
        <div className="no-boards">
          <h2>No Active Bingo Boards</h2>
          <p>There are currently no bingo competitions running. Check back later!</p>
        </div>
      ) : (
        <>
          {/* Board Selector */}
          {activeBoards.length > 1 && (
            <div className="board-selector">
              <h3>Select Bingo Board</h3>
              <div className="board-options">
                {activeBoards.map(board => (
                  <button
                    key={board.id}
                    className={`board-option ${selectedBoard?.id === board.id ? 'active' : ''}`}
                    onClick={() => handleBoardSelect(board)}
                  >
                    <div className="board-option-title">{board.title}</div>
                    <div className="board-option-meta">
                      {board.rows}×{board.columns} • {teams.length} teams
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compact Board Header */}
          {selectedBoard && boardData && (
            <div className="current-board">
              <div className="compact-board-header">
                <div className="board-info">
                  <h2 className="board-title">{selectedBoard.title}</h2>
                  <div className="board-meta-inline">
                    <span className="meta-item">
                      {boardData.board.rows}×{boardData.board.columns}
                    </span>
                    <span className="meta-separator">•</span>
                    <span className="meta-item">
                      {teams.length} teams
                    </span>
                    {selectedBoard.description && (
                      <>
                        <span className="meta-separator">•</span>
                        <span className="meta-description">{selectedBoard.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Compact Team Filter Bar */}
              {teams.length > 0 && (
                <div className="team-filter-bar">
                  <div className="filter-header">
                    <div className="filter-title">
                      <span>Team Filter</span>
                      {user && selectedTeam && (
                        <span className="current-team-badge">
                          <span 
                            className="team-dot" 
                            style={{ backgroundColor: selectedTeam.color }}
                          ></span>
                          {selectedTeam.team_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="filter-options">
                    <button
                      className={`filter-chip ${!selectedTeam ? 'active' : ''}`}
                      onClick={() => handleTeamSelect(null)}
                    >
                      <span className="chip-label">All Teams</span>
                    </button>
                    {teams.map(team => {
                      const progress = getTeamProgress(team);
                      const isUserTeam = user && team.members && team.members.some(member => 
                        (member.member_name && member.member_name.toLowerCase() === user.name.toLowerCase()) ||
                        (member.display_name && member.display_name.toLowerCase() === user.name.toLowerCase())
                      );
                      
                      return (
                        <button
                          key={team.id}
                          className={`filter-chip ${selectedTeam?.id === team.id ? 'active' : ''} ${isUserTeam ? 'user-team' : ''}`}
                          onClick={() => handleTeamSelect(team)}
                        >
                          <span 
                            className="chip-color" 
                            style={{ backgroundColor: team.color }}
                          ></span>
                          <span className="chip-label">
                            {team.team_name}
                            {isUserTeam && <span className="you-indicator"> (You)</span>}
                          </span>
                          <span className="chip-progress">
                            {progress.completed}/{progress.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Team Members Section */}
                  {selectedTeam && selectedTeam.members && selectedTeam.members.length > 0 && (
                    <div className="team-members-section">
                      <h4>Team Members ({selectedTeam.members.length})</h4>
                      <div className="team-members-grid">
                        {/* Show real RuneScape avatars for both clan members and guests since we store their usernames for RuneMetrics tracking */}
                        {selectedTeam.members.map((member, index) => {
                          const memberName = member.member_name || member.display_name || member.name || 'Guest';
                          const isGuest = member.member_type === 'guest';
                          
                          return (
                            <div 
                              key={index} 
                              className={`team-member-card ${!isGuest ? 'clickable' : ''}`}
                              onClick={!isGuest ? () => navigate(`/profile/${encodeURIComponent(memberName)}`) : undefined}
                            >
                              <img 
                                src={`http://services.runescape.com/m=avatar-rs/${encodeURIComponent(memberName)}/chat.png`}
                                alt={`${memberName}'s avatar`}
                                className="team-member-avatar"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to placeholder if RuneScape avatar fails to load (works for both clan members and guests)
                                  e.target.outerHTML = `<div class="team-member-avatar guest-avatar">👤</div>`;
                                }}
                              />
                              <div className="team-member-info">
                                <div className="team-member-name">
                                  <span>{memberName}</span>
                                  {isGuest && <span className="guest-badge">GUEST</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main Content Area */}
              <div className={`bingo-main-content grid-${boardData.board.columns}x${boardData.board.rows}`}>
                {/* Bingo Grid */}
                <div className="bingo-grid-container">
                  <h3>Bingo Grid</h3>
                  <div 
                    className="bingo-grid"
                    style={{
                      gridTemplateColumns: `repeat(${boardData.board.columns}, 1fr)`,
                      gridTemplateRows: `repeat(${boardData.board.rows}, 1fr)`
                    }}
                  >
                    {Array.from({ length: boardData.board.rows }, (_, rowIndex) => (
                      Array.from({ length: boardData.board.columns }, (_, colIndex) => {
                        const row = rowIndex + 1;
                        const column = colIndex + 1;
                        const item = boardData.items.find(item => 
                          item.row_number === row && item.column_number === column
                        );
                        
                        const isCompleted = isSquareCompleted(row, column);
                        
                        return (
                          <div
                            key={`${row}-${column}`}
                            className={`bingo-square ${item ? 'has-item' : 'empty'} ${isCompleted ? 'completed' : ''}`}
                          >
                            <div className="square-position">
                              {row},{column}
                            </div>
                            
                            {item ? (
                              <div className="square-content">
                                {item.icon_url && (
                                  <img 
                                    src={item.icon_url} 
                                    alt={item.item_name}
                                    className="item-icon"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="item-name">{item.item_name}</div>
                              </div>
                            ) : (
                              <div className="empty-content">
                                <span className="empty-text">Empty</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )).flat()}
                  </div>
                </div>

                {/* Bingo Activity */}
                <BingoActivity 
                  boardId={selectedBoard?.id}
                  selectedTeam={selectedTeam}
                  user={user}
                />
              </div>

              {/* Team Rankings */}
              {teams.length > 0 && (
                <div className="team-standings">
                  <h3>Team Rankings</h3>
                  <div className="standings-table">
                    <div className="standings-header">
                      <div>Rank</div>
                      <div>Team</div>
                      <div>Progress</div>
                      <div>Members</div>
                    </div>
                    {teams
                      .map(team => ({ ...team, progress: getTeamProgress(team) }))
                      .sort((a, b) => {
                        // Primary sort: by number of completions (descending)
                        const completionDiff = b.progress.completed - a.progress.completed;
                        if (completionDiff !== 0) return completionDiff;
                        
                        // Tie-breaker: compare milestone timestamps
                        // Team that achieved their highest completion count first wins
                        if (a.progress.completed === 0) return 0; // Both teams have 0 completions
                        
                        const aLastMilestone = a.progress.milestones[a.progress.completed - 1];
                        const bLastMilestone = b.progress.milestones[b.progress.completed - 1];
                        
                        if (!aLastMilestone && !bLastMilestone) return 0;
                        if (!aLastMilestone) return 1; // b wins
                        if (!bLastMilestone) return -1; // a wins
                        
                        // Earlier timestamp wins (ascending order)
                        return aLastMilestone.timestamp - bLastMilestone.timestamp;
                      })
                      .map((team, index) => (
                        <div key={team.id} className="standings-row">
                          <div className="rank">#{index + 1}</div>
                          <div className="team-info">
                            <div 
                              className="team-color-dot"
                              style={{ backgroundColor: team.color }}
                            ></div>
                            <span>{team.team_name}</span>
                          </div>
                          <div className="progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ 
                                  width: `${team.progress.percentage}%`,
                                  backgroundColor: team.color 
                                }}
                              ></div>
                            </div>
                            <span>{team.progress.completed}/{team.progress.total}</span>
                          </div>
                          <div className="members-count">
                            {team.members ? team.members.length : 0}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BingoPage;
