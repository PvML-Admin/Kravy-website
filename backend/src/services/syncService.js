const { MemberModel, SnapshotModel, SkillModel, SyncLogModel, ActivityModel } = require('../database/models');
const { fetchPlayerProfile } = require('./runemetrics');
const { fetchPlayerFromHiscores, calculateCombatLevel } = require('./hiscores');
const { getSkillMaxLevel, getXpToNextLevel, getPercentageToNextLevel } = require('../utils/skillLevels');
const db = require('../config/database');

// In-memory storage for sync progress (in production, use Redis or database)
const syncProgress = new Map();

async function syncMember(memberId) {
  // Guard clause to prevent crashes on invalid data
  if (!memberId) {
    console.warn('[Sync Service] Attempted to sync a member with a null or undefined ID. Skipping.');
    return;
  }

  const member = await MemberModel.findById(memberId);
  if (!member) {
    // This can happen if a member was deleted while a sync was in progress.
    // Instead of crashing, we should log it and move on.
    console.warn(`[Sync Service] Member with ID ${memberId} not found. It may have been deleted. Skipping.`);
    return;
  }

  console.log(`[Sync] Starting sync for ${member.display_name || member.name}...`);

  try {
    // Fetch from HiScores API for accurate levels, XP, and ranks
    console.log(`[Sync] Fetching HiScores data for ${member.name}...`);
    const hiscoresData = await fetchPlayerFromHiscores(member.name);
    let profileData = {};
    
    const totalXp = hiscoresData.totalXp || 0;
    const oldTotalXp = member.total_xp || 0;
    const xpDiff = totalXp - oldTotalXp;
    if (xpDiff > 0) {
      console.log(`[Sync] Total XP: ${totalXp.toLocaleString()} (+${xpDiff.toLocaleString()})`);
    } else {
      console.log(`[Sync] Total XP: ${totalXp.toLocaleString()} (no change)`);
    }
    
    // Default to calculated combat level
    let combatLevel = calculateCombatLevel(hiscoresData.skills);
    console.log(`[Sync] Combat Level: ${combatLevel}`);

    await MemberModel.update(memberId, {
      total_xp: totalXp,
      total_rank: hiscoresData.totalRank,
      last_synced: new Date().toISOString(),
      // We no longer update display_name here, as HiScores may not have correct capitalization.
      // We will only update it from RuneMetrics which is the source of truth for casing.
      combat_level: combatLevel // Save the calculated combat level immediately
    });

    const oldSkills = await SkillModel.getByMember(memberId);
    await SnapshotModel.create(memberId, totalXp);

    let totalXpDelta = 0;
    let skillsWithGains = [];

    // Update skills with HiScores data and calculate total XP delta
    for (const skill of hiscoresData.skills) {
      const oldSkill = oldSkills.find(s => s.skill_name === skill.name);
      // Calculate the difference in XP since the last sync
      const xpDelta = oldSkill ? skill.xp - oldSkill.xp : 0;
      
      if (xpDelta > 0) {
        totalXpDelta += xpDelta;
        skillsWithGains.push({ name: skill.name, xp: xpDelta, level: skill.level });
      }

      // Add this difference to the existing gains to accumulate them
      const newDailyXpGain = (oldSkill ? (oldSkill.daily_xp_gain || 0) : 0) + xpDelta;
      const newWeeklyXpGain = (oldSkill ? (oldSkill.weekly_xp_gain || 0) : 0) + xpDelta;

      await SkillModel.upsert(
        memberId,
        skill.id,
        skill.name,
        skill.level,
        skill.xp,
        skill.rank,
        newDailyXpGain,
        newWeeklyXpGain
      );
    }

    // Log skill gains
    if (skillsWithGains.length > 0) {
      console.log(`[Sync] Skills with gains: ${skillsWithGains.length}`);
      skillsWithGains.slice(0, 3).forEach(s => {
        console.log(`[Sync]   ${s.name}: +${s.xp.toLocaleString()} XP (Level ${s.level})`);
      });
      if (skillsWithGains.length > 3) {
        console.log(`[Sync]   ... and ${skillsWithGains.length - 3} more`);
      }
    } else {
      console.log(`[Sync] No XP gains since last sync`);
    }

    // Fetch activities and rank from RuneMetrics (HiScores doesn't have activities)
    try {
      console.log(`[Sync] Fetching RuneMetrics profile...`);
      profileData = await fetchPlayerProfile(member.name);
      
      console.log(`[Sync] RuneMetrics returned name: "${profileData.name}" for member: "${member.name}"`);
      
      // Override with RuneMetrics combat level if available
      if (profileData.combatlevel) {
        combatLevel = profileData.combatlevel;
      }
      
      // Cap combat level at 152
      if (combatLevel > 152) {
        combatLevel = 152;
      }
      
      // Update rank, combat level, and display name from RuneMetrics
      const updateData = {};
      if (profileData.rank) {
        const rankNum = parseInt(String(profileData.rank).replace(/,/g, ''));
        if (!isNaN(rankNum)) {
          updateData.total_rank = rankNum;
        }
      }
      updateData.combat_level = combatLevel;
      
      // Add clan_xp and kills from RuneMetrics profile
      if (profileData.clanXp) {
        // RuneMetrics may return clanXp as a string with commas
        const clanXpNum = parseInt(String(profileData.clanXp).replace(/,/g, ''));
        if (!isNaN(clanXpNum)) {
          updateData.clan_xp = clanXpNum;
          console.log(`[Sync] Updating clan_xp to: ${clanXpNum}`);
        }
      }
      if (profileData.kills) {
        // Kills can also be a formatted string
        const killsNum = parseInt(String(profileData.kills).replace(/,/g, ''));
        if (!isNaN(killsNum)) {
          updateData.kills = killsNum;
          console.log(`[Sync] Updating kills to: ${killsNum}`);
        }
      }
      
      // Update display_name with properly capitalized name from RuneMetrics
      // RuneMetrics API returns the name with proper capitalization
      if (profileData.name) {
        updateData.display_name = profileData.name;
        console.log(`[Sync] Updating display_name to: "${profileData.name}"`);
      } else {
        console.warn(`[Sync] No name returned from RuneMetrics for member: "${member.name}"`);
      }
      
      await MemberModel.update(memberId, updateData);
      
      // Track most recent activity date
      let mostRecentActivityDate = null;
      
      if (profileData.activities && Array.isArray(profileData.activities)) {
        console.log(`[Sync] Found ${profileData.activities.length} activities`);
        let newActivitiesCount = 0;
        
        for (const activity of profileData.activities) {
          try {
            const result = await ActivityModel.create(
              memberId,
              activity.date,
              activity.text,
              activity.details
            );
            
            if (result) {
              newActivitiesCount++;
            }
            
            // Track the most recent activity timestamp
            if (!mostRecentActivityDate || activity.date > mostRecentActivityDate) {
              mostRecentActivityDate = activity.date;
            }
          } catch (error) {
            // Ignore duplicate activity errors
            if (!error.message.includes('UNIQUE constraint')) {
              console.error(`[Sync] Failed to save activity for ${member.name}: ${error.message}`);
            }
          }
        }
        
        if (newActivitiesCount > 0) {
          console.log(`[Sync] Saved ${newActivitiesCount} new activities`);
        }
        
        // Update last_activity_date with the most recent activity
        if (mostRecentActivityDate) {
          // Convert millisecond timestamp to ISO date string for PostgreSQL
          const activityDateISO = new Date(mostRecentActivityDate).toISOString();
          await db.runAsync(
            'UPDATE members SET last_activity_date = ? WHERE id = ?',
            [activityDateISO, memberId]
          );
        }
      } else {
        console.log(`[Sync] No new activities found`);
      }
    } catch (activityError) {
      console.error(`[Sync] Failed to fetch activities: ${activityError.message}`);
    }

    // ONLY update last_xp_gain and last_activity_date if the sum of individual skill gains is positive
    if (totalXpDelta > 0) {
      await db.runAsync(
        'UPDATE members SET last_xp_gain = CURRENT_TIMESTAMP, last_activity_date = CURRENT_TIMESTAMP WHERE id = ?',
        [memberId]
      );
    }

    await SyncLogModel.create(memberId, true);

    console.log(`[Sync] Successfully synced ${member.display_name || member.name}`);

    return {
      success: true,
      member: member.name,
      activities: (profileData && profileData.activities) ? profileData.activities.length : 0,
      xpGained: totalXpDelta,
      skillsChanged: skillsWithGains.length
    };
  } catch (error) {
    console.error(`[Sync] Failed to sync ${member.name}: ${error.message}`);
    await SyncLogModel.create(memberId, false, error.message);
    throw error;
  }
}

