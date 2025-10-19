const express = require('express');
const router = express.Router();
const twitterService = require('../services/twitterService');

/**
 * GET /api/twitter/recent-tweets
 * Fetch recent tweets from the clan's Twitter account
 * Query params:
 *   - limit: Number of tweets to fetch (default: 5, max: 10)
 */
router.get('/recent-tweets', async (req, res) => {
  try {
    // Check if Twitter is configured
    if (!twitterService.isConfigured()) {
      return res.json({
        success: true,
        count: 0,
        tweets: [],
        message: 'Twitter feed is not configured'
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    
    const tweets = await twitterService.getRecentTweets(limit);

    res.json({
      success: true,
      count: tweets.length,
      tweets: tweets
    });

  } catch (error) {
    console.error('Error in /recent-tweets endpoint:', error);
    
    // Return empty tweets instead of error - graceful degradation
    res.json({
      success: true,
      count: 0,
      tweets: [],
      message: 'Unable to fetch tweets at this time'
    });
  }
});

/**
 * GET /api/twitter/status
 * Check if Twitter API is configured and working
 */
router.get('/status', async (req, res) => {
  const isConfigured = twitterService.isConfigured();
  
  res.json({
    success: true,
    configured: isConfigured,
    username: isConfigured ? process.env.TWITTER_USERNAME : null
  });
});

/**
 * POST /api/twitter/clear-cache
 * Clear the tweet cache (useful for testing)
 */
router.post('/clear-cache', (req, res) => {
  twitterService.clearCache();
  res.json({
    success: true,
    message: 'Tweet cache cleared'
  });
});

module.exports = router;

