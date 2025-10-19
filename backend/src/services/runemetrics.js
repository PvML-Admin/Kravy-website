const axios = require('axios');
const { runemetricsRateLimiter } = require('../utils/apiRateLimiters');

const RUNEMETRICS_BASE_URL = 'https://apps.runescape.com/runemetrics';

const SKILLS = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer',
  'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking',
  'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving',
  'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Summoning', 'Dungeoneering', 'Divination', 'Invention', 'Archaeology', 'Necromancy'
];

function parseRuneMetricsDate(dateString) {
  // The date format from the API is "DD-Mon-YYYY HH:mm"
  // e.g., "18-Oct-2025 16:20"
  // new Date() can parse "18 Oct 2025 16:20", so we just replace the hyphens
  const parsableDateString = dateString.replace(/-/g, ' ');
  const date = new Date(parsableDateString);
  // Return as a Unix timestamp in milliseconds, which is what the DB expects
  return date.getTime();
}

/**
 * Fetch a player's profile from the official RuneMetrics API
 */
async function fetchPlayerProfile(username, activities = 20) {
  return runemetricsRateLimiter.execute(async () => {
    try {
      const response = await axios.get(`${RUNEMETRICS_BASE_URL}/profile/profile`, {
        params: {
          user: username,
          activities: activities
        },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const profileData = response.data;

      // Log all available fields for debugging
      console.log(`[RuneMetrics] Available fields for ${username}:`, Object.keys(profileData).join(', '));

      const parsedActivities = profileData.activities ? profileData.activities.map(a => ({
        date: parseRuneMetricsDate(a.date),
        text: a.text,
        details: a.details,
      })) : [];

      return {
        name: profileData.name,
        rank: profileData.rank,
        totalSkill: profileData.totalskill,
        totalXp: profileData.totalxp,
        combatLevel: profileData.combatlevel || 0,
        clanXp: profileData.loggedIn || 0, // Try loggedIn field
        kills: profileData.totalskill || 0, // Placeholder - need to find correct field
        activities: parsedActivities,
      };
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error(`Player '${username}' not found`);
        }
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  });
}

function parsePlayerData(profileData) {
  const parsed = {
    name: profileData.name,
    combatLevel: profileData.combatlevel || 0,
    totalXp: profileData.totalxp || 0,
    totalLevel: profileData.totalskill || 0,
    rank: profileData.rank || null,
    skills: [],
    activities: []
  };

  if (profileData.skillvalues && Array.isArray(profileData.skillvalues)) {
    profileData.skillvalues.forEach((skill, index) => {
      if (index < SKILLS.length) {
        parsed.skills.push({
          id: skill.id || index,
          name: SKILLS[index],
          level: skill.level || 1,
          xp: Math.floor(skill.xp / 10) || 0,
          rank: skill.rank || null
        });
      }
    });
  }

  // Parse activities from RuneMetrics
  if (profileData.activities && Array.isArray(profileData.activities)) {
    parsed.activities = profileData.activities.map(activity => ({
      date: activity.date,
      details: activity.details,
      text: activity.text
    }));
  }

  return parsed;
}

async function getPlayerStats(username) {
  const profileData = await fetchPlayerProfile(username);
  return parsePlayerData(profileData);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function batchFetchPlayers(usernames, delayMs = 1000) {
  const results = [];
  const errors = [];

  for (const username of usernames) {
    try {
      const stats = await getPlayerStats(username);
      results.push({ username, success: true, data: stats });
      await delay(delayMs);
    } catch (error) {
      errors.push({ username, success: false, error: error.message });
      await delay(delayMs);
    }
  }

  return { results, errors };
}

module.exports = {
  fetchPlayerProfile,
  parsePlayerData,
  getPlayerStats,
  batchFetchPlayers,
  SKILLS
};

