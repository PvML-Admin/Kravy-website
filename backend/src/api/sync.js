const express = require('express');
const router = express.Router();
const { 
  syncAllMembers, 
  syncMember, 
  startSyncAllMembers,
  startSyncUnsyncedMembers,
  getSyncProgress,
  getAllSyncProgress
} = require('../services/syncService');
const { SyncLogModel } = require('../database/models');

// Start async sync (non-blocking)
router.post('/all/async', async (req, res) => {
  try {
    const result = await startSyncAllMembers();

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start async sync for unsynced members
router.post('/unsynced/async', async (req, res) => {
  try {
    const result = await startSyncUnsyncedMembers();

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync progress
router.get('/progress/:syncId', async (req, res) => {
  try {
    const { syncId } = req.params;
    const progress = getSyncProgress(syncId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Sync not found or expired'
      });
    }

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

// Get all active syncs
router.get('/progress', async (req, res) => {
  try {
    const allProgress = getAllSyncProgress();

    res.json({
      success: true,
      syncs: allProgress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy blocking sync (kept for compatibility)
router.post('/all', async (req, res) => {
  try {
    const results = await syncAllMembers();

    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/member/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await syncMember(parseInt(id));

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
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

module.exports = router;

