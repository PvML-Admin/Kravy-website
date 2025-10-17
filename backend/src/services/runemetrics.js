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

      return response.data;
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

