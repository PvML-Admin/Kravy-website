const express = require('express');
const router = express.Router();
const leaderboardService = require('../services/leaderboardService');

// Specific routes must come before parameterized routes
router.get('/current-daily-clan-xp', async (req, res) => {
  try {
    const data = await leaderboardService.getCurrentDailyClanXp();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching current daily clan XP:', error);
    res.status(500).json({ error: 'Failed to fetch current daily clan XP' });
  }
});

router.get('/current-weekly-clan-xp', async (req, res) => {
  try {
    const data = await leaderboardService.getCurrentWeeklyClanXp();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching current weekly clan XP:', error);
    res.status(500).json({ error: 'Failed to fetch current weekly clan XP' });
  }
});

router.get('/current-monthly-clan-xp', async (req, res) => {
  try {
    const data = await leaderboardService.getCurrentMonthlyClanXp();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching current monthly clan XP:', error);
    res.status(500).json({ error: 'Failed to fetch current monthly clan XP' });
  }
});

router.get('/daily-clan-xp', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 30;
    const history = await leaderboardService.getDailyClanXpHistory(limit);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching daily clan XP history:', error);
    res.status(500).json({ error: 'Failed to fetch daily clan XP history' });
  }
});

router.get('/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skill = req.query.skill || 'Overall';

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Use: daily, weekly, or monthly'
      });
    }

    const leaderboard = await leaderboardService.getLeaderboard(period, limit, skill);

    res.json({
      success: true,
      period,
      skill,
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
    const topGainers = await leaderboardService.getTopGainers(count);

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
    const stats = await leaderboardService.getClanStats();

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

