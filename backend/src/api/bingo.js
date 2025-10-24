const express = require('express');
const router = express.Router();
const { BingoModel } = require('../database/models');
const { isAdmin } = require('../middleware/auth');
const guestMemberSyncService = require('../services/guestMemberSyncService');
const rsWikiService = require('../services/rsWikiService');

// Manually trigger sync for a single guest member (Admin only)
router.post('/guests/:id/sync', isAdmin, async (req, res) => {
  try {
    const guestId = parseInt(req.params.id);
    const { displayName } = req.body;

    if (!guestId || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Guest ID and display name are required'
      });
    }

    console.log(`[API] Admin manually triggered sync for guest: ${displayName} (ID: ${guestId})`);
    
    // Non-blocking
    guestMemberSyncService.syncGuestMember(guestId, displayName);
    
    res.json({
      success: true,
      message: `Sync started for guest: ${displayName}`
    });

  } catch (error) {
    console.error('Error triggering guest sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger guest sync'
    });
  }
});

// ========== BINGO BOARDS ==========

// Get active bingo boards (Public access)
router.get('/boards', async (req, res) => {
  try {
    console.log('🎯 [API] Fetching active bingo boards for user:', req.user?.email || 'Anonymous');
    const allBoards = await BingoModel.getAllBoards();
    console.log('🎯 [API] Total boards in database:', allBoards.length);
    
    // Filter to only active boards and check date ranges
    const now = new Date();
    const activeBoards = allBoards.filter(board => {
      if (!board.is_active) return false;
      
      // Check start date
      if (board.start_date) {
        const startDate = new Date(board.start_date);
        if (now < startDate) return false;
      }
      
      // Check end date
      if (board.end_date) {
        const endDate = new Date(board.end_date);
        if (now > endDate) return false;
      }
      
      return true;
    });

    console.log('🎯 [API] Active boards found:', activeBoards.length);
    console.log('🎯 [API] Active boards:', activeBoards.map(b => ({ id: b.id, title: b.title, is_active: b.is_active })));

    res.json({
      success: true,
      boards: activeBoards
    });
  } catch (error) {
    console.error('🎯 [API] Error fetching active bingo boards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active bingo boards'
    });
  }
});

// Get all bingo boards (Admin only)
router.get('/admin/boards', isAdmin, async (req, res) => {
  try {
    const boards = await BingoModel.getAllBoards();
    res.json({
      success: true,
      boards
    });
  } catch (error) {
    console.error('Error fetching bingo boards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bingo boards'
    });
  }
});

// Get single bingo board with full grid
router.get('/boards/:id', async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    const gridData = await BingoModel.getBingoGrid(boardId);
    if (!gridData) {
      return res.status(404).json({
        success: false,
        error: 'Bingo board not found'
      });
    }

    // Debug: log the grid data structure
    console.log(`Board ${boardId}: Board exists: ${!!gridData.board}, Grid rows: ${gridData.grid ? gridData.grid.length : 0}`);

    res.json({
      success: true,
      data: gridData
    });
  } catch (error) {
    console.error('Error fetching bingo board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bingo board'
    });
  }
});

// Create new bingo board (Admin only)
router.post('/boards', isAdmin, async (req, res) => {
  try {
    const { title, description, rows = 5, columns = 5, start_date, end_date } = req.body;
    
    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Board title is required'
      });
    }

    if (rows < 3 || rows > 7 || columns < 3 || columns > 7) {
      return res.status(400).json({
        success: false,
        error: 'Grid size must be between 3x3 and 7x7'
      });
    }

    // Validate dates if provided
    if (start_date && end_date) {
      const startTime = new Date(start_date);
      const endTime = new Date(end_date);
      
      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
    }

    const boardId = await BingoModel.createBoard(
      title.trim(), 
      description?.trim() || '', 
      rows, 
      columns,
      start_date || null,
      end_date || null
    );

    res.json({
      success: true,
      message: 'Bingo board created successfully',
      boardId
    });
  } catch (error) {
    console.error('Error creating bingo board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bingo board'
    });
  }
});

