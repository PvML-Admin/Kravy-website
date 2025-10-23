import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './ManualCompletionForm.css';

const ManualCompletionForm = ({ board, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [memberName, setMemberName] = useState('');
  const [completionReason, setCompletionReason] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Load teams and items for the board
  useEffect(() => {
    const loadBoardData = async () => {
      try {
        setLoading(true);
        const [teamsResponse, itemsResponse] = await Promise.all([
          api.get(`/bingo/admin/boards/${board.id}/teams`),
          api.get(`/bingo/admin/boards/${board.id}/items`)
        ]);

        if (teamsResponse.data.success) {
          setTeams(teamsResponse.data.teams);
        }

        if (itemsResponse.data.success) {
          setItems(itemsResponse.data.items);
        }
      } catch (error) {
        console.error('Error loading board data:', error);
        onError('Failed to load teams and items');
      } finally {
        setLoading(false);
      }
    };

    if (board?.id) {
      loadBoardData();
    }
  }, [board, onError]);

  // Load team members when team is selected
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedTeam) {
        setTeamMembers([]);
        return;
      }

      try {
        const response = await api.get(`/bingo/admin/teams/${selectedTeam}/members`);
        if (response.data.success) {
          setTeamMembers(response.data.members);
        }
      } catch (error) {
        console.error('Error loading team members:', error);
        setTeamMembers([]);
      }
    };

    loadTeamMembers();
  }, [selectedTeam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTeam || !selectedItem || !memberName.trim()) {
      onError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.post('/bingo/manual-complete', {
        itemId: parseInt(selectedItem),
        teamId: parseInt(selectedTeam),
        memberName: memberName.trim(),
        completionReason: completionReason.trim() || 'Manual completion by admin'
      });

      if (response.data.success) {
        // Reset form
        setSelectedTeam('');
        setSelectedItem('');
        setMemberName('');
        setCompletionReason('');
        setTeamMembers([]);
        
        onSuccess();
        alert(`✅ ${response.data.message}`);
      } else {
        onError(response.data.error);
      }
    } catch (error) {
      console.error('Error marking completion:', error);
      const errorMsg = error.response?.data?.error || 'Failed to mark completion';
      onError(errorMsg);
      
      if (error.response?.status === 409) {
        alert('⚠️ This square is already completed by this team!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSelect = (memberDisplayName) => {
    setMemberName(memberDisplayName);
  };

  if (loading && teams.length === 0) {
    return (
      <div className="manual-completion-loading">
        <div className="loading-spinner"></div>
        <p>Loading teams and items...</p>
      </div>
    );
  }

  return (
    <div className="manual-completion-form">
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Team Selection */}
          <div className="form-group">
            <label htmlFor="team">Team *</label>
            <select
              id="team"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              required
            >
              <option value="">Select a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </div>

          {/* Item Selection */}
          <div className="form-group">
            <label htmlFor="item">Bingo Square *</label>
            <select
              id="item"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              required
            >
              <option value="">Select a square...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.row_number},{item.column_number}] {item.item_name}
                </option>
              ))}
            </select>
          </div>

          {/* Member Name */}
          <div className="form-group">
            <label htmlFor="memberName">Member Name *</label>
            <input
              type="text"
              id="memberName"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Enter exact display name..."
              required
            />
            
            {/* Quick Select Members */}
            {teamMembers.length > 0 && (
              <div className="member-quick-select">
                <p>Quick select from team:</p>
                <div className="member-buttons">
                  {teamMembers.map((member, index) => {
                    const displayName = member.display_name || member.member_name || member.guest_name || 'Unknown';
                    return (
                      <button
                        key={index}
                        type="button"
                        className="member-btn"
                        onClick={() => handleMemberSelect(displayName)}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Completion Reason */}
          <div className="form-group full-width">
            <label htmlFor="reason">Reason</label>
            <textarea
              id="reason"
              value={completionReason}
              onChange={(e) => setCompletionReason(e.target.value)}
              placeholder="e.g., 'TzKal-Zuk Obsidian blade drop - not tracked by RuneMetrics'"
              rows="3"
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading || !selectedTeam || !selectedItem || !memberName.trim()}
          >
            {loading ? 'Marking Complete...' : '✓ Mark Square Complete'}
          </button>
        </div>
      </form>

      {/* Preview */}
      {selectedTeam && selectedItem && memberName && (
        <div className="completion-preview">
          <h4>Preview:</h4>
          <p>
            <strong>Team:</strong> {teams.find(t => t.id === parseInt(selectedTeam))?.team_name}<br />
            <strong>Square:</strong> {items.find(i => i.id === parseInt(selectedItem))?.item_name}<br />
            <strong>Member:</strong> {memberName}<br />
            <strong>Reason:</strong> {completionReason || 'Manual completion by admin'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ManualCompletionForm;
