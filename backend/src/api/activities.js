const express = require('express');
const router = express.Router();
const { ActivityModel, MemberModel } = require('../database/models');
const { categorizeActivity } = require('../utils/activityCategorizer');
const { getMemberActivities } = require('../services/activityService');

/**
 * Get recent clan activities from RuneMetrics
 */
router.get('/clan', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await ActivityModel.getRecent(limit);

    const categorizedActivities = activities.map(activity => ({
      ...activity,
      category: activity.category || categorizeActivity(activity.text, activity.details || '')
    }));

    res.json({
      success: true,
      count: categorizedActivities.length,
      activities: categorizedActivities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get activities for a specific member
 */
router.get('/member/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const activities = await getMemberActivities(name);

    res.json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


