const axios = require('axios');
const { BingoModel } = require('../database/models');

class BingoActivityProcessor {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedTime = null;
    this.processInterval = 60000; // Process every minute
  }

  /**
   * Start the activity processor
   */
  start() {
    console.log('🎯 Starting bingo activity processor...');
    
    // Process immediately
    this.processActivities();
    
    // Set up interval processing
    this.intervalId = setInterval(() => {
      this.processActivities();
    }, this.processInterval);
  }

  /**
   * Stop the activity processor
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🎯 Bingo activity processor stopped');
  }

  /**
   * Process recent activities for bingo completions
   */
  async processActivities() {
    if (this.isProcessing) {
      return; // Already processing
    }

    try {
      this.isProcessing = true;

      // Check if we have any active bingo boards
      const activeBoards = await BingoModel.getAllBoards();
      const activeBoardsFiltered = activeBoards.filter(board => board.is_active);
      
      // Filter out boards that haven't started yet
      const currentTime = new Date();
      const startedBoards = activeBoardsFiltered.filter(board => {
        if (!board.start_date) return true; // No start date means it can start immediately
        return currentTime >= new Date(board.start_date);
      });
      
      if (startedBoards.length === 0) {
        return; // No active boards that have started
      }

      // Get recent activities from our API and guest members (pass started boards for date filtering)
      const activities = await this.fetchRecentActivities(startedBoards);
      
      if (activities.length === 0) {
        return; // No new activities
      }


      // Process activities for bingo completions
      const results = await this.processBingoActivities(activities, startedBoards);
      
      
      if (results.newCompletions.length > 0) {
        console.log(`🎯 Bingo: ${results.newCompletions.length} new completions detected!`);
      }

      this.lastProcessedTime = new Date();

    } catch (error) {
      console.error('Error processing bingo activities:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch recent activities from clan activities API and guest members
   */
  async fetchRecentActivities(activeBoards = []) {
    try {
      // In production, use the internal service URL. In development, use localhost with correct port
      const baseUrl = process.env.API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? `http://localhost:${process.env.PORT || 10000}` 
          : 'http://localhost:3001');
      
      // Calculate the earliest start date from all active boards
      let earliestStartDate = null;
      for (const board of activeBoards) {
        if (board.start_date) {
          const boardStartDate = new Date(board.start_date);
          if (!earliestStartDate || boardStartDate < earliestStartDate) {
            earliestStartDate = boardStartDate;
          }
        }
      }
      
      // Use board start date if available, otherwise fallback to last processed time or 30 minutes ago
      const since = earliestStartDate || this.lastProcessedTime || new Date(Date.now() - 30 * 60 * 1000);
      
      if (earliestStartDate) {
      }
      
      // Fetch clan activities
      const response = await axios.get(`${baseUrl}/api/activities/clan?limit=500`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Bingo Activity Processor/1.0'
        }
      });

      let allActivities = [];
      
      // Add clan activities
      if (response.data && response.data.activities) {
        allActivities = [...response.data.activities];
      }
      
      // Fetch guest member activities
      const guestMemberSyncService = require('./guestMemberSyncService');
      const activeBoardIds = activeBoards.filter(board => board.is_active).map(board => board.id);
      
      if (activeBoardIds.length > 0) {
        const guestMembers = await BingoModel.getActiveGuestMembers(activeBoardIds);
        
        for (const guest of guestMembers) {
          try {
            // Calculate hours back from earliest board start date
            let hoursBack = 24; // default
            if (earliestStartDate) {
              const hoursSinceStart = (new Date() - earliestStartDate) / (1000 * 60 * 60);
              hoursBack = Math.max(1, Math.ceil(hoursSinceStart + 1)); // Add 1 hour buffer
            }
            
            const guestActivities = await guestMemberSyncService.getGuestMemberRecentActivities(guest.display_name, hoursBack);
            
            // Format guest activities to match clan activity format
            const formattedGuestActivities = guestActivities.map(activity => ({
              ...activity,
              memberName: guest.display_name,
              member_name: guest.display_name,
              isGuestActivity: true
            }));
            
            allActivities = [...allActivities, ...formattedGuestActivities];
            
          } catch (error) {
            console.error(`🎯 [Bingo] Error fetching activities for guest ${guest.display_name}:`, error.message);
          }
        }
      }
      

      // Filter activities since the calculated start time
      const filteredActivities = allActivities.filter(activity => {
        const rawTimestamp = activity.date || activity.activity_date;
        const activityDate = new Date(parseInt(rawTimestamp));
        
        
        // Check if date is valid
        if (isNaN(activityDate.getTime())) {
          return false;
        }
        
        // Skip activities with future dates (corrupted timestamps) but allow recent ones
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        if (activityDate > oneHourFromNow) {
          return false;
        }
        
        // Check if activity is within any active board's time range
        let isWithinBoardTime = false;
        const currentTime = new Date();
        
        for (const board of activeBoards) {
          const boardStart = board.start_date ? new Date(board.start_date) : new Date(0); // Beginning of time if no start date
          const boardEnd = board.end_date ? new Date(board.end_date) : new Date(); // Now if no end date
          
          // Skip boards that haven't started yet (don't process any activities for them)
          if (board.start_date && currentTime < boardStart) {
            continue; // Board hasn't started yet, skip processing activities for this board
          }
          
          // CRITICAL: Only accept activities that occurred AFTER the board's start time
          // This prevents old RuneMetrics activities from being counted when a board becomes active
          if (activityDate >= boardStart && activityDate <= boardEnd) {
            isWithinBoardTime = true;
            break;
          } else if (board.start_date && activityDate < boardStart) {
            // Log activities that are being rejected for being too early
            console.log(`🚫 [Bingo] Rejecting activity from ${activityDate.toISOString()} (before board start ${boardStart.toISOString()}): ${activity.text || activity.details || 'Unknown activity'} - Member: ${activity.memberName || activity.member_name || 'Unknown'}`);
          }
        }
        
        // If no boards have dates set, use the old logic
        if (activeBoards.length === 0 || !activeBoards.some(b => b.start_date)) {
          isWithinBoardTime = activityDate > since;
        }
        
        return isWithinBoardTime;
      });
      
      
      return filteredActivities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Process activities for bingo completions
   */
  async processBingoActivities(activities, activeBoards) {
    const results = {
      processed: 0,
      newCompletions: [],
      errors: []
    };

    try {
      // Get all items and teams from active boards
      const { allItems, allTeams } = await this.loadBingoData(activeBoards);

      // Process each activity
      
      for (const activity of activities) {
        try {
          results.processed++;
          
          const memberName = activity.memberName || activity.member_name;
          
          
          // Find matching bingo items
          const matchingItems = this.findMatchingBingoItems(activity, allItems);
          
          
          if (matchingItems.length === 0) {
            continue;
          }

          // Find member's teams
          const memberTeams = this.findMemberTeams(memberName, allTeams);
          
          
          if (memberTeams.length === 0) {
            continue;
          }

          // Process completions
          await this.processCompletions(activity, matchingItems, memberTeams, results);
          
        } catch (error) {
          console.error(`Error processing activity "${activity.text}" by ${activity.memberName || activity.member_name}: ${error.message}`);
          results.errors.push({
            activity: activity.text || 'Unknown',
            error: error.message
          });
        }
      }
      
      console.log(`🎯 [Bingo Debug] Finished processing ${results.processed} activities. Found ${results.newCompletions.length} new completions`);

    } catch (error) {
      results.errors.push({
        general: error.message
      });
    }

    return results;
  }

  /**
   * Load bingo data (items and teams) for active boards
   */
  async loadBingoData(activeBoards) {
    const allItems = [];
    const allTeams = [];

    for (const board of activeBoards) {
      const [boardItems, teams] = await Promise.all([
        BingoModel.getBingoItems(board.id),
        BingoModel.getTeams(board.id)
      ]);

      allItems.push(...boardItems.map(item => ({ ...item, board_id: board.id })));
      
      // Add board_id to teams and fetch team members
      for (const team of teams) {
        team.board_id = board.id;
        team.members = await BingoModel.getTeamMembers(team.id);
      }
      allTeams.push(...teams);
    }

    return { allItems, allTeams };
  }

  /**
   * Process completions for matched items and teams
   */
  async processCompletions(activity, matchingItems, memberTeams, results) {
    const activityText = activity.text || '';
    const memberName = activity.memberName || activity.member_name;
    
    
    for (const item of matchingItems) {
      for (const team of memberTeams) {
        if (team.board_id !== item.board_id) {
          continue;
        }

        try {
          // Check if already completed
          const existingCompletion = await BingoModel.getCompletion(item.id, team.id);
          if (existingCompletion) {
            continue;
          }

          // Get member info and determine if it's a clan member or guest
          const memberInfo = this.getMemberInfo(memberName, team.members);
          

          // Mark as completed with proper member/guest handling
          const completionId = await BingoModel.markSquareComplete(
            item.id,
            team.id,
            memberInfo.isGuest ? null : memberInfo.memberId,
            activity.id || null,
            memberInfo.isGuest ? memberInfo.memberId : null,
            memberName
          );


          results.newCompletions.push({
            completionId,
            boardId: item.board_id,
            teamId: team.id,
            itemName: item.item_name,
            memberName: memberName,
            activityText: activity.text
          });

        } catch (error) {
          results.errors.push({
            activity: activity.text,
            item: item.item_name,
            team: team.team_name,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Find bingo items that match the activity
   */
  findMatchingBingoItems(activity, allItems) {
    const activityText = (activity.text || '').toLowerCase();
    
    
    const matches = allItems.filter(item => {
      const itemName = item.item_name.toLowerCase();
      
      // All items can now be tracked through RuneMetrics, including manual items
      // Manual items will be matched by name in activity text
      
      // Direct name match
      const isMatch = activityText.includes(itemName);
      if (isMatch) {
        return true;
      }
      
      // Handle variations and abbreviations
      const variations = this.getItemVariations(itemName);
      const variationMatch = variations.some(variation => {
        const found = activityText.includes(variation);
        return found;
      });
      
      return variationMatch;
    });
    
    
    return matches;
  }

  /**
   * Get item name variations for better matching
   */
  getItemVariations(itemName) {
    const variations = [itemName];
    
    // Common RuneScape item abbreviations and variations
    const replacements = {
      // Dragon items
      'dragon': ['d ', 'drag '],
      'abyssal': ['aby ', 'abby '],
      'rune': ['r '],
      'adamant': ['addy ', 'adam '],
      'mithril': ['mith '],
      'steel': ['s '],
      'iron': ['i '],
      'bronze': ['b '],
      
      // Weapon types
      'scimitar': ['scim', 'sword'],
      'longsword': ['long', 'sword'],
      'dagger': ['dag'],
      'battleaxe': ['baxe', 'axe'],
      'warhammer': ['wham', 'hammer'],
      'crossbow': ['c bow', 'xbow'],
      
      // Armor types
      'platebody': ['body', 'plate'],
      'platelegs': ['legs', 'plate'],
      'chainbody': ['chain'],
      'full helm': ['helm', 'helmet'],
      'square shield': ['sq shield', 'shield'],
      'kiteshield': ['kite', 'shield'],
      
      // Boss items  
      'whip': ['whip'],
      'abyssal whip': ['aby whip', 'abby whip', 'whip'],
      'trident': ['trident'],
      'tentacle': ['tent'],
      'visage': ['vis'],
      'sigil': ['sigil'],
      
      // Jewelry
      'amulet': ['ammy'],
      'necklace': ['neck'],
      'bracelet': ['brace'],
      
      // Special items
      'dragon claws': ['d claws', 'claws'],
      'bandos': ['bcp', 'tassets'],
      'armadyl': ['ags', 'acb'],
      'saradomin': ['sgs', 'sara'],
      'zamorak': ['zgs', 'zammy']
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

  /**
   * Find teams that contain the specified member
   */
  findMemberTeams(memberName, allTeams) {
    if (!memberName) return [];
    
    const memberNameLower = memberName.toLowerCase();
    
    
    return allTeams.filter(team => 
      team.members && team.members.some(member => {
        // Check multiple possible name fields
        const memberNames = [
          member.member_name,
          member.display_name,
          member.guest_name,
          member.clan_display_name
        ].filter(Boolean).map(name => name.toLowerCase());
        
        return memberNames.includes(memberNameLower);
      })
    );
  }

  /**
   * Get member info from team members (handles both clan and guest members)
   */
  getMemberInfo(memberName, teamMembers) {
    if (!memberName || !teamMembers) return { memberId: null, isGuest: false };
    
    const memberNameLower = memberName.toLowerCase();
    const member = teamMembers.find(m => {
      // Check multiple possible name fields
      const memberNames = [
        m.member_name,
        m.display_name,
        m.guest_name,
        m.clan_display_name
      ].filter(Boolean).map(name => name.toLowerCase());
      
      return memberNames.includes(memberNameLower);
    });
    
    if (!member) return { memberId: null, isGuest: false };
    
    // Determine if this is a guest member
    const isGuest = member.member_type === 'guest' || member.guest_member_id !== null;
    const memberId = isGuest ? member.guest_member_id : member.member_id;
    
    return { memberId, isGuest };
  }

  /**
   * Get member ID from team members (legacy method for backward compatibility)
   */
  getMemberId(memberName, teamMembers) {
    const memberInfo = this.getMemberInfo(memberName, teamMembers);
    return memberInfo.memberId;
  }

  /**
   * Debug function to test processing specific activities
   */
  async testActivityProcessing(activityText, memberName = null) {
    try {
      // Get active boards
      const activeBoards = await BingoModel.getAllBoards();
      const activeBoardsFiltered = activeBoards.filter(board => board.is_active);
      
      if (activeBoardsFiltered.length === 0) {
        return;
      }
      
      // Get bingo data
      const { allItems, allTeams } = await this.loadBingoData(activeBoardsFiltered);
      
      // Create mock activity
      const mockActivity = {
        text: activityText,
        memberName: memberName,
        member_name: memberName,
        date: Date.now(),
        id: 'test-' + Date.now()
      };
      
      // Test matching
      const matchingItems = this.findMatchingBingoItems(mockActivity, allItems);
      
      if (memberName) {
        const memberTeams = this.findMemberTeams(memberName, allTeams);
      }
      
      return {
        matchingItems,
        totalItems: allItems.length,
        totalTeams: allTeams.length
      };
      
    } catch (error) {
      console.error('🔧 [Debug Test] Error:', error);
    }
  }
}

module.exports = new BingoActivityProcessor();

