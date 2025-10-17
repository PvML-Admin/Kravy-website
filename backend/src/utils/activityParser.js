const PET_KEYWORDS = ['pet', 'nibbler', 'tangleroot', 'giant squirrel', 'heron', 'rock golem', 'beaver', 'chompy'];
const SKILL_KEYWORDS = ['levelled up', '200m xp', 'xp in'];
const ACHIEVEMENT_KEYWORDS = ['quest complete', 'treasure trail', 'achievement diary'];
const DROP_KEYWORDS = ['found', 'received', 'looted', 'i killed'];

function categorizeActivity(text) {
  const lowerText = text.toLowerCase();
  
  if (DROP_KEYWORDS.some(kw => lowerText.includes(kw))) {
    // Make sure it's not a pet
    if (!PET_KEYWORDS.some(kw => lowerText.includes(kw))) {
      return 'Drops';
    }
  }
  if (PET_KEYWORDS.some(kw => lowerText.includes(kw))) return 'Pets';
  if (SKILL_KEYWORDS.some(kw => lowerText.includes(kw))) return 'Skills';
  if (ACHIEVEMENT_KEYWORDS.some(kw => lowerText.includes(kw))) return 'Achievement';
  
  return 'All'; // Default category
}

module.exports = { categorizeActivity };

