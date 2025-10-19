const SKILLS = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer',
  'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking',
  'Crafting', 'Smithing', 'Mining', 'Herlore', 'Agility', 'Thieving',
  'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Summoning', 'Dungeoneering', 'Divination', 'Invention', 'Archaeology', 'Necromancy'
];

const CATEGORIES = {
  BOSS_KILLS: 'Boss Kills',
  BOSS_LOOT: 'Boss Loot',
  CLUE_SCROLLS: 'Clue Scrolls',
  SKILLS: 'Skills',
  QUESTS: 'Quests',
  CITADEL: 'Citadel',
  MISC: 'Misc'
};

function categorizeActivity(text, details) {
  const fullText = `${text} ${details}`.toLowerCase();

  // Skill-related
  if (SKILLS.some(skill => fullText.includes(skill.toLowerCase()))) {
    return CATEGORIES.SKILLS;
  }
  if (fullText.includes('xp in')) {
    return CATEGORIES.SKILLS;
  }

  // Boss Kills
  if (fullText.startsWith('i killed')) {
    return CATEGORIES.BOSS_KILLS;
  }
  
  // Boss Loot / Drops
  if (fullText.includes('i found a') || fullText.includes('i received a drop:')) {
    return CATEGORIES.BOSS_LOOT;
  }

  // Clue Scrolls
  if (fullText.includes('treasure trail')) {
    return CATEGORIES.CLUE_SCROLLS;
  }

  // Quests & Misc Achievements
  if (fullText.startsWith('i completed the quest') || fullText.includes('milestone')) {
    return CATEGORIES.QUESTS;
  }

  // Citadel
  if (fullText.includes('clan citadel')) {
    return CATEGORIES.CITADEL;
  }

  return CATEGORIES.MISC;
}

function getSkillFromActivity(text) {
  if (!text.includes('XP in')) return null;
  
  const skill = SKILLS.find(s => text.includes(s));
  return skill || null;
}

module.exports = {
  categorizeActivity,
  getSkillFromActivity,
  CATEGORIES
};
