// A simple parser to categorize activities based on keywords in their text.

function parseActivityCategory(text) {
  const lowerText = text.toLowerCase();

  // Check for Pets FIRST (before checking for "found a" to avoid miscategorization)
  if (
    lowerText.includes('pet') ||
    lowerText.includes('grew to a') ||
    lowerText.includes('is now a')
  ) {
    return 'Pets';
  }

  // Skills & XP Milestones
  if (
    lowerText.includes('xp in ') ||
    lowerText.includes('levelled up') ||
    lowerText.includes('leveled up') ||
    lowerText.includes('experience points in') ||
    lowerText.includes('reached level')
  ) {
    return 'Skills';
  }

  // Boss Kills (separate from item drops)
  if (
    lowerText.includes('i killed') ||
    lowerText.includes('defeated')
  ) {
    return 'Achievement';
  }

  // Item Drops
  if (
    lowerText.includes('found a') ||
    lowerText.includes('received a') ||
    lowerText.includes('looted a')
  ) {
    return 'Drops';
  }

  // Quests and Milestones
  if (
    lowerText.includes('quest complete') ||
    lowerText.includes('completed the') ||
    lowerText.includes('unlocked') ||
    lowerText.includes('quest points obtained')
  ) {
    return 'Achievement';
  }
  
  // Default category if none of the above match
  return 'Achievement';
}

module.exports = { parseActivityCategory };

