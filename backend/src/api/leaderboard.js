const express = require('express');
const router = express.Router();
const { getLeaderboard, getTopGainers, getClanStats } = require('../services/leaderboardService');

router.get('/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Use: daily, weekly, or monthly'
      });
    }

    const leaderboard = await getLeaderboard(period, limit);

    res.json({
      success: true,
      period,
      count: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/top/gainers', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const topGainers = await getTopGainers(count);

    res.json({
      success: true,
      topGainers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/clan/stats', async (req, res) => {
  try {
    const stats = await getClanStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

