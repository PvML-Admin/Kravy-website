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
  PETS: 'Pets',
  MISC: 'Misc'
};

function categorizeActivity(text, details) {
  const fullText = `${text} ${details}`.toLowerCase();

  // More specific checks must come first to avoid incorrect categorization.

  // Pets - check before drops since pets can have "found" in the text
  if (fullText.includes('pet') || fullText.includes('has grown') || fullText.includes('is now a')) {
    return CATEGORIES.PETS;
  }

  // Boss Loot / Drops
  if (fullText.includes('i found a') || fullText.includes('i received a drop:')) {
    return CATEGORIES.BOSS_LOOT;
  }

  // Boss Kills
  if (fullText.startsWith('i killed') || fullText.includes('defeated')) {
    return CATEGORIES.BOSS_KILLS;
  }

  // Skill-related XP gains
  if (fullText.includes('xp in')) {
    return CATEGORIES.SKILLS;
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
  if (fullText.includes('clan citadel') || fullText.includes('citadel')) {
    return CATEGORIES.CITADEL;
  }

  // Fallback for other skill-related messages that aren't direct XP gains
  if (SKILLS.some(skill => fullText.includes(skill.toLowerCase()))) {
    return CATEGORIES.SKILLS;
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
