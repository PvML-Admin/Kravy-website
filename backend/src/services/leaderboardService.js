const { MemberModel } = require('../database/models');
const { fetchClanStats } = require('./clanService');
const db = require('../config/database');

async function getLeaderboard(period = 'weekly', limit = 50) {
  let gainField;
  switch (period) {
    case 'daily':
      gainField = 's.daily_xp_gain';
      break;
    case 'weekly':
      gainField = 's.weekly_xp_gain';
      break;
    default:
      // For monthly or other periods, we might fall back to snapshots or just return empty for now.
      // Let's stick to daily/weekly as requested.
      return [];
  }

  const query = `
    SELECT
      m.id,
      m.display_name as name,
      m.total_xp as totalXp,
      SUM(${gainField}) as xpGain,
      m.combat_level as combatLevel,
      m.last_synced as lastSynced
    FROM members m
    JOIN skills s ON m.id = s.member_id
    WHERE ${gainField} > 0 AND m.is_active = 1
    GROUP BY m.id
    ORDER BY xpGain DESC
    LIMIT ?;
  `;

  const leaderboard = await db.allAsync(query, [limit]);
  return leaderboard;
}

async function getTopGainers(count = 10) {
  return {
    daily: await getLeaderboard('daily', count),
    weekly: await getLeaderboard('weekly', count)
  };
}

async function getClanStats() {
  try {
    // Fetch official stats first
    const officialStats = await fetchClanStats('Kravy');

    // Then calculate local stats
    const members = await MemberModel.getAll(true);
    let totalCombatLevel = 0;
    let activeMembersCount = 0;

    for (const member of members) {
      if (member.last_synced) {
        totalCombatLevel += member.combat_level || 0;
        activeMembersCount++;
      }
    }

    return {
      totalMembers: officialStats.totalMembers,
      totalXp: officialStats.totalXp,
      averageCombatLevel: activeMembersCount > 0 ? Math.floor(totalCombatLevel / activeMembersCount) : 0,
    };
  } catch (error) {
    console.error('Failed to get combined clan stats:', error.message);
    // Fallback to old method if scraping fails
    const members = await MemberModel.getAll(true);
    
    let totalClanXp = 0;
    let totalCombatLevel = 0;
    let activeMembersCount = 0;

    for (const member of members) {
      if (member.last_synced) {
        totalClanXp += member.clan_xp || 0;
        totalCombatLevel += member.combat_level || 0;
        activeMembersCount++;
      }
    }

    return {
      totalMembers: members.length,
      totalXp: totalClanXp, // Use totalXp to match the frontend expectation now
      averageCombatLevel: activeMembersCount > 0 ? Math.floor(totalCombatLevel / activeMembersCount) : 0,
    };
  }
}

module.exports = {
  getLeaderboard,
  getTopGainers,
  getClanStats
};

