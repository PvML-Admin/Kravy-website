const express = require('express');
const router = express.Router();
const { MemberModel } = require('../database/models');
const { syncMember, getMemberStats } = require('../services/syncService');
const { getPlayerStats } = require('../services/runemetrics');
const { sortMembersByRank, getRankIcon, getRankColor } = require('../utils/clanRanks');
const { getSkillMaxLevel, getXpToNextLevel, getPercentageToNextLevel } = require('../utils/skillLevels');
const { isAdmin } = require('../middleware/auth');

// Cache for hiscores data (refreshes every hour)
let hiscoresCache = {
  data: null,
  timestamp: null,
  brackets: null,
  bracketsTimestamp: null
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function isCacheValid(timestamp) {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < CACHE_DURATION;
}

router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const inactivityDays = parseInt(req.query.inactiveDays) || null;
    
    let members = await MemberModel.getAll(activeOnly);
    
    // Filter by inactivity if requested
    if (inactivityDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);
      
      members = members.filter(member => {
        if (!member.last_xp_gain) return true; // No XP gain data yet, include them
        const lastGain = new Date(member.last_xp_gain);
        return lastGain < cutoffDate;
      });
    }
    
    // Sort by rank (highest to lowest)
    members = sortMembersByRank(members);
    
    // Add rank metadata and inactivity info to each member
    members = members.map(member => {
      const daysInactive = member.last_xp_gain 
        ? Math.floor((Date.now() - new Date(member.last_xp_gain).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        ...member,
        rank_icon: getRankIcon(member.clan_rank || 'Recruit'),
        rank_color: getRankColor(member.clan_rank || 'Recruit'),
        days_inactive: daysInactive
      };
    });
    
    res.json({
      success: true,
      count: members.length,
      members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/hiscores', async (req, res) => {
  try {
    const { skill, xpBracket } = req.query;
    const members = await MemberModel.getHiscores(skill, xpBracket);
    res.json({
      success: true,
      members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clan hiscores from database.'
    });
  }
});

router.get('/hiscores/xp-brackets', async (req, res) => {
  try {
    // Check if we have valid cached brackets
    if (isCacheValid(hiscoresCache.bracketsTimestamp)) {
      console.log('Serving XP brackets from cache');
      return res.json({
        success: true,
        brackets: hiscoresCache.brackets,
        cached: true
      });
    }

    // Cache is invalid or doesn't exist, fetch fresh data
    console.log('Fetching fresh XP brackets data');
    const brackets = await MemberModel.getHiscoresXpBrackets();
    
    // Update cache
    hiscoresCache.brackets = brackets;
    hiscoresCache.bracketsTimestamp = Date.now();
    
    res.json({
      success: true,
      brackets,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching XP brackets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch XP brackets.'
    });
  }
});

router.get('/all-hiscores', async (req, res) => {
  try {
    // Check if we have valid cached data
    if (isCacheValid(hiscoresCache.timestamp)) {
      console.log('Serving hiscores from cache');
      return res.json({
        success: true,
        members: hiscoresCache.data,
        cached: true,
        cacheAge: Math.floor((Date.now() - hiscoresCache.timestamp) / 1000 / 60) // age in minutes
      });
    }

    // Cache is invalid or doesn't exist, fetch fresh data
    console.log('Fetching fresh hiscores data');
    const members = await MemberModel.getAllHiscoresData();
    
    // Update cache
    hiscoresCache.data = members;
    hiscoresCache.timestamp = Date.now();
    
    res.json({
      success: true,
      members,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching hiscores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all hiscores data.'
    });
  }
});

router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let member;

    if (isNaN(identifier)) {
      member = await MemberModel.findByName(identifier);
    } else {
      member = await MemberModel.findById(parseInt(identifier));
    }

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.json({
      success: true,
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:identifier/stats', async (req, res) => {
  try {
    const { identifier } = req.params;
    let member;

    if (isNaN(identifier)) {
      member = await MemberModel.findByName(identifier);
    } else {
      member = await MemberModel.findById(parseInt(identifier));
    }

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    const period = req.query.period || 'weekly';
    const stats = await getMemberStats(member.id, period);

    // Enrich skills with max level and progress info
    if (stats.skills && Array.isArray(stats.skills)) {
      stats.skills = stats.skills.map(skill => ({
        ...skill,
        max_level: getSkillMaxLevel(skill.skill_name),
        xp_to_next: skill.level < getSkillMaxLevel(skill.skill_name) 
          ? getXpToNextLevel(skill.level, skill.xp) 
          : 0,
        percent_to_next: skill.level < getSkillMaxLevel(skill.skill_name)
          ? getPercentageToNextLevel(skill.level, skill.xp)
          : 100
      }));
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/', isAdmin, async (req, res) => {
  try {
    const { name, fetchData } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const existing = await MemberModel.findByName(name);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Member already exists'
      });
    }

    let displayName = name;
    if (fetchData) {
      try {
        const stats = await getPlayerStats(name);
        displayName = stats.name;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Could not fetch player data: ${error.message}`
        });
      }
    }

    const result = await MemberModel.create(name, displayName);
    const newMember = await MemberModel.findById(result.lastID);

    res.status(201).json({
      success: true,
      member: newMember
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/bulk', isAdmin, async (req, res) => {
  try {
    const { names } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Names array is required'
      });
    }

    const results = {
      added: [],
      skipped: [],
      errors: []
    };

    console.log(`[Bulk Add] Processing ${names.length} members...`);

    for (const name of names) {
      try {
        const existing = await MemberModel.findByName(name);
        if (existing) {
          results.skipped.push(name);
          continue;
        }

        await MemberModel.create(name, name);
        results.added.push(name);
        console.log(`[Bulk Add] Added: ${name}`);
      } catch (error) {
        results.errors.push({ name, error: error.message });
        console.error(`[Bulk Add] Error adding ${name}: ${error.message}`);
      }
    }

    console.log(`[Bulk Add] Complete. Added: ${results.added.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const memberId = parseInt(id);
    
    // Get member info first
    const member = await MemberModel.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Start sync in background (non-blocking)
    console.log(`[API] Starting background sync for ${member.name}...`);
    syncMember(memberId)
      .then(() => {
        console.log(`[API] Background sync completed for ${member.name}`);
      })
      .catch((error) => {
        console.error(`[API] Background sync failed for ${member.name}: ${error.message}`);
      });

    // Return immediately
    res.json({
      success: true,
      message: `Sync started for ${member.display_name || member.name}`,
      member: member.name
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await MemberModel.delete(parseInt(id));

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/', isAdmin, async (req, res) => {
  try {
    const members = await MemberModel.getAll(false);
    
    for (const member of members) {
      await MemberModel.delete(member.id);
    }

    res.json({
      success: true,
      message: `Deleted ${members.length} members`,
      count: members.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.patch('/:id/active', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    await MemberModel.setActive(parseInt(id), active);

    res.json({
      success: true,
      message: 'Member status updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle Discord Booster status
router.patch('/:id/discord-booster', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isBooster } = req.body;

    await MemberModel.setDiscordBooster(parseInt(id), isBooster);

    res.json({
      success: true,
      message: `Discord Booster status ${isBooster ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle Grandmaster CA status
router.patch('/:id/grandmaster-ca', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isGrandmasterCA } = req.body;

    await MemberModel.setGrandmasterCA(parseInt(id), isGrandmasterCA);

    res.json({
      success: true,
      message: `Grandmaster CA status ${isGrandmasterCA ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/highest-ranks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const ranks = req.query.ranks ? req.query.ranks.split(',') : null;

    let members;
    if (ranks) {
      members = await MemberModel.getAll(true, true, ranks);
    } else {
      const allMembers = await MemberModel.getAll(true, true);
      members = allMembers.slice(0, limit);
    }

    res.json({
      success: true,
      members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear hiscores cache (useful for manual refresh or after bulk sync)
router.post('/hiscores/clear-cache', isAdmin, async (req, res) => {
  try {
    hiscoresCache.data = null;
    hiscoresCache.timestamp = null;
    hiscoresCache.brackets = null;
    hiscoresCache.bracketsTimestamp = null;
    
    console.log('Hiscores cache cleared');
    
    res.json({
      success: true,
      message: 'Hiscores cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

