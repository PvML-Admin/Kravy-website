import { getSkillIcon, skillOrder } from './skills';

// Import custom icons
import bossKillsIcon from '../assets/icons/boss_kills.png';
import bossLootIcon from '../assets/icons/boss_loot.png';
import clueScrollsIcon from '../assets/icons/clue_scrolls.png';
import questsIcon from '../assets/icons/quests.png';
import citadelIcon from '../assets/icons/citadel.png';
import miscIcon from '../assets/icons/misc.png';

const categoryIcons = {
  'Boss Kills': bossKillsIcon,
  'Boss Loot': bossLootIcon,
  'Clue Scrolls': clueScrollsIcon,
  'Quests': questsIcon,
  'Citadel': citadelIcon,
  'Misc': miscIcon
};

// Helper to find which skill is mentioned in an activity text
function findSkillName(text) {
  // Find the first skill from our list that is present in the activity text.
  // We check against skillOrder but skip 'Overall'.
  return skillOrder.slice(1).find(skill => text.includes(skill)) || null;
}

export function getActivityIcon(activity) {
  if (activity.category === 'Skills') {
    const text = activity.details || activity.text;
    const skillName = findSkillName(text);
    
    if (skillName) {
      return getSkillIcon(skillName);
    }
    return getSkillIcon('Overall'); // Fallback if no specific skill is found
  }

  return categoryIcons[activity.category] || miscIcon;
}
