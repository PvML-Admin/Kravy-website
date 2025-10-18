const { ActivityModel } = require('../database/models');
const { parseActivityCategory } = require('../utils/activityParser');

/**
 * Gets recent in-game activities for clan members from database
 * Activities are populated passively during member syncs
 * @param {number} limit - Number of activities to return
 * @returns {Promise<Array>} Array of activities from database
 */
async function getRecentClanActivities(limit = 100) {
  const activities = await ActivityModel.getRecent(limit);
  return activities.map(activity => ({
    ...activity,
    category: parseActivityCategory(activity.text)
  }));
}

/**
 * Gets activities for a specific member from database
 * @param {string} memberName - Member username
 * @returns {Promise<Array>} Array of activities
 */
async function getMemberActivities(memberName) {
  try {
    const member = await MemberModel.findByName(memberName);
    
    if (!member) {
      return [];
    }

    const activities = await ActivityModel.getByMember(member.id, 50);

    return activities.map(activity => ({
      memberName: member.display_name || member.name,
      date: activity.activity_date,
      details: activity.details,
      text: activity.text,
      timestamp: activity.activity_date
    }));
  } catch (error) {
    console.error(`Failed to fetch activities for ${memberName}:`, error.message);
    throw error;
  }
}

module.exports = {
  getRecentClanActivities,
  getMemberActivities
};