// Update bingo board (Admin only)
router.put('/boards/:id', isAdmin, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    const { title, description, rows, columns, is_active, start_date, end_date } = req.body;

    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    // Validation for grid size if provided
    if (rows && (rows < 3 || rows > 7)) {
      return res.status(400).json({
        success: false,
        error: 'Rows must be between 3 and 7'
      });
    }

    if (columns && (columns < 3 || columns > 7)) {
      return res.status(400).json({
        success: false,
        error: 'Columns must be between 3 and 7'
      });
    }

    const success = await BingoModel.updateBoard(boardId, {
      title: title?.trim(),
      description: description?.trim(),
      rows,
      columns,
      is_active,
      start_date: start_date || null,
      end_date: end_date || null
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Bingo board not found'
      });
    }

    res.json({
      success: true,
      message: 'Bingo board updated successfully'
    });
  } catch (error) {
    console.error('Error updating bingo board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bingo board'
    });
  }
});

// Delete bingo board (Admin only)
router.delete('/boards/:id', isAdmin, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    const success = await BingoModel.deleteBoard(boardId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Bingo board not found'
      });
    }

    res.json({
      success: true,
      message: 'Bingo board deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bingo board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete bingo board'
    });
  }
});

// ========== BINGO TEAMS ==========

// Get teams for a board
router.get('/boards/:id/teams', async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    const teams = await BingoModel.getTeams(boardId);
    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
});

// Get items for a board (Admin only)
router.get('/admin/boards/:id/items', isAdmin, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    const items = await BingoModel.getBingoItems(boardId);
    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error fetching board items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board items'
    });
  }
});

// Get teams for a board (Admin only)
router.get('/admin/boards/:id/teams', isAdmin, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    const teams = await BingoModel.getTeams(boardId);
    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
});

// Create new team (Admin only)
router.post('/teams', isAdmin, async (req, res) => {
  try {
    const { board_id, team_name, color = '#3498db', member_ids = [], guest_members = [] } = req.body;
    
    // Validation
    if (!board_id || !team_name) {
      return res.status(400).json({
        success: false,
        error: 'Board ID and team name are required'
      });
    }

    if (team_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Team name cannot be empty'
      });
    }

    // Validate color format (basic hex check)
    if (color && !color.match(/^#[0-9A-F]{6}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Color must be a valid hex color (e.g., #3498db)'
      });
    }

    const teamId = await BingoModel.createTeam(
      board_id,
      team_name.trim(),
      color,
      member_ids,
      guest_members
    );

    res.json({
      success: true,
      message: 'Team created successfully',
      teamId
    });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505' && error.constraint === 'unique_team_per_board') {
      return res.status(400).json({
        success: false,
        error: `Team name "${team_name.trim()}" already exists on this board. Please choose a different name.`,
        errorType: 'DUPLICATE_TEAM_NAME'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create team'
    });
  }
});

// Update team (Admin only)
router.put('/teams/:id', isAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { team_name, color } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    // Validate color format if provided
    if (color && !color.match(/^#[0-9A-F]{6}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Color must be a valid hex color (e.g., #3498db)'
      });
    }

    const success = await BingoModel.updateTeam(teamId, {
      team_name: team_name?.trim(),
      color
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      message: 'Team updated successfully'
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team'
    });
  }
});

// Get team members (Admin only)  
router.get('/admin/teams/:id/members', isAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const members = await BingoModel.getTeamMembers(teamId);
    res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team members'
    });
  }
});

// Add members to team (Admin only)
router.post('/teams/:id/members', isAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { member_ids } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Member IDs must be provided as an array'
      });
    }

    await BingoModel.addTeamMembers(teamId, member_ids);

    res.json({
      success: true,
      message: 'Members added to team successfully'
    });
  } catch (error) {
    console.error('Error adding team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add team members'
    });
  }
});

// Add guest members to team (Admin only)
router.post('/teams/:id/guests', isAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { guest_members } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    if (!Array.isArray(guest_members) || guest_members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Guest members must be provided as an array'
      });
    }

    // Extract guest names from the guest_members array
    const guestNames = guest_members.map(guest => guest.name || guest);

    await BingoModel.addGuestTeamMembers(teamId, guestNames);

    res.json({
      success: true,
      message: 'Guest members added to team successfully'
    });
  } catch (error) {
    console.error('Error adding guest members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add guest members'
    });
  }
});

// Remove member from team (Admin only)
router.delete('/teams/:teamId/members/:memberId', isAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const memberId = parseInt(req.params.memberId);

    if (!teamId || !memberId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team or member ID'
      });
    }

    // First try to remove as clan member
    let success = await BingoModel.removeTeamMember(teamId, memberId);
    
    // If that didn't work, try to remove as guest member
    if (!success) {
      success = await BingoModel.removeGuestTeamMember(teamId, memberId);
    }
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Team member not found'
      });
    }

    res.json({
      success: true,
      message: 'Member removed from team successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member'
    });
  }
});