/**
 * Start async sync of all members (non-blocking)
 * @returns {Promise<{syncId: string, total: number}>}
 */
async function startSyncAllMembers() {
  const members = await MemberModel.getAll(true);
  const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`\n========================================`);
  console.log(`[Bulk Sync] Starting bulk sync`);
  console.log(`[Bulk Sync] Sync ID: ${syncId}`);
  console.log(`[Bulk Sync] Total members: ${members.length}`);
  console.log(`========================================\n`);
  
  const progress = {
    syncId,
    status: 'running',
    total: members.length,
    processed: 0,
    successful: 0,
    failed: 0,
    rateLimited: 0,
    errors: [],
    startTime: new Date().toISOString(),
    endTime: null
  };
  
  syncProgress.set(syncId, progress);

  // Run sync in background
  (async () => {
    const promises = members.map(member =>
      syncMember(member.id)
        .then(() => {
          progress.successful++;
          console.log(`[Bulk Sync] Progress: ${progress.processed + 1}/${progress.total} (Success: ${progress.successful}, Failed: ${progress.failed})`);
        })
        .catch(error => {
          progress.failed++;
          progress.errors.push({
            member: member.name,
            error: error.message
          });
          console.log(`[Bulk Sync] Progress: ${progress.processed + 1}/${progress.total} (Success: ${progress.successful}, Failed: ${progress.failed})`);
        })
        .finally(() => {
          progress.processed++;
        })
    );

    await Promise.all(promises);
    
    progress.status = 'completed';
    progress.endTime = new Date().toISOString();
    
    console.log(`\n========================================`);
    console.log(`[Bulk Sync] Completed`);
    console.log(`[Bulk Sync] Sync ID: ${syncId}`);
    console.log(`[Bulk Sync] Successful: ${progress.successful}/${progress.total}`);
    console.log(`[Bulk Sync] Failed: ${progress.failed}/${progress.total}`);
    console.log(`[Bulk Sync] Duration: ${Math.round((new Date(progress.endTime) - new Date(progress.startTime)) / 1000)}s`);
    console.log(`========================================\n`);
    
    // Clean up after 1 hour
    setTimeout(() => {
      syncProgress.delete(syncId);
    }, 3600000);
  })();

  return {
    syncId,
    total: members.length,
    message: 'Sync started in background'
  };
}

