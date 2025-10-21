import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ItemSearchModal from './ItemSearchModal';

const BingoBoard = ({ board, onUpdate }) => {
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [boardSettings, setBoardSettings] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  // Fetch board grid data
  const fetchGridData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/bingo/boards/${board.id}`, {
        withCredentials: true
      });

      if (response.data.success) {
        setGridData(response.data.data);
      } else {
        setError('Failed to fetch board data');
      }
    } catch (error) {
      console.error('Error fetching grid data:', error);
      setError('Failed to fetch board data');
    } finally {
      setLoading(false);
    }
  }, [board.id]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  // Initialize board settings when board data loads
  useEffect(() => {
    if (board) {
      // Convert UTC times to local datetime-local format for display
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Get local time components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setBoardSettings({
        title: board.title || '',
        description: board.description || '',
        start_date: formatDateForInput(board.start_date),
        end_date: formatDateForInput(board.end_date)
      });
    }
  }, [board]);

  // Handle square click (open item search)
  const handleSquareClick = (row, column) => {
    setSelectedSquare({ row, column });
    setShowItemSearch(true);
  };

  // Handle item selection from search
  const handleItemSelect = async (item) => {
    if (!selectedSquare) return;

    try {
      const response = await axios.post('/api/bingo/items', {
        board_id: board.id,
        row: selectedSquare.row,
        column: selectedSquare.column,
        item_name: item.name,
        item_id: item.id,
        icon_url: item.icon_url || item.icon, // Handle both icon_url and icon properties
        description: item.examine || ''
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        await fetchGridData(); // Refresh grid
        setShowItemSearch(false);
        setSelectedSquare(null);
        setError(null); // Clear any previous errors
        
        // Notify parent component if callback exists
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError(response.data.error || 'Failed to set item');
      }
    } catch (error) {
      console.error('Error setting item:', error);
      setError('Failed to set item');
    }
  };

  // Clear a square
  const handleClearSquare = async (row, column, e) => {
    e.stopPropagation(); // Prevent square click
    
    if (!window.confirm('Clear this square?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/bingo/items/${board.id}/${row}/${column}`, {
        withCredentials: true
      });

      if (response.data.success) {
        await fetchGridData();
      } else {
        setError(response.data.error || 'Failed to clear square');
      }
    } catch (error) {
      console.error('Error clearing square:', error);
      setError('Failed to clear square');
    }
  };

  // Handle board settings form input changes
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setBoardSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle board settings update
  const handleUpdateBoardSettings = async (e) => {
    e.preventDefault();
    
    try {
      // Convert local datetime-local values to UTC ISO strings
      const convertToUTC = (localDateTimeString) => {
        if (!localDateTimeString) return null;
        // Create date from local time string and convert to UTC
        const localDate = new Date(localDateTimeString);
        return localDate.toISOString();
      };

      const response = await axios.put(`/api/bingo/boards/${board.id}`, {
        title: boardSettings.title,
        description: boardSettings.description,
        start_date: convertToUTC(boardSettings.start_date),
        end_date: convertToUTC(boardSettings.end_date)
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setShowBoardSettings(false);
        if (onUpdate) {
          onUpdate(); // Refresh the parent component
        }
        setError(null);
      } else {
        setError(response.data.error || 'Failed to update board settings');
      }
    } catch (error) {
      console.error('Error updating board settings:', error);
      setError('Failed to update board settings');
    }
  };

  if (loading) {
    return (
      <div className="bingo-board-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading board...</p>
        </div>
      </div>
    );
  }

  if (!gridData || !gridData.board) {
    return (
      <div className="bingo-board-container">
        <div className="error-container">
          <p>Board not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bingo-board-container">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="board-info-panel">
        <div className="panel-header">
          <h3>Board Configuration</h3>
          <button 
            className="btn-settings"
            onClick={() => setShowBoardSettings(true)}
            title="Edit board settings"
          >
            ⚙️ Settings
          </button>
        </div>
        <div className="board-stats">
          <div className="stat">
            <label>Grid Size:</label>
            <span>{gridData.board.rows}×{gridData.board.columns}</span>
          </div>
          <div className="stat">
            <label>Total Squares:</label>
            <span>{gridData.board.rows * gridData.board.columns}</span>
          </div>
          <div className="stat">
            <label>Filled Squares:</label>
            <span>{(gridData.items || []).length} / {gridData.board.rows * gridData.board.columns}</span>
          </div>
          <div className="stat">
            <label>Status:</label>
            <span className={`status ${gridData.board.is_active ? 'active' : 'inactive'}`}>
              {gridData.board.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="stat">
            <label>Start Date:</label>
            <span>{board.start_date ? new Date(board.start_date).toLocaleString() : 'Not set'}</span>
          </div>
          <div className="stat">
            <label>End Date:</label>
            <span>{board.end_date ? new Date(board.end_date).toLocaleString() : 'Not set'}</span>
          </div>
        </div>
      </div>

      <div className="bingo-grid-wrapper">
        <h3>Bingo Grid - Click squares to add items</h3>
        <div 
          className="bingo-grid"
          style={{
            gridTemplateColumns: `repeat(${gridData.board.columns}, 1fr)`,
            gridTemplateRows: `repeat(${gridData.board.rows}, 1fr)`
          }}
        >
          {Array.from({ length: gridData.board.rows }, (_, rowIndex) => (
            Array.from({ length: gridData.board.columns }, (_, colIndex) => {
              const row = rowIndex + 1;
              const column = colIndex + 1;
              const item = (gridData.items || []).find(item => 
                item.row_number === row && item.column_number === column
              );

              return (
                <div
                  key={`${row}-${column}`}
                  className={`bingo-square ${item ? 'filled' : 'empty'}`}
                  onClick={() => handleSquareClick(row, column)}
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
                      {item.description && (
                        <div className="item-description">{item.description}</div>
                      )}
                      <button 
                        className="clear-square-btn"
                        onClick={(e) => handleClearSquare(row, column, e)}
                        title="Clear this square"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="empty-content">
                      <span className="add-icon">+</span>
                      <span className="add-text">Add Item</span>
                    </div>
                  )}
                </div>
              );
            })
          )).flat()}
        </div>
      </div>

      <div className="grid-actions">
        <div className="completion-stats">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${((gridData.items || []).length / (gridData.board.rows * gridData.board.columns)) * 100}%`
              }}
            ></div>
          </div>
          <span className="progress-text">
            {(gridData.items || []).length} / {gridData.board.rows * gridData.board.columns} squares filled
          </span>
        </div>
      </div>

      {showItemSearch && selectedSquare && (
        <ItemSearchModal
          isOpen={showItemSearch}
          onClose={() => {
            setShowItemSearch(false);
            setSelectedSquare(null);
          }}
          onSelect={handleItemSelect}
          squarePosition={`${selectedSquare.row},${selectedSquare.column}`}
        />
      )}

      {showBoardSettings && (
        <div className="modal-overlay" onClick={() => setShowBoardSettings(false)}>
          <div className="modal-content board-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Board Settings</h2>
              <button className="close-button" onClick={() => setShowBoardSettings(false)}>×</button>
            </div>

            <form onSubmit={handleUpdateBoardSettings}>
              <div className="form-group">
                <label htmlFor="title">Board Title:</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={boardSettings.title}
                  onChange={handleSettingsChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  name="description"
                  value={boardSettings.description}
                  onChange={handleSettingsChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="start_date">Start Date & Time:</label>
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={boardSettings.start_date}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_date">End Date & Time:</label>
                <input
                  type="datetime-local"
                  id="end_date"
                  name="end_date"
                  value={boardSettings.end_date}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Update Settings
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowBoardSettings(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoBoard;