// Delete team (Admin only)
router.delete('/teams/:id', isAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const success = await BingoModel.deleteTeam(teamId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete team'
    });
  }
});

// ========== BINGO ITEMS/SQUARES ==========

// Set item for a bingo square (Admin only)
router.post('/items', isAdmin, async (req, res) => {
  try {
    const { board_id, row, column, item_name, item_id, icon_url, description } = req.body;
    
    // Validation
    if (!board_id || !row || !column || !item_name) {
      return res.status(400).json({
        success: false,
        error: 'Board ID, row, column, and item name are required'
      });
    }

    if (row < 1 || column < 1) {
      return res.status(400).json({
        success: false,
        error: 'Row and column must be positive numbers'
      });
    }

    const success = await BingoModel.setBingoItem(board_id, row, column, {
      item_name: item_name.trim(),
      item_id: item_id || null,
      icon_url: icon_url || null,
      description: description?.trim() || null
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to set bingo item'
      });
    }

    res.json({
      success: true,
      message: 'Bingo item set successfully'
    });
  } catch (error) {
    console.error('Error setting bingo item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set bingo item'
    });
  }
});

// Clear bingo square (Admin only)
router.delete('/items/:boardId/:row/:column', isAdmin, async (req, res) => {
  try {
    const boardId = parseInt(req.params.boardId);
    const row = parseInt(req.params.row);
    const column = parseInt(req.params.column);

    if (!boardId || !row || !column) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID, row, or column'
      });
    }

    const success = await BingoModel.clearBingoSquare(boardId, row, column);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Bingo square not found or already empty'
      });
    }

    res.json({
      success: true,
      message: 'Bingo square cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing bingo square:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear bingo square'
    });
  }
});

// ========== RS WIKI ITEM SEARCH ==========

// Search for items (for bingo square setup)
router.get('/items/search', isAdmin, async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.json({
        success: true,
        items: [],
        total: 0,
        search_term: searchTerm
      });
    }

    const results = await rsWikiService.searchItems(searchTerm, parseInt(limit));
    
    res.json({
      success: true,
      items: results,
      total: results.length,
      search_term: searchTerm
    });
  } catch (error) {
    // Silent fallback - no console logging
    res.json({
      success: true,
      items: [],
      total: 0,
      search_term: searchTerm,
      message: 'External API temporarily unavailable. Please use manual item creation instead.'
    });
  }
});

// Get popular boss loot items (for suggestions)
router.get('/items/popular-boss-loot', isAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const items = await rsWikiService.getPopularBossLoot(parseInt(limit));
    
    res.json({
      success: true,
      items,
      total: items.length
    });
  } catch (error) {
    // Silent fallback - no console logging
    res.json({
      success: true,
      items: [],
      total: 0,
      message: 'External API temporarily unavailable. Please use manual item creation or search instead.'
    });
  }
});

// Get specific item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    if (!itemId || itemId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item ID'
      });
    }

    const item = await rsWikiService.getItem(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    });
  }
});

// ========== BINGO COMPLETIONS ==========

// Get completions for a board
router.get('/boards/:id/completions', async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    const completions = await BingoModel.getBoardCompletions(boardId);
    
    res.json({
      success: true,
      completions
    });
  } catch (error) {
    console.error('Error fetching completions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completions'
    });
  }
});

// Mark square as completed (Admin or automatic)
router.post('/completions', async (req, res) => {
  try {
    const { item_id, team_id, member_id, activity_id } = req.body;
    
    if (!item_id || !team_id) {
      return res.status(400).json({
        success: false,
        error: 'Item ID and team ID are required'
      });
    }

    const completionId = await BingoModel.markSquareComplete(
      item_id,
      team_id,
      member_id,
      activity_id
    );

    res.json({
      success: true,
      message: 'Square marked as completed',
      completionId
    });
  } catch (error) {
    console.error('Error marking completion:', error);
    
    // Handle duplicate completion attempts
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        error: 'Square already completed by this team'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark completion'
    });
  }
});

// Remove completion (Admin only)
router.delete('/completions/:id', isAdmin, async (req, res) => {
  try {
    const completionId = parseInt(req.params.id);
    if (!completionId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid completion ID'
      });
    }

    const success = await BingoModel.removeCompletion(completionId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Completion not found'
      });
    }

    res.json({
      success: true,
      message: 'Completion removed successfully'
    });
  } catch (error) {
    console.error('Error removing completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove completion'
    });
  }
});

