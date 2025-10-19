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

// Cache file paths
const CACHE_FILE = path.join(__dirname, '../../.twitter-cache.json');
const USER_ID_CACHE_FILE = path.join(__dirname, '../../.twitter-user-id.json');

// Load cache from file on startup
let tweetCache = loadCacheFromFile();

// Cache user ID to avoid extra API calls - persist across restarts
let cachedUserId = loadUserIdFromFile();

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours - Manual refresh available in admin panel

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
 * Load user ID from file
 */
function loadUserIdFromFile() {
  try {
    if (fs.existsSync(USER_ID_CACHE_FILE)) {
      const data = fs.readFileSync(USER_ID_CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      console.log(`✓ Loaded Twitter user ID from cache: ${cache.userId}`);
      return cache.userId;
    }
  } catch (error) {
    console.log('Could not load user ID cache:', error.message);
  }
  return null;
}

/**
 * Save user ID to file
 */
function saveUserIdToFile(userId) {
  try {
    fs.writeFileSync(USER_ID_CACHE_FILE, JSON.stringify({ userId, username: process.env.TWITTER_USERNAME }, null, 2), 'utf8');
    console.log(`✓ Saved Twitter user ID to cache: ${userId}`);
  } catch (error) {
    console.error('Could not save user ID cache:', error.message);
  }
}

/**
 * Get recent tweets from the configured Twitter account
 * @param {number} limit - Number of tweets to fetch (default: 5)
 * @param {boolean} forceRefresh - Force a fresh fetch even if cache is valid
 * @returns {Promise<Array>} Array of formatted tweet objects
 */
async function getRecentTweets(limit = 5, forceRefresh = false) {
  // Check if Twitter client is initialized
  if (!client) {
    console.warn('Twitter API not configured');
    return tweetCache.data || [];
  }

  const now = Date.now();
  const cacheAge = now - tweetCache.timestamp;
  const cacheAgeMinutes = Math.floor(cacheAge / 60000);

  // Force refresh if requested
  if (forceRefresh) {
    console.log('Force refresh requested, fetching fresh tweets...');
    try {
      return await fetchTweetsFromAPI(limit);
    } catch (error) {
      console.error('Force refresh failed:', error.message);
      // Return cached data as fallback
      return tweetCache.data || [];
    }
  }

  // Check cache - return immediately if valid and fresh
  if (tweetCache.data && cacheAge < CACHE_DURATION) {
    console.log(`Returning cached tweets (age: ${cacheAgeMinutes} minutes)`);
    return tweetCache.data;
  }

  // Cache is expired - try to fetch fresh data
  if (tweetCache.data) {
    console.log(`Cache expired (age: ${cacheAgeMinutes} minutes), fetching fresh tweets...`);
  } else {
    console.log('No cache exists, fetching tweets for the first time...');
  }

  try {
    // Try to fetch fresh tweets
    const tweets = await fetchTweetsFromAPI(limit);
    return tweets;
  } catch (error) {
    console.error('Failed to fetch fresh tweets:', error.message);
    
    // If we have cached data, return it as fallback (even if stale)
    if (tweetCache.data) {
      console.log('Returning stale cache as fallback');
      return tweetCache.data;
    }
    
    // No cache at all, return empty array
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

  // Get user ID - use cached ID to save 1 API call per request
  let userId = cachedUserId;
  if (!userId) {
    console.log('⚠️  User ID not cached, fetching from Twitter API (1 API call)...');
    const user = await client.v2.userByUsername(username); // 1 API call (only first time ever)
    
    if (!user.data) {
      throw new Error(`Twitter user @${username} not found`);
    }
    
    userId = user.data.id;
    cachedUserId = userId; // Cache it in memory
    saveUserIdToFile(userId); // Persist to file so it survives restarts
  }

  // Fetch user's tweets (1 API call)
  // Twitter API minimum is 5 tweets, so we must fetch at least 5
  const response = await client.v2.userTimeline(userId, {
    max_results: Math.max(5, Math.min(limit, 10)), // Minimum 5 (Twitter's requirement), max 10 for UI
    exclude: ['retweets', 'replies'], // Only get original tweets
    'tweet.fields': ['created_at', 'public_metrics', 'entities'],
    'media.fields': ['url', 'preview_image_url'],
    expansions: ['attachments.media_keys']
  });

  // Log rate limit info
  const rateLimit = response.rateLimit;
  if (rateLimit) {
    console.log(`📊 Twitter API Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} remaining (resets at ${new Date(rateLimit.reset * 1000).toLocaleTimeString()})`);
  }

  // Format tweets for frontend
  const formattedTweets = response.data.data.map(tweet => {
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
 * Force refresh tweets (bypasses cache)
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function forceRefreshTweets(limit = 5) {
  return getRecentTweets(limit, true);
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
  forceRefreshTweets,
  clearCache,
  clearTwitterCache,
  isConfigured,
  getTwitterStatus
};

