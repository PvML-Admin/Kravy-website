import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './BingoTeamManager.css';

const BingoTeamManager = ({ board, onBack }) => {
  const [teams, setTeams] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  

  // Form state
  const [formData, setFormData] = useState({
    team_name: '',
    color: '#3498db',
    member_ids: [],
    guest_members: [] // For non-clan members
  });

  // Guest member form state
  const [guestMemberName, setGuestMemberName] = useState('');
  
  // Search state for clan members
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Available colors for teams
  const teamColors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#c0392b'
  ];


  // Fetch teams for this board
  const fetchTeams = useCallback(async () => {
    try {
      const response = await api.get(`/bingo/boards/${board.id}/teams`);

      if (response.data.success) {
        // Successfully fetched teams
        setTeams(response.data.teams);
      } else {
        setError('Failed to fetch teams');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch teams');
    }
  }, [board.id]);

  // Fetch all clan members
  const fetchMembers = useCallback(async () => {
    try {
      const response = await api.get('/members');

      if (response.data && response.data.success && Array.isArray(response.data.members)) {
        // Successfully fetched members
        setAllMembers(response.data.members);
      } else {
        console.log('Failed to fetch members - unexpected API response:', response.data);
        setError('Failed to fetch members');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to fetch members');
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTeams(), fetchMembers()]);
      setLoading(false);
    };

    loadData();
  }, [fetchTeams, fetchMembers]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle member selection changes
  const handleMemberToggle = (memberId) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  // Handle guest member addition
  const handleAddGuestMember = () => {
    if (guestMemberName.trim() && !formData.guest_members.includes(guestMemberName.trim())) {
      setFormData(prev => ({
        ...prev,
        guest_members: [...prev.guest_members, guestMemberName.trim()]
      }));
      setGuestMemberName('');
    }
  };

  // Handle guest member removal
  const handleRemoveGuestMember = (guestName) => {
    setFormData(prev => ({
      ...prev,
      guest_members: prev.guest_members.filter(name => name !== guestName)
    }));
  };

  // Create new team
  const handleCreateTeam = async (e) => {
    e.preventDefault();

    if (!formData.team_name.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const response = await api.post('/bingo/teams', {
        board_id: board.id,
        team_name: formData.team_name,
        color: formData.color,
        member_ids: formData.member_ids,
        guest_members: formData.guest_members
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        await fetchTeams();
        setShowCreateForm(false);
        setFormData({
          team_name: '',
          color: '#3498db',
          member_ids: [],
          guest_members: []
        });
        setMemberSearchTerm(''); // Clear search when creating team
        setError(null);
      } else {
        setError(response.data.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      
      // Handle specific error types
      if (error.response?.data?.errorType === 'DUPLICATE_TEAM_NAME') {
        setError(error.response.data.error);
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to create team');
      }
    }
  };

  // Start editing a team
  const handleStartEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      team_name: team.team_name,
      color: team.color,
      member_ids: team.members ? team.members.filter(m => m.member_type === 'clan').map(m => m.member_id) : [],
      guest_members: team.members ? team.members.filter(m => m.member_type === 'guest').map(m => ({ name: m.display_name })) : []
    });
    setShowCreateForm(false); // Close create form if open
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTeam(null);
    setFormData({
      team_name: '',
      color: '#3498db',
      member_ids: [],
      guest_members: []
    });
    setMemberSearchTerm(''); // Clear search when canceling
  };

  // Update team
  const handleUpdateTeam = async (e) => {
    e.preventDefault();

    if (!formData.team_name.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      // Update team basic info
      const updateResponse = await api.put(`/bingo/teams/${editingTeam.id}`, {
        team_name: formData.team_name,
        color: formData.color
      });

      if (!updateResponse.data.success) {
        setError(updateResponse.data.error || 'Failed to update team');
        return;
      }

      // Get current team members to compare with new selection
      const currentClanMembers = editingTeam.members ? 
        editingTeam.members.filter(m => m.member_type === 'clan').map(m => m.member_id) : [];

      // Remove members that are no longer selected
      const membersToRemove = currentClanMembers.filter(id => !formData.member_ids.includes(id));
      for (const memberId of membersToRemove) {
        await api.delete(`/bingo/teams/${editingTeam.id}/members/${memberId}`);
      }

      // Add new clan members
      const membersToAdd = formData.member_ids.filter(id => !currentClanMembers.includes(id));
      if (membersToAdd.length > 0) {
        await api.post(`/bingo/teams/${editingTeam.id}/members`, {
          member_ids: membersToAdd
        });
      }

      // Handle guest members - for simplicity, we'll remove all current guests and add new ones
      // This could be optimized to only add/remove changed guests
      const currentGuestMemberObjects = editingTeam.members ? 
        editingTeam.members.filter(m => m.member_type === 'guest') : [];
      
      for (const guestMember of currentGuestMemberObjects) {
        if (guestMember.guest_member_id) {
          try {
            await api.delete(`/bingo/teams/${editingTeam.id}/members/${guestMember.guest_member_id}`);
          } catch (error) {
            console.error('Error removing guest member:', error);
            // Continue with other operations even if one guest removal fails
          }
        }
      }

      // Add new guest members
      if (formData.guest_members.length > 0) {
        try {
          await api.post(`/bingo/teams/${editingTeam.id}/guests`, {
            guest_members: formData.guest_members
          });
        } catch (error) {
          console.error('Error adding guest members:', error);
          // Don't fail the entire update if guest addition fails
          setError('Team updated but there was an issue with guest members');
        }
      }

      await fetchTeams();
      setEditingTeam(null);
      setFormData({
        team_name: '',
        color: '#3498db',
        member_ids: [],
        guest_members: []
      });
      setMemberSearchTerm(''); // Clear search when editing is done
      setError(null);
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/bingo/teams/${teamId}`);

      if (response.data.success) {
        await fetchTeams();
      } else {
        setError(response.data.error || 'Failed to delete team');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team');
    }
  };

  // Remove member from team
  const handleRemoveMember = async (teamId, memberId) => {
    if (!window.confirm('Remove this member from the team?')) {
      return;
    }

    try {
      const response = await api.delete(`/bingo/teams/${teamId}/members/${memberId}`);

      if (response.data.success) {
        await fetchTeams();
      } else {
        setError(response.data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member');
    }
  };


  // Get available members (not in any team for this board)
  const getAvailableMembers = () => {
    const assignedMemberIds = teams.flatMap(team => 
      team.members ? team.members.map(m => m.member_id) : []
    );
    let available = allMembers.filter(member => !assignedMemberIds.includes(member.id));
    
    // Filter by search term if provided
    if (memberSearchTerm.trim()) {
      available = available.filter(member => {
        const memberName = (member.display_name || member.name || member.username || '').toLowerCase();
        return memberName.includes(memberSearchTerm.toLowerCase());
      });
    }
    return available;
  };

  // Get available members for editing (includes current team members)
  const getAvailableMembersForEdit = () => {
    if (!editingTeam) return getAvailableMembers();
    
    // Get assigned member IDs from OTHER teams (not the one being edited)
    const assignedMemberIds = teams.flatMap(team => 
      team.id !== editingTeam.id && team.members ? team.members.map(m => m.member_id) : []
    );
    let available = allMembers.filter(member => !assignedMemberIds.includes(member.id));
    
    // Filter by search term if provided
    if (memberSearchTerm.trim()) {
      available = available.filter(member => {
        const memberName = (member.display_name || member.name || member.username || '').toLowerCase();
        return memberName.includes(memberSearchTerm.toLowerCase());
      });
    }
    return available;
  };

  if (loading) {
    return (
      <div className="team-manager">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-manager">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="teams-header">
        <h2>Team Management</h2>
        <button 
          className="btn-create-team"
          onClick={() => setShowCreateForm(true)}
        >
          + Create New Team
        </button>
      </div>

      {showCreateForm && (
        <div className="create-team-form">
          <h3>Create New Team</h3>
          <form onSubmit={handleCreateTeam}>
            <div className="form-group">
              <label htmlFor="team_name">Team Name*</label>
              <input
                type="text"
                id="team_name"
                name="team_name"
                value={formData.team_name}
                onChange={handleInputChange}
                placeholder="Enter team name..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="color">Team Color</label>
              <div className="color-picker">
                {teamColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Select Clan Members</label>
              <div className="member-search">
                <input
                  type="text"
                  placeholder="Search clan members..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="members-selector">
                {getAvailableMembers().length === 0 ? (
                  <p className="no-members">
                    {memberSearchTerm.trim() 
                      ? 'No clan members found matching your search' 
                      : 'All clan members are assigned to teams'}
                  </p>
                ) : (
                  getAvailableMembers().map(member => (
                    <div key={member.id} className="member-option">
                      <input
                        type="checkbox"
                        id={`member-${member.id}`}
                        checked={formData.member_ids.includes(member.id)}
                        onChange={() => handleMemberToggle(member.id)}
                      />
                      <label htmlFor={`member-${member.id}`}>
                        {member.display_name || member.name || member.username} <span className="clan-badge">CLAN</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Add Guest Members (Non-Clan)</label>
              <div className="guest-member-input">
                <input
                  type="text"
                  value={guestMemberName}
                  onChange={(e) => setGuestMemberName(e.target.value)}
                  placeholder="Enter guest member name..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddGuestMember()}
                />
                <button 
                  type="button" 
                  onClick={handleAddGuestMember}
                  className="btn-add-guest"
                  disabled={!guestMemberName.trim()}
                >
                  Add Guest
                </button>
              </div>
              
              {formData.guest_members.length > 0 && (
                <div className="guest-members-list">
                  <p className="guest-list-title">Added Guest Members:</p>
                  {formData.guest_members.map(guestName => (
                    <div key={guestName} className="guest-member-item">
                      <span>{guestName}</span>
                      <span className="guest-badge">GUEST</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveGuestMember(guestName)}
                        className="btn-remove-guest"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Create Team
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    team_name: '',
                    color: '#3498db',
                    member_ids: [],
                    guest_members: []
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTeam && (
        <div style={{border: '3px solid red', backgroundColor: '#2c3e50', color: 'white', padding: '20px', margin: '20px', borderRadius: '8px'}}>
          <h3 style={{color: 'white', marginBottom: '20px'}}>Edit Team: {editingTeam.team_name}</h3>
          <form onSubmit={handleUpdateTeam}>
            <div className="form-group">
              <label htmlFor="edit_team_name">Team Name*</label>
              <input
                type="text"
                id="edit_team_name"
                name="team_name"
                value={formData.team_name}
                onChange={handleInputChange}
                placeholder="Enter team name..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit_color">Team Color</label>
              <div className="color-picker">
                {teamColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Select Clan Members</label>
              <div className="member-search">
                <input
                  type="text"
                  placeholder="Search clan members..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="members-selector">
                {getAvailableMembersForEdit().length === 0 ? (
                  <p className="no-members">
                    {memberSearchTerm.trim() 
                      ? 'No clan members found matching your search' 
                      : 'All clan members are assigned to teams'}
                  </p>
                ) : (
                  getAvailableMembersForEdit().map(member => (
                    <div key={member.id} className="member-option">
                      <input
                        type="checkbox"
                        id={`edit-member-${member.id}`}
                        checked={formData.member_ids.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              member_ids: [...prev.member_ids, member.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              member_ids: prev.member_ids.filter(id => id !== member.id)
                            }));
                          }
                        }}
                      />
                      <label htmlFor={`edit-member-${member.id}`}>
                        {member.display_name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Guest Members (Non-clan players)</label>
              <div className="guest-member-input">
                <input
                  type="text"
                  placeholder="Enter guest member name..."
                  value={guestMemberName}
                  onChange={(e) => setGuestMemberName(e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn-add-guest"
                  onClick={handleAddGuestMember}
                  disabled={!guestMemberName.trim()}
                >
                  Add Guest
                </button>
              </div>
              
              {formData.guest_members.length > 0 && (
                <div className="guest-members-list">
                  <h4>Added Guest Members:</h4>
                  {formData.guest_members.map((guest, index) => (
                    <div key={index} className="guest-member-item">
                      <span>{guest.name}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveGuestMember(index)}
                        className="remove-guest-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Update Team
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state">
          <h3>No Teams Created</h3>
          <p>Create your first team to start organizing players for this bingo board!</p>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map(team => (
            <div key={team.id} className="team-card" style={{ borderColor: team.color }}>
              <div className="team-header">
                <div className="team-info">
                  <div 
                    className="team-color-indicator"
                    style={{ backgroundColor: team.color }}
                  ></div>
                  <h3>{team.team_name}</h3>
                </div>
                <div className="team-actions">
                  <button 
                    className="btn-edit-team"
                    onClick={() => handleStartEdit(team)}
                    title="Edit team"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-delete-team"
                    onClick={() => handleDeleteTeam(team.id)}
                    title="Delete team"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="team-stats">
                <div className="stat">
                  <span className="stat-label">Members:</span>
                  <span className="stat-value">
                    {team.members ? team.members.length : 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Created:</span>
                  <span className="stat-value">
                    {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="team-members">
                <h4>Team Members</h4>
                {!team.members || team.members.length === 0 ? (
                  <p className="no-members">No members assigned</p>
                ) : (
                  <div className="members-list">
                    {team.members.map((member, index) => (
                      <div key={`${member.member_id || member.guest_member_id}-${index}`} className="member-item">
                        <div className="member-info">
                          <span className="member-name">
                            {member.display_name}
                          </span>
                          <span className={`member-type ${member.member_type === 'clan' ? 'clan' : 'guest'}`}>
                            {member.member_type === 'clan' ? 'CLAN' : 'GUEST'}
                          </span>
                        </div>
                        <div className="member-actions">
                          <button 
                            className="btn-remove-member"
                            onClick={() => handleRemoveMember(team.id, member.member_id || member.guest_member_id)}
                            title="Remove member"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="team-summary">
        <h3>Summary</h3>
        <div className="summary-stats">
          <div className="summary-stat">
            <label>Total Teams:</label>
            <span>{teams.length}</span>
          </div>
          <div className="summary-stat">
            <label>Total Assigned Members:</label>
            <span>
              {teams.reduce((sum, team) => 
                sum + (team.members ? team.members.length : 0), 0
              )}
            </span>
          </div>
          <div className="summary-stat">
            <label>Available Members:</label>
            <span>{getAvailableMembers().length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BingoTeamManager;
