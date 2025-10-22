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
          const activityDate = new Date(parseInt(activity.date || activity.activity_date));
          
          // CRITICAL FIX: Only process activity for boards where it's within the time range
          const validBoardsForActivity = activeBoards.filter(board => {
            const boardStart = board.start_date ? new Date(board.start_date) : new Date(0);
            const boardEnd = board.end_date ? new Date(board.end_date) : new Date();
            
            return activityDate >= boardStart && activityDate <= boardEnd;
          });
          
          if (validBoardsForActivity.length === 0) {
            // Activity is not valid for any board - skip it
            continue;
          }
          
          // Only get items and teams from boards where this activity is valid
          const validBoardIds = validBoardsForActivity.map(board => board.id);
          const validItems = allItems.filter(item => validBoardIds.includes(item.board_id));
          const validTeams = allTeams.filter(team => validBoardIds.includes(team.board_id));
          
          // Find matching bingo items (only from valid boards)
          const matchingItems = this.findMatchingBingoItems(activity, validItems);
          
          
          if (matchingItems.length === 0) {
            continue;
          }

          // Find member's teams (only from valid boards)
          const memberTeams = this.findMemberTeams(memberName, validTeams);
          
          
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
      
      // Check for "Any [Item Type]" generic matching
      if (itemName.startsWith('any ')) {
        return this.matchesAnyItemType(activityText, itemName);
      }
      
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
   * Check if activity matches "Any [Item Type]" pattern
   */
  matchesAnyItemType(activityText, itemName) {
    // Extract the keyword after "any "
    const keyword = itemName.substring(4).trim(); // Remove "any " prefix
    
    // Handle different keyword formats
    let searchTerms = [];
    
    if (keyword.includes(' item')) {
      // "Any Virtus Item" -> search for "virtus"
      const baseKeyword = keyword.replace(' item', '').trim();
      searchTerms.push(baseKeyword);
    } else if (keyword.includes(' ')) {
      // "Any Dragon Weapon" -> search for "dragon" and full phrase, but exclude overly generic terms
      const words = keyword.split(' ');
      const filteredWords = words.filter(word => !this.isOverlyGenericTerm(word));
      searchTerms.push(...filteredWords);
      searchTerms.push(keyword); // Also search for full phrase
    } else {
      // "Any Virtus" -> search for "virtus"
      searchTerms.push(keyword);
    }
    
    // Add common RuneScape item variations for better matching
    const enhancedTerms = [...searchTerms];
    
    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // Handle special formatting for unique items
      if (termLower.includes('-') || termLower.includes(' ')) {
        // Add versions with different formatting
        enhancedTerms.push(termLower.replace(/-/g, ' ')); // "ek-zekkil" -> "ek zekkil"
        enhancedTerms.push(termLower.replace(/-/g, '')); // "ek-zekkil" -> "ekzekkil"
        enhancedTerms.push(termLower.replace(/\s+/g, '')); // "ek zekkil" -> "ekzekkil"
      }
      
      // Add common variations for popular item types (excluding items from different sources)
      switch (termLower) {
        case 'virtus':
          enhancedTerms.push('virtus wand', 'virtus book', 'virtus mask', 'virtus robe', 'virtus boots', 'virtus gloves');
          break;
        case 'nex':
          enhancedTerms.push('virtus', 'pernix', 'torva', 'virtus wand', 'pernix cowl', 'torva full helm');
          break;
        case 'subjugation':
          enhancedTerms.push('subjugation hood', 'subjugation robe', 'subjugation garb');
          break;
        case 'pernix':
          enhancedTerms.push('pernix cowl', 'pernix body', 'pernix chaps');
          break;
        case 'torva':
          enhancedTerms.push('torva full helm', 'torva platebody', 'torva platelegs');
          break;
        case 'bandos':
          enhancedTerms.push('bandos chestplate', 'bandos tassets', 'bandos boots', 'bandos gloves');
          break;
        case 'gwd':
        case 'god wars':
        case 'god wars dungeon':
          enhancedTerms.push('bandos', 'armadyl', 'saradomin', 'zamorak', 'subjugation', 'armadyl chestplate', 'bandos chestplate');
          break;
        case 'armadyl':
          // Only include GWD Armadyl items, NOT FSOA or other non-GWD items
          enhancedTerms.push('armadyl helmet', 'armadyl chestplate', 'armadyl chainskirt', 'armadyl crossbow', 'armadyl godsword');
          break;
        case 'saradomin':
          enhancedTerms.push('saradomin sword', 'saradomin godsword', 'saradomin hilt');
          break;
        case 'zamorak':
          enhancedTerms.push('zamorak godsword', 'zamorak hilt', 'zamorak spear');
          break;
        case 'dragon':
          enhancedTerms.push('dragon scimitar', 'dragon longsword', 'dragon dagger', 'dragon claws', 'dragon defender');
          break;
        case 'abyssal':
          enhancedTerms.push('abyssal whip', 'abyssal dagger', 'abyssal orb', 'abyssal wand');
          break;
        case 'barrows':
          enhancedTerms.push('dharok', 'ahrim', 'karil', 'torag', 'guthan', 'verac');
          break;
        case 'ek-zekkil':
        case 'ekzekkil':
        case 'ek zekkil':
          enhancedTerms.push('ek-zekkil', 'ekzekkil', 'ek zekkil', 'obsidian blade', 'magma core', 'ancient hilt');
          break;
        case 'tzkal-zuk':
        case 'tzkal zuk':
          enhancedTerms.push('ek-zekkil', 'ekzekkil', 'ek zekkil', 'obsidian blade', 'magma core', 'ancient hilt');
          break;
        case 'bow of the last guardian':
        case 'last guardian bow':
          enhancedTerms.push('bow of the last guardian', 'last guardian bow', 'top of the last guardian', 'bottom of the last guardian', 'divine bowstring');
          break;
        case 'mainhand drygore':
          enhancedTerms.push('drygore longsword', 'drygore mace', 'drygore rapier', 'mainhand', 'kalphite king');
          break;
        case 'offhand drygore':
          enhancedTerms.push('drygore longsword', 'drygore mace', 'drygore rapier', 'offhand', 'off-hand', 'kalphite king');
          break;
        case 'zamorak':
          enhancedTerms.push('zamorak godsword', 'zamorak hilt', 'zamorak spear', 'subjugation');
          break;
        case 'kerapac':
          enhancedTerms.push('fractured staff of armadyl', 'fractured armadyl symbol', 'fractured stabilisation gem', 'staff of armadyl\'s fractured shaft');
          break;
        case 'fractured':
        case 'fractured staff':
          enhancedTerms.push('fractured staff of armadyl', 'fractured armadyl symbol', 'fractured stabilisation gem', 'staff of armadyl\'s fractured shaft');
          break;
        case 'armour':
        case 'armor':
          enhancedTerms.push('chestplate', 'platebody', 'tassets', 'platelegs', 'helmet', 'boots', 'gloves');
          break;
        case 'magic armour':
        case 'magic armor':
          enhancedTerms.push('virtus', 'subjugation', 'robe', 'hood', 'mask');
          break;
        case 'range armour':
        case 'range armor':
        case 'ranged armour':
        case 'ranged armor':
          enhancedTerms.push('pernix', 'armadyl', 'coif', 'cowl', 'chaps', 'vambraces');
          break;
        case 'melee armour':
        case 'melee armor':
          enhancedTerms.push('torva', 'bandos', 'platebody', 'platelegs', 'full helm', 'chestplate', 'tassets');
          break;
        case 'eldritch crossbow':
        case 'eldritch':
          enhancedTerms.push('eldritch crossbow', 'eldritch crossbow limb', 'eldritch crossbow stock', 'eldritch crossbow mechanism');
          break;
        case 'ed3':
        case 'shadow reef':
          enhancedTerms.push('eldritch crossbow', 'eldritch crossbow limb', 'eldritch crossbow stock', 'eldritch crossbow mechanism');
          break;
      }
    });
    
    // Check if any search term is found in the activity text, but exclude conflicting items
    const isMatch = enhancedTerms.some(term => {
      const termLower = term.toLowerCase();
      const found = activityText.includes(termLower);
      
      if (found) {
        // Check for exclusions to prevent cross-contamination
        if (this.shouldExcludeMatch(activityText, itemName, termLower)) {
          return false;
        }
        
        console.log(`🎯 [Any Item Match] "${itemName}" matched activity "${activityText}" via keyword "${termLower}"`);
        return true;
      }
      
      return false;
    });
    
    // If no direct match, check for reverse mappings (boss -> item connections)
    if (!isMatch) {
      const reverseMatch = this.checkReverseBossMapping(activityText, itemName);
      if (reverseMatch) {
        // Apply exclusion logic to reverse mappings as well
        if (this.shouldExcludeMatch(activityText, itemName, 'reverse_mapping')) {
          return false;
        }
        console.log(`🎯 [Any Item Match] "${itemName}" matched activity "${activityText}" via reverse boss mapping`);
        return true;
      }
    }
    
    return isMatch;
  }

  /**
   * Check if a term is too generic and should be excluded from matching
   */
  isOverlyGenericTerm(term) {
    const genericTerms = [
      'weapon', 'item', 'equipment', 'gear', 'drop', 'loot', 
      'armor', 'armour', 'piece', 'set', 'part'
    ];
    
    return genericTerms.includes(term.toLowerCase());
  }

  /**
   * Check if a match should be excluded due to conflicting item sources
   */
  shouldExcludeMatch(activityText, bingoItemName, matchedTerm) {
    const activityTextLower = activityText.toLowerCase();
    const bingoItemLower = bingoItemName.toLowerCase();
    
    // Prevent "Any Armadyl Item" from matching FSOA items (different boss)
    if (bingoItemLower.includes('armadyl') && !bingoItemLower.includes('fractured')) {
      if (activityTextLower.includes('fractured') && (activityTextLower.includes('staff') || activityTextLower.includes('symbol') || activityTextLower.includes('armadyl'))) {
        console.log(`🚫 [Exclusion] Excluding FSOA-related item from "Any Armadyl Item" match`);
        return true;
      }
    }
    
    // Prevent "Any Crossbow Item" from matching Eldritch crossbow (different source)
    if (bingoItemLower.includes('crossbow') && !bingoItemLower.includes('eldritch')) {
      if (activityTextLower.includes('eldritch') && activityTextLower.includes('crossbow')) {
        console.log(`🚫 [Exclusion] Excluding Eldritch crossbow from "Any Crossbow Item" match`);
        return true;
      }
    }
    
    // Prevent "Any Bow Item" from matching Bow of the Last Guardian (different source)
    if (bingoItemLower.includes('bow') && !bingoItemLower.includes('last guardian')) {
      if (activityTextLower.includes('last guardian') && activityTextLower.includes('bow')) {
        console.log(`🚫 [Exclusion] Excluding Bow of the Last Guardian from "Any Bow Item" match`);
        return true;
      }
    }
    
    // Prevent "Any Staff Item" from matching items that aren't actually staves
    if (bingoItemLower.includes('staff') && matchedTerm === 'staff') {
      // Only match if it's actually a staff item
      const staffKeywords = ['staff', 'wand', 'orb'];
      if (!staffKeywords.some(keyword => activityTextLower.includes(keyword))) {
        return true;
      }
    }
    
    // Prevent cross-contamination between mainhand and offhand drygore items
    if (bingoItemLower.includes('mainhand drygore')) {
      if ((activityTextLower.includes('offhand') || activityTextLower.includes('off-hand')) && activityTextLower.includes('drygore')) {
        console.log(`🚫 [Exclusion] Excluding offhand drygore from "Any mainhand drygore" match`);
        return true;
      }
    }
    
    if (bingoItemLower.includes('offhand drygore')) {
      if (activityTextLower.includes('mainhand') && activityTextLower.includes('drygore')) {
        console.log(`🚫 [Exclusion] Excluding mainhand drygore from "Any offhand drygore" match`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for reverse boss mappings (when activity contains boss items, match boss names)
   */
  checkReverseBossMapping(activityText, bingoItemName) {
    const activityTextLower = activityText.toLowerCase();
    const bingoItemLower = bingoItemName.toLowerCase();
    
    // Map specific items back to their boss categories
    const itemToBossMap = {
      'ek-zekkil': ['tzkal-zuk', 'tzkal zuk', 'inferno'],
      'ekzekkil': ['tzkal-zuk', 'tzkal zuk', 'inferno'],
      'obsidian blade': ['tzkal-zuk', 'tzkal zuk', 'inferno', 'ek-zekkil', 'ekzekkil'],
      'magma core': ['tzkal-zuk', 'tzkal zuk', 'inferno', 'ek-zekkil', 'ekzekkil'],
      'ancient hilt': ['tzkal-zuk', 'tzkal zuk', 'inferno', 'ek-zekkil', 'ekzekkil'],
      
      'bow of the last guardian': ['zamorak'],
      'top of the last guardian': ['zamorak', 'bow of the last guardian'],
      'bottom of the last guardian': ['zamorak', 'bow of the last guardian'],
      'divine bowstring': ['zamorak', 'bow of the last guardian'],
      
      'drygore longsword': ['kalphite king', 'kk', 'mainhand drygore', 'offhand drygore'],
      'drygore mace': ['kalphite king', 'kk', 'mainhand drygore', 'offhand drygore'], 
      'drygore rapier': ['kalphite king', 'kk', 'mainhand drygore', 'offhand drygore'],
      
      'eldritch crossbow': ['ed3', 'shadow reef'],
      'eldritch crossbow limb': ['ed3', 'shadow reef', 'eldritch crossbow'],
      'eldritch crossbow stock': ['ed3', 'shadow reef', 'eldritch crossbow'],
      'eldritch crossbow mechanism': ['ed3', 'shadow reef', 'eldritch crossbow'],
      
      'fractured staff of armadyl': ['kerapac'],
      'fractured armadyl symbol': ['kerapac', 'fractured staff'],
      'fractured stabilisation gem': ['kerapac', 'fractured staff'],
      'staff of armadyl\'s fractured shaft': ['kerapac', 'fractured staff'],
      
      // Nex items
      'virtus wand': ['nex'],
      'virtus book': ['nex'], 
      'virtus mask': ['nex'],
      'pernix cowl': ['nex'],
      'pernix body': ['nex'],
      'pernix chaps': ['nex'],
      'torva full helm': ['nex'],
      'torva platebody': ['nex'],
      'torva platelegs': ['nex'],
      
      // GWD items
      'bandos chestplate': ['gwd', 'god wars'],
      'bandos tassets': ['gwd', 'god wars'],
      'bandos boots': ['gwd', 'god wars'],
      'subjugation hood': ['gwd', 'god wars', 'zamorak'],
      'subjugation robe': ['gwd', 'god wars', 'zamorak'],
      'subjugation garb': ['gwd', 'god wars', 'zamorak']
    };
    
    // Check if activity contains any items that should map to the bingo boss
    for (const [itemInActivity, bossList] of Object.entries(itemToBossMap)) {
      if (activityTextLower.includes(itemInActivity)) {
        // Extract the keyword from bingo item (remove "any " prefix)
        const bingoKeyword = bingoItemLower.replace('any ', '').replace(' item', '').replace(' drop', '').trim();
        
        // Check if any boss names match the bingo keyword
        if (bossList.some(boss => boss.includes(bingoKeyword) || bingoKeyword.includes(boss))) {
          return true;
        }
      }
    }
    
    return false;
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

