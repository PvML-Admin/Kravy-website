import { getSkillIcon } from './skills';

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

export function getActivityIcon(activity) {
  if (activity.category === 'Skills') {
    const text = activity.details || activity.text;
    const skillMatch = text.match(/(\d+) XP in (\w+)/);
    if (skillMatch && skillMatch[2]) {
      return getSkillIcon(skillMatch[2]);
    }
    return getSkillIcon('Overall'); // Fallback for skills
  }

  return categoryIcons[activity.category] || miscIcon;
}
