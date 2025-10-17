const express = require('express');
const router = express.Router();
const { ClanEventModel } = require('../database/models');

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
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

module.exports = router;

