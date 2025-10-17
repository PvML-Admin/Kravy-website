export const getSkillIcon = (skillName) => {
  if (skillName === 'Overall') {
    return 'https://cdn.discordapp.com/emojis/632752142113046528.webp?size=96&animated=true';
  }
  const skillIconMap = {
    'Attack': 'Attack_detail',
    'Defence': 'Defence_detail',
    'Strength': 'Strength_detail',
    'Constitution': 'Constitution_detail',
    'Ranged': 'Ranged_detail',
    'Prayer': 'Prayer_detail',
    'Magic': 'Magic_detail',
    'Runecrafting': 'Runecrafting_detail',
    'Construction': 'Construction_detail',
    'Dungeoneering': 'Dungeoneering_detail',
    'Smithing': 'Smithing_detail',
    'Mining': 'Mining_detail',
    'Herblore': 'Herblore_detail',
    'Agility': 'Agility_detail',
    'Thieving': 'Thieving_detail',
    'Farming': 'Farming_detail',
    'Fletching': 'Fletching_detail',
    'Hunter': 'Hunter_detail',
    'Summoning': 'Summoning_detail',
    'Woodcutting': 'Woodcutting_detail',
    'Firemaking': 'Firemaking_detail',
    'Crafting': 'Crafting_detail',
    'Fishing': 'Fishing_detail',
    'Cooking': 'Cooking_detail',
    'Slayer': 'Slayer_detail',
    'Divination': 'Divination_detail',
    'Invention': 'Invention_detail',
    'Archaeology': 'Archaeology_detail',
    'Necromancy': 'Necromancy_detail'
  };
  
  const iconName = skillIconMap[skillName] || `${skillName}_detail`;
  return `https://runescape.wiki/images/thumb/${encodeURIComponent(iconName)}.png/25px-${encodeURIComponent(iconName)}.png`;
};

export const skillOrder = [
  'Overall', 'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer',
  'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking',
  'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving',
  'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Summoning', 'Dungeoneering', 'Divination', 'Invention', 'Archaeology', 'Necromancy'
];
