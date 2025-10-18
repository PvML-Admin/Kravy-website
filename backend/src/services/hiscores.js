const axios = require('axios');
const { hiscoresRateLimiter } = require('../utils/apiRateLimiters');
const { getSkillMaxLevel } = require('../utils/skillLevels');

const HISCORES_URL = 'https://secure.runescape.com/m=hiscore/index_lite.ws';

// Skill order from RuneScape HiScores (index_lite.ws)
// This is the EXACT order the API returns them in
const HISCORES_SKILLS = [
  'Overall',
  'Attack',
  'Defence',
  'Strength',
  'Constitution',
  'Ranged',
  'Prayer',
  'Magic',
  'Cooking',
  'Woodcutting',
  'Fletching',
  'Fishing',
  'Firemaking',
  'Crafting',
  'Smithing',
  'Mining',
  'Herblore',
  'Agility',
  'Thieving',
  'Slayer',
  'Farming',
  'Runecrafting',
  'Hunter',
  'Construction',
  'Summoning',
  'Dungeoneering',
  'Divination',
  'Invention',
  'Archaeology',
  'Necromancy'
];

/**
 * Fetch player data from RuneScape HiScores
 * Returns actual levels, ranks, and XP directly from Jagex
 */
async function fetchPlayerFromHiscores(username) {
  return hiscoresRateLimiter.execute(async () => {
    try {
      const response = await axios.get(HISCORES_URL, {
        params: { player: username },
        timeout: 10000
      });

      const lines = response.data.trim().split('\n');
      const skills = [];

      // Each line is: rank,level,xp
      for (let i = 0; i < lines.length && i < HISCORES_SKILLS.length; i++) {
        const parts = lines[i].split(',');
        
        if (parts.length === 3) {
          const skillName = HISCORES_SKILLS[i];
          const rank = parseInt(parts[0]) || null;
          const virtualLevel = parseInt(parts[1]) || 1;
          const xp = parseInt(parts[2]) || 0;

          skills.push({
            id: i,
            name: skillName,
            rank: rank === -1 ? null : rank, // -1 means unranked
            level: virtualLevel,
            xp: xp
          });
        }
      }

      // Overall is the first entry
      const overall = skills[0];

      return {
        name: username,
        skills: skills.slice(1), // Remove Overall from skills array
        totalLevel: overall ? overall.level : 0,
        totalXp: overall ? overall.xp : 0,
        totalRank: overall ? overall.rank : null
      };

    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`Player '${username}' not found on HiScores`);
      }
      throw new Error(`HiScores API error: ${error.message}`);
    }
  });
}

/**
 * Get combat level from stats
 */
function calculateCombatLevel(skills) {
  const getSkillLevel = (name) => {
    const skill = skills.find(s => s.name === name);
    return skill ? skill.level : 1;
  };

  const attack = getSkillLevel('Attack');
  const strength = getSkillLevel('Strength');
  const defence = getSkillLevel('Defence');
  const constitution = getSkillLevel('Constitution');
  const ranged = getSkillLevel('Ranged');
  const prayer = getSkillLevel('Prayer');
  const magic = getSkillLevel('Magic');
  const summoning = getSkillLevel('Summoning');

  // RS3 combat formula
  const base = (13 / 10) * Math.max(
    (attack + strength),
    (magic * 2),
    (ranged * 2)
  );

  const melee = base + defence + constitution;
  let combatLevel = Math.floor((melee + prayer + summoning) / 4);

  // Cap combat level at 152
  if (combatLevel > 152) {
    combatLevel = 152;
  }

  return combatLevel;
}

module.exports = {
  fetchPlayerFromHiscores,
  calculateCombatLevel,
  HISCORES_SKILLS
};

