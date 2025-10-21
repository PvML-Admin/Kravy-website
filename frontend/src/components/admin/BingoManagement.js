import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './BingoManagement.css';
import BingoBoard from './BingoBoard';
import BingoTeamManager from './BingoTeamManager';

const BingoManagement = () => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('boards'); // 'boards', 'editor', 'teams'

  // Form state for creating/editing boards
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rows: 5,
    columns: 5,
    start_date: '',
    end_date: ''
  });

  // Fetch all bingo boards
  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/bingo/boards', {
        withCredentials: true
      });

      if (response.data.success) {
        setBoards(response.data.boards);
      } else {
        setError('Failed to fetch bingo boards');
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
      setError('Failed to fetch bingo boards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };

  // Create new bingo board
  const handleCreateBoard = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Board title is required');
      return;
    }

    if (formData.rows < 3 || formData.rows > 7 || formData.columns < 3 || formData.columns > 7) {
      setError('Grid size must be between 3x3 and 7x7');
      return;
    }

    // Validate dates
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        setError('End date must be after start date');
        return;
      }
    }

    try {
      // Convert local datetime-local values to UTC ISO strings
      const convertToUTC = (localDateTimeString) => {
        if (!localDateTimeString) return null;
        const localDate = new Date(localDateTimeString);
        return localDate.toISOString();
      };

      const payload = {
        ...formData,
        start_date: convertToUTC(formData.start_date),
        end_date: convertToUTC(formData.end_date)
      };

      const response = await axios.post('/api/bingo/boards', payload, {
        withCredentials: true
      });

      if (response.data.success) {
        await fetchBoards(); // Refresh the boards list
        setShowCreateForm(false);
        setFormData({ title: '', description: '', rows: 5, columns: 5, start_date: '', end_date: '' });
        setError(null);
      } else {
        setError(response.data.error || 'Failed to create board');
      }
    } catch (error) {
      console.error('Error creating board:', error);
      setError('Failed to create board');
    }
  };

  // Delete bingo board
  const handleDeleteBoard = async (boardId) => {
    if (!window.confirm('Are you sure you want to delete this bingo board? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/bingo/boards/${boardId}`, {
        withCredentials: true
      });

      if (response.data.success) {
        await fetchBoards();
        if (selectedBoard && selectedBoard.id === boardId) {
          setSelectedBoard(null);
          setActiveTab('boards');
        }
      } else {
        setError(response.data.error || 'Failed to delete board');
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      setError('Failed to delete board');
    }
  };

  // Toggle board active status
  const handleToggleActive = async (boardId, currentStatus) => {
    try {
      const response = await axios.put(`/api/bingo/boards/${boardId}`, {
        is_active: !currentStatus
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        await fetchBoards();
      } else {
        setError(response.data.error || 'Failed to update board status');
      }
    } catch (error) {
      console.error('Error updating board status:', error);
      setError('Failed to update board status');
    }
  };

  // Select board for editing
  const selectBoard = (board) => {
    setSelectedBoard(board);
    setActiveTab('editor');
  };

  // Select board for team management
  const manageTeams = (board) => {
    setSelectedBoard(board);
    setActiveTab('teams');
  };

  if (loading) {
    return (
      <div className="bingo-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading bingo boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bingo-management">
      <div className="bingo-header">
        <h1>Bingo Management</h1>
        <div className="bingo-tabs">
          <button 
            className={`tab-button ${activeTab === 'boards' ? 'active' : ''}`}
            onClick={() => setActiveTab('boards')}
          >
            Boards ({boards.length})
          </button>
          {selectedBoard && (
            <>
              <button 
                className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                Edit Board
              </button>
              <button 
                className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
                onClick={() => setActiveTab('teams')}
              >
                Teams
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Boards List Tab */}
      {activeTab === 'boards' && (
        <div className="boards-tab">
          <div className="boards-header">
            <button 
              className="btn-create-board"
              onClick={() => setShowCreateForm(true)}
            >
              + Create New Board
            </button>
          </div>

          {showCreateForm && (
            <div className="create-board-form">
              <h3>Create New Bingo Board</h3>
              <form onSubmit={handleCreateBoard}>
                <div className="form-group">
                  <label htmlFor="title">Board Title*</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter board title..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Optional description..."
                    rows="3"
                  />
                </div>

                <div className="grid-size-controls">
                  <div className="form-group">
                    <label htmlFor="rows">Rows</label>
                    <select
                      id="rows"
                      name="rows"
                      value={formData.rows}
                      onChange={handleInputChange}
                    >
                      {[3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="columns">Columns</label>
                    <select
                      id="columns"
                      name="columns"
                      value={formData.columns}
                      onChange={handleInputChange}
                    >
                      {[3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="datetime-controls">
                  <div className="form-group">
                    <label htmlFor="start_date">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="datetime-input"
                    />
                    <small className="form-hint">Leave empty for immediate start</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="end_date">End Date & Time</label>
                    <input
                      type="datetime-local"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="datetime-input"
                    />
                    <small className="form-hint">Leave empty for no end date</small>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    Create Board
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ title: '', description: '', rows: 5, columns: 5, start_date: '', end_date: '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {boards.length === 0 ? (
            <div className="empty-state">
              <h3>No Bingo Boards</h3>
              <p>Create your first bingo board to get started!</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map(board => (
                <div key={board.id} className={`board-card ${board.is_active ? 'active' : 'inactive'}`}>
                  <div className="board-card-header">
                    <h3>{board.title}</h3>
                    <div className="board-status">
                      {board.is_active ? (
                        <span className="status-badge active">Active</span>
                      ) : (
                        <span className="status-badge inactive">Inactive</span>
                      )}
                    </div>
                  </div>

                  {board.description && (
                    <p className="board-description">{board.description}</p>
                  )}

                  <div className="board-info">
                    <div className="board-stat">
                      <span className="stat-label">Grid Size:</span>
                      <span className="stat-value">{board.rows}×{board.columns}</span>
                    </div>
                  <div className="board-stat">
                    <span className="stat-label">Created:</span>
                    <span className="stat-value">
                      {new Date(board.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="board-stat">
                    <span className="stat-label">Start Date:</span>
                    <span className="stat-value">
                      {board.start_date ? (
                        new Date(board.start_date).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : 'Not Set'}
                    </span>
                  </div>
                  <div className="board-stat">
                    <span className="stat-label">End Date:</span>
                    <span className="stat-value">
                      {board.end_date ? (
                        new Date(board.end_date).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric', 
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : 'Not Set'}
                    </span>
                  </div>
                  </div>

                  <div className="board-actions">
                    <button 
                      className="btn-edit"
                      onClick={() => selectBoard(board)}
                    >
                      Edit Board
                    </button>
                    <button 
                      className="btn-teams"
                      onClick={() => manageTeams(board)}
                    >
                      Teams
                    </button>
                    <button 
                      className={`btn-toggle ${board.is_active ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleActive(board.id, board.is_active)}
                    >
                      {board.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeleteBoard(board.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Board Editor Tab */}
      {activeTab === 'editor' && selectedBoard && (
        <div className="editor-tab">
          <div className="editor-header">
            <h2>Editing: {selectedBoard.title}</h2>
            <button 
              className="btn-back"
              onClick={() => setActiveTab('boards')}
            >
              ← Back to Boards
            </button>
          </div>
          
          <BingoBoard 
            board={selectedBoard} 
            onUpdate={fetchBoards}
          />
        </div>
      )}

      {/* Teams Management Tab */}
      {activeTab === 'teams' && selectedBoard && (
        <div className="teams-tab">
          <div className="teams-header">
            <h2>Teams for: {selectedBoard.title}</h2>
            <button 
              className="btn-back"
              onClick={() => setActiveTab('boards')}
            >
              ← Back to Boards
            </button>
          </div>
          
          <BingoTeamManager 
            board={selectedBoard}
          />
        </div>
      )}
    </div>
  );
};

export default BingoManagement;