// Debug endpoint to check board configuration
router.get('/debug-board/:id', async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    const board = await BingoModel.getBoard(boardId);
    const items = await BingoModel.getBingoItems(boardId);
    const teams = await BingoModel.getTeams(boardId);
    
    res.json({
      success: true,
      board,
      items,
      teams,
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug board error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually mark a bingo square as complete (Admin only)
router.post('/manual-complete', isAdmin, async (req, res) => {
  try {
    const { itemId, teamId, memberName, completionReason } = req.body;
    
    // Validation
    if (!itemId || !teamId || !memberName) {
      return res.status(400).json({
        success: false,
        error: 'Item ID, team ID, and member name are required'
      });
    }

    // Check if already completed
    const existingCompletion = await BingoModel.getCompletion(itemId, teamId);
    if (existingCompletion) {
      return res.status(409).json({
        success: false,
        error: 'This square is already completed by this team'
      });
    }

    // Get team details to find member info
    const team = await BingoModel.getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    const teamMembers = await BingoModel.getTeamMembers(teamId);
    
    // Find the member in the team
    const memberNameLower = memberName.toLowerCase();
    const member = teamMembers.find(m => {
      const memberNames = [
        m.member_name,
        m.display_name,
        m.guest_name,
        m.clan_display_name
      ].filter(Boolean).map(name => name.toLowerCase());
      
      return memberNames.includes(memberNameLower);
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: `Member "${memberName}" not found in team "${team.team_name}". Please verify the member is part of this team before manually completing.`
      });
    }

    // Determine member type and IDs
    const isGuest = member.member_type === 'guest' || member.guest_member_id !== null;
    const memberId = isGuest ? null : member.member_id;
    const guestMemberId = isGuest ? member.guest_member_id : null;

    // Mark as completed (no activity ID for manual completions)
    const completionId = await BingoModel.markSquareComplete(
      itemId,
      teamId,
      memberId,
      null, // No activity ID for manual completions
      guestMemberId,
      memberName
    );

    // Log the manual completion
    console.log(`🎯 [Manual Completion] Admin marked square complete:`, {
      itemId,
      teamId,
      memberName,
      completionReason: completionReason || 'Manual completion by admin',
      completionId,
      adminUser: req.user?.displayName || req.user?.email || 'Unknown admin'
    });

    res.json({
      success: true,
      message: `Square marked complete for "${memberName}" in team "${team.team_name}"`,
      completionId
    });
  } catch (error) {
    console.error('Error in manual completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark square complete'
    });
  }
});

// Manually trigger bingo activity processing (Admin only)
router.post('/trigger-processing', isAdmin, async (req, res) => {
  try {
    console.log('🎯 [Manual Trigger] Admin manually triggered bingo processing');
    
    // Import the activity processor
    const bingoActivityProcessor = require('../services/bingoActivityProcessor');
    
    // Trigger processing immediately
    await bingoActivityProcessor.processActivities();
    
    res.json({
      success: true,
      message: 'Bingo activity processing triggered successfully. Check server logs for results.'
    });
  } catch (error) {
    console.error('Error manually triggering bingo processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger bingo processing'
    });
  }
});

// Process activities for bingo completion detection (Internal endpoint)
router.post('/process-activities', async (req, res) => {
  try {
    const { activities } = req.body;
    
    if (!Array.isArray(activities)) {
      return res.status(400).json({
        success: false,
        error: 'Activities must be an array'
      });
    }

    const results = await processBingoActivities(activities);
    
    res.json({
      success: true,
      processed: results.processed,
      newCompletions: results.newCompletions,
      errors: results.errors
    });
  } catch (error) {
    console.error('Error processing activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process activities'
    });
  }
});

