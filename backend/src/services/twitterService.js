const { TwitterApi } = require('twitter-api-v2');

// Initialize Twitter client
const initTwitterClient = () => {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.warn('Twitter API credentials not fully configured. Twitter feed will be unavailable.');
    return null;
  }

  try {
    return new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });
  } catch (error) {
    console.error('Failed to initialize Twitter client:', error.message);
    return null;
  }
};

const client = initTwitterClient();
const fs = require('fs');
const path = require('path');

// Cache file path
const CACHE_FILE = path.join(__dirname, '../../.twitter-cache.json');

// Load cache from file on startup
let tweetCache = loadCacheFromFile();

const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes (1 hour) - Free tier has only 1 request limit

/**
 * Load cache from file
 */
function loadCacheFromFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      console.log('✓ Loaded Twitter cache from file');
      return cache;
    }
  } catch (error) {
    console.log('Could not load Twitter cache file:', error.message);
  }
  return { data: null, timestamp: 0 };
}

/**
 * Save cache to file
 */
function saveCacheToFile(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.error('Could not save Twitter cache to file:', error.message);
  }
}

/**
 * Get recent tweets from the configured Twitter account
 * @param {number} limit - Number of tweets to fetch (default: 5)
 * @returns {Promise<Array>} Array of formatted tweet objects
 */
async function getRecentTweets(limit = 5) {
  // Check if Twitter client is initialized
  if (!client) {
    console.warn('Twitter API not configured');
    return tweetCache.data || [];
  }

  // Check cache - return immediately if valid
  const now = Date.now();
  if (tweetCache.data && (now - tweetCache.timestamp) < CACHE_DURATION) {
    console.log(`Returning cached tweets (age: ${Math.floor((now - tweetCache.timestamp) / 60000)} minutes)`);
    return tweetCache.data;
  }

  // If cache exists but expired, return it first and try to refresh in background
  const hasCachedData = tweetCache.data !== null;
  if (hasCachedData) {
    console.log('Returning stale cache while attempting refresh...');
    // Return cached data immediately
    const cachedData = tweetCache.data;
    
    // Try to refresh in background (don't await)
    refreshTweetsInBackground(limit).catch(err => {
      console.log('Background refresh failed, will retry later:', err.message);
    });
    
    return cachedData;
  }

  // No cache exists, try to fetch (first time only)
  console.log('No cache exists, attempting first fetch...');
  try {
    const tweets = await fetchTweetsFromAPI(limit);
    return tweets;
  } catch (error) {
    console.error('Initial tweet fetch failed:', error.message);
    // Return empty array on first load failure
    return [];
  }
}

/**
 * Fetch tweets from Twitter API
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function fetchTweetsFromAPI(limit = 5) {
  const username = process.env.TWITTER_USERNAME;
  
  if (!username) {
    throw new Error('TWITTER_USERNAME not configured');
  }

  // Get user ID from username
  const user = await client.v2.userByUsername(username);
  
  if (!user.data) {
    throw new Error(`Twitter user @${username} not found`);
  }

  const userId = user.data.id;

  // Fetch user's tweets with expansions for media and metrics
  const tweets = await client.v2.userTimeline(userId, {
    max_results: Math.min(limit, 10), // Twitter allows max 100, but we cap at 10 for UI
    exclude: ['retweets', 'replies'], // Only get original tweets
    'tweet.fields': ['created_at', 'public_metrics', 'entities'],
    'media.fields': ['url', 'preview_image_url'],
    expansions: ['attachments.media_keys']
  });

  // Format tweets for frontend
  const formattedTweets = tweets.data.data.map(tweet => {
    return {
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      url: `https://twitter.com/${username}/status/${tweet.id}`,
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0
      }
    };
  });

  // Update cache
  const now = Date.now();
  tweetCache = {
    data: formattedTweets,
    timestamp: now
  };

  // Persist cache to file
  saveCacheToFile(tweetCache);

  console.log(`✓ Fetched ${formattedTweets.length} fresh tweets from @${username}`);
  return formattedTweets;
}

/**
 * Refresh tweets in background without blocking
 * @param {number} limit 
 */
async function refreshTweetsInBackground(limit = 5) {
  try {
    await fetchTweetsFromAPI(limit);
  } catch (error) {
    // Silently fail on rate limits or errors - we already have cached data
    if (error.code === 429) {
      console.log('Rate limited during background refresh - will retry later');
    } else {
      console.log('Background refresh error:', error.message);
    }
    throw error; // Re-throw so caller knows it failed
  }
}

/**
 * Clear the tweet cache (useful for testing)
 */
function clearCache() {
  tweetCache = { data: null, timestamp: 0 };
  saveCacheToFile(tweetCache);
  console.log('Tweet cache cleared');
}

/**
 * Check if Twitter API is configured
 * @returns {boolean} True if configured, false otherwise
 */
function isConfigured() {
  return client !== null && !!process.env.TWITTER_USERNAME;
}

/**
 * Get Twitter API status and cache information
 * @returns {Object} Status object with configuration and cache info
 */
function getTwitterStatus() {
  return {
    configured: isConfigured(),
    cache: {
      has_data: tweetCache.data !== null,
      tweets_count: tweetCache.data ? tweetCache.data.length : 0,
      age_minutes: tweetCache.timestamp > 0 
        ? Math.floor((Date.now() - tweetCache.timestamp) / (1000 * 60))
        : 0
    }
  };
}

/**
 * Alias for clearCache for backward compatibility
 */
function clearTwitterCache() {
  clearCache();
}

// Try to fetch tweets on startup if cache is empty or old (non-blocking)
setImmediate(() => {
  if (client && (!tweetCache.data || (Date.now() - tweetCache.timestamp) > CACHE_DURATION)) {
    console.log('Attempting to pre-load tweets on startup...');
    fetchTweetsFromAPI(5)
      .then(() => console.log('✓ Tweets pre-loaded successfully'))
      .catch(err => console.log('Could not pre-load tweets:', err.message));
  } else if (tweetCache.data) {
    console.log(`✓ Using cached tweets (age: ${Math.floor((Date.now() - tweetCache.timestamp) / 60000)} minutes)`);
  }
});

module.exports = {
  getRecentTweets,
  clearCache,
  clearTwitterCache,
  isConfigured,
  getTwitterStatus
};