/**
 * Start async sync of unsynced members (non-blocking)
 * @returns {Promise<{syncId: string, total: number}>}
 */
async function startSyncUnsyncedMembers() {
  const members = await MemberModel.getUnsynced(true);
  if (members.length === 0) {
    return {
      syncId: null,
      total: 0,
      message: 'No unsynced members to sync'
    };
  }

  const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const progress = {
    syncId,
    status: 'running',
    total: members.length,
    processed: 0,
    successful: 0,
    failed: 0,
    rateLimited: 0,
    errors: [],
    startTime: new Date().toISOString(),
    endTime: null
  };
  
  syncProgress.set(syncId, progress);

  // Run sync in background
  (async () => {
    const promises = members.map(member =>
      syncMember(member.id)
        .then(() => {
          progress.successful++;
        })
        .catch(error => {
          progress.failed++;
          progress.errors.push({
            member: member.name,
            error: error.message
          });
        })
        .finally(() => {
          progress.processed++;
        })
    );

    await Promise.all(promises);
    
    progress.status = 'completed';
    progress.endTime = new Date().toISOString();
    
    // Clean up after 1 hour
    setTimeout(() => {
      syncProgress.delete(syncId);
    }, 3600000);
  })();

  return {
    syncId,
    total: members.length,
    message: 'Sync for unsynced members started in background'
  };
}

/**
 * Get sync progress by ID
 * @param {string} syncId 
 * @returns {Object|null}
 */
function getSyncProgress(syncId) {
  return syncProgress.get(syncId) || null;
}

/**
 * Get all active syncs
 * @returns {Array}
 */
function getAllSyncProgress() {
  return Array.from(syncProgress.values());
}

/**
 * Legacy sync all members (blocking - kept for compatibility)
 * @returns {Promise<Object>}
 */
async function syncAllMembers() {
  const members = await MemberModel.getAll(true);
  const results = {
    total: members.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  for (const member of members) {
    try {
      await syncMember(member.id);
      results.successful++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.failed++;
      results.errors.push({
        member: member.name,
        error: error.message
      });
    }
  }

  return results;
}

async function getMemberStats(memberId, period = 'weekly') {
  const member = await MemberModel.findById(memberId);
  if (!member) {
    throw new Error(`Member with ID ${memberId} not found`);
  }

  const snapshots = await SnapshotModel.getByMember(memberId, 1000);
  const skills = await SkillModel.getByMember(memberId);

  // Add xp_gain field based on period for frontend compatibility
  // Convert BIGINT strings to numbers (PostgreSQL returns BIGINT as strings)
  const enrichedSkills = skills.map(skill => ({
    ...skill,
    level: parseInt(skill.level) || 0,
    xp: parseInt(skill.xp) || 0,
    rank: parseInt(skill.rank) || null,
    daily_xp_gain: parseInt(skill.daily_xp_gain) || 0,
    weekly_xp_gain: parseInt(skill.weekly_xp_gain) || 0,
    xp_gain: period === 'daily' ? (parseInt(skill.daily_xp_gain) || 0) : (parseInt(skill.weekly_xp_gain) || 0)
  }));

  const xpGains = {
    daily: skills.reduce((acc, s) => acc + (parseInt(s.daily_xp_gain) || 0), 0),
    weekly: skills.reduce((acc, s) => acc + (parseInt(s.weekly_xp_gain) || 0), 0)
  };

  return {
    member,
    skills: enrichedSkills,
    xpGains,
    snapshotCount: snapshots.length,
    lastSnapshot: snapshots[0] || null
  };
}

module.exports = {
  syncMember,
  syncAllMembers,
  startSyncAllMembers,
  startSyncUnsyncedMembers,
  getSyncProgress,
  getAllSyncProgress,
  getMemberStats
};