// Activity processing helper function
async function processBingoActivities(activities) {
  const results = {
    processed: 0,
    newCompletions: [],
    errors: []
  };

  try {
    // Get all active boards
    const activeBoards = await BingoModel.getAllBoards();
    const activeBoardsFiltered = activeBoards.filter(board => board.is_active);
    
    if (activeBoardsFiltered.length === 0) {
      return results; // No active boards to process
    }

    // Get all items from active boards
    const allItems = [];
    for (const board of activeBoardsFiltered) {
      const boardItems = await BingoModel.getBingoItems(board.id);
      allItems.push(...boardItems.map(item => ({ ...item, board_id: board.id })));
    }

    // Get all teams for active boards
    const allTeams = [];
    for (const board of activeBoardsFiltered) {
      const teams = await BingoModel.getTeams(board.id);
      allTeams.push(...teams);
    }

    // Process each activity
    for (const activity of activities) {
      try {
        results.processed++;
        
        // Find matching bingo items based on activity text
        const matchingItems = findMatchingBingoItems(activity, allItems);
        
        if (matchingItems.length === 0) {
          continue; // No matching items for this activity
        }

        // Find the member's team(s)
        const memberTeams = findMemberTeams(activity.memberName || activity.member_name, allTeams);
        
        if (memberTeams.length === 0) {
          continue; // Member not in any bingo team
        }

        // Check for completions
        for (const item of matchingItems) {
          for (const team of memberTeams) {
            if (team.board_id !== item.board_id) {
              continue; // Team not for this board
            }

            try {
              // Check if already completed by this team
              const existingCompletion = await BingoModel.getCompletion(item.id, team.id);
              if (existingCompletion) {
                continue; // Already completed
              }

              // Get the original activity date from RuneMetrics (convert from Unix timestamp to Date)
              const activityDate = activity.date || activity.activity_date ? 
                new Date(parseInt(activity.date || activity.activity_date)) : null;

              // Mark as completed
              const completionId = await BingoModel.markSquareComplete(
                item.id,
                team.id,
                getMemberId(activity.memberName || activity.member_name, team.members),
                activity.id || null,
                null, // guestMemberId
                null, // completedByName
                activityDate // Pass the original RuneMetrics date
              );

              results.newCompletions.push({
                completionId,
                boardId: item.board_id,
                teamId: team.id,
                itemName: item.item_name,
                memberName: activity.memberName || activity.member_name,
                activityText: activity.text
              });

            } catch (error) {
              results.errors.push({
                activity: activity.text,
                item: item.item_name,
                error: error.message
              });
            }
          }
        }
        
      } catch (error) {
        results.errors.push({
          activity: activity.text || 'Unknown activity',
          error: error.message
        });
      }
    }
    
  } catch (error) {
    results.errors.push({
      general: error.message
    });
  }

  return results;
}

// Helper function to find matching bingo items
function findMatchingBingoItems(activity, allItems) {
  const activityText = (activity.text || '').toLowerCase();
  
  return allItems.filter(item => {
    const itemName = item.item_name.toLowerCase();
    
    // Direct name match
    if (activityText.includes(itemName)) {
      return true;
    }
    
    // Handle common variations and abbreviations
    const variations = getItemVariations(itemName);
    return variations.some(variation => activityText.includes(variation));
  });
}

// Helper function to get item name variations
function getItemVariations(itemName) {
  const variations = [itemName];
  
  // Common abbreviations and variations
  const replacements = {
    'dragon': ['d ', 'drag '],
    'abyssal': ['aby ', 'abby '],
    'rune': ['r '],
    'adamant': ['addy ', 'adam '],
    'mithril': ['mith '],
    'steel': ['s '],
    'iron': ['i '],
    'bronze': ['b '],
    'scimitar': ['scim', 'sword'],
    'longsword': ['long', 'sword'],
    'dagger': ['dag'],
    'battleaxe': ['baxe', 'axe'],
    'warhammer': ['wham', 'hammer'],
    'platebody': ['body', 'plate'],
    'platelegs': ['legs', 'plate'],
    'chainbody': ['chain'],
    'full helm': ['helm', 'helmet'],
    'square shield': ['sq shield', 'shield'],
    'kiteshield': ['kite', 'shield']
  };
  
  Object.entries(replacements).forEach(([original, alts]) => {
    if (itemName.includes(original)) {
      alts.forEach(alt => {
        variations.push(itemName.replace(original, alt));
      });
    }
  });
  
  return variations.map(v => v.toLowerCase());
}

// Helper function to find member teams
function findMemberTeams(memberName, allTeams) {
  if (!memberName) return [];
  
  const memberNameLower = memberName.toLowerCase();
  
  return allTeams.filter(team => 
    team.members && team.members.some(member => 
      member.member_name && member.member_name.toLowerCase() === memberNameLower
    )
  );
}

// Helper function to get member ID
function getMemberId(memberName, teamMembers) {
  if (!memberName || !teamMembers) return null;
  
  const memberNameLower = memberName.toLowerCase();
  const member = teamMembers.find(m => 
    m.member_name && m.member_name.toLowerCase() === memberNameLower
  );
  
  return member ? member.member_id : null;
}

module.exports = router;
