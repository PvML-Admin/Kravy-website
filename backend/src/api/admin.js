const express = require('express');
const router = express.Router();
const { MemberModel, SyncLogModel, ClanEventModel } = require('../database/models');
const { isAdmin } = require('../middleware/auth');
const { getAllSyncProgress } = require('../services/syncService');
const db = require('../config/database');

// All admin routes require authentication
router.use(isAdmin);

// Get dashboard overview stats
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Member stats
    const allMembers = await MemberModel.getAll(false);
    const activeMembers = allMembers.filter(m => m.active);
    stats.totalMembers = allMembers.length;
    stats.activeMembers = activeMembers.length;
    stats.inactiveMembers = allMembers.length - activeMembers.length;

    // Activity stats (members with activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    stats.recentlyActive = allMembers.filter(m => 
      m.last_activity_date && new Date(m.last_activity_date) > sevenDaysAgo
    ).length;

    // Sync stats
    const syncProgress = getAllSyncProgress();
    stats.syncStatus = syncProgress;

    // Recent sync logs
    const recentSyncs = await SyncLogModel.getRecent(10);
    stats.recentSyncs = recentSyncs.map(log => ({
      ...log,
      status: log.success ? 'success' : 'failed'
    }));

    // Database stats
    const dbStats = await db.getAsync(`
      SELECT 
        (SELECT COUNT(*) FROM members) as member_count,
        (SELECT COUNT(*) FROM activities) as activity_count,
        (SELECT COUNT(*) FROM xp_snapshots) as snapshot_count,
        (SELECT COUNT(*) FROM clan_events) as event_count
    `);
    stats.database = dbStats;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync progress
router.get('/sync/progress', async (req, res) => {
  try {
    const progress = getAllSyncProgress();
    res.json({
      success: true,
      progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent sync logs
router.get('/sync/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await SyncLogModel.getRecent(limit);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear daily XP gains
router.post('/data/clear-daily-xp', async (req, res) => {
  try {
    await db.runAsync('UPDATE skills SET daily_xp_gain = 0');
    
    res.json({
      success: true,
      message: 'Daily XP gains cleared for all skills'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear weekly XP gains
router.post('/data/clear-weekly-xp', async (req, res) => {
  try {
    await db.runAsync('UPDATE skills SET weekly_xp_gain = 0');
    
    res.json({
      success: true,
      message: 'Weekly XP gains cleared for all skills'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get inactive members
router.get('/members/inactive', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const members = await MemberModel.getAll(false);
    const inactiveMembers = members.filter(m => {
      if (!m.last_activity_date) return true;
      return new Date(m.last_activity_date) < cutoffDate;
    });
    
    res.json({
      success: true,
      count: inactiveMembers.length,
      members: inactiveMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system information
router.get('/system/info', async (req, res) => {
  try {
    console.log('System info endpoint called');
    const info = {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      platform: process.platform,
      configured: {
        twitter: !!(process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET),
        oauth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        database: !!process.env.DATABASE_URL
      }
    };
    
    console.log('System info prepared:', info);
    
    res.json({
      success: true,
      info
    });
  } catch (error) {
    console.error('Error in /system/info endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent clan events
router.get('/events/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const events = await ClanEventModel.getRecent(limit);
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear Twitter cache
router.post('/twitter/clear-cache', async (req, res) => {
  try {
    const twitterService = require('../services/twitterService');
    twitterService.clearTwitterCache();
    
    res.json({
      success: true,
      message: 'Twitter cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Twitter status
router.get('/twitter/status', async (req, res) => {
  try {
    const twitterService = require('../services/twitterService');
    const status = twitterService.getTwitterStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle Master Quest Cape status
router.patch('/members/:id/master-quest-cape', async (req, res) => {
  const { id } = req.params;
  const { hasCape } = req.body;
  try {
    await MemberModel.setMasterQuestCape(parseInt(id), hasCape);
    res.json({
      success: true,
      message: `Master Quest Cape status ${hasCape ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle Completionist Cape status
router.patch('/members/:id/completionist-cape', async (req, res) => {
  const { id } = req.params;
  const { hasCape } = req.body;
  try {
    await MemberModel.setCompletionistCape(parseInt(id), hasCape);
    res.json({
      success: true,
      message: `Completionist Cape status ${hasCape ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle Trimmed Completionist Cape status
router.patch('/members/:id/trimmed-completionist-cape', async (req, res) => {
  const { id } = req.params;
  const { hasCape } = req.body;
  try {
    await MemberModel.setTrimmedCompletionistCape(parseInt(id), hasCape);
    res.json({
      success: true,
      message: `Trimmed Completionist Cape status ${hasCape ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

