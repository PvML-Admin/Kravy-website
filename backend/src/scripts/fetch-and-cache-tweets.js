/**
 * One-time script to fetch tweets and populate the cache
 * Run this when Twitter rate limits have reset
 * Usage: node src/scripts/fetch-and-cache-tweets.js
 */

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../.twitter-cache.json');

async function fetchAndCacheTweets() {
  console.log('🐦 Fetching tweets from Twitter...\n');

  // Check if credentials are configured
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  const username = process.env.TWITTER_USERNAME;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error('❌ Twitter API credentials not configured!');
    console.error('Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET in your .env file');
    process.exit(1);
  }

  if (!username) {
    console.error('❌ TWITTER_USERNAME not configured!');
    process.exit(1);
  }

  try {
    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    console.log(`Fetching tweets from @${username}...`);

    // Get user ID from username
    const user = await client.v2.userByUsername(username);
    
    if (!user.data) {
      throw new Error(`Twitter user @${username} not found`);
    }

    const userId = user.data.id;

    // Fetch user's tweets
    const tweets = await client.v2.userTimeline(userId, {
      max_results: 5,
      exclude: ['retweets', 'replies'],
      'tweet.fields': ['created_at', 'public_metrics', 'entities'],
      'media.fields': ['url', 'preview_image_url'],
      expansions: ['attachments.media_keys']
    });

    // Format tweets
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

    // Save to cache file
    const cache = {
      data: formattedTweets,
      timestamp: Date.now()
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');

    console.log(`\n✅ Successfully cached ${formattedTweets.length} tweets!`);
    console.log(`📁 Cache saved to: ${CACHE_FILE}`);
    console.log('\nCached tweets:');
    formattedTweets.forEach((tweet, i) => {
      console.log(`  ${i + 1}. ${tweet.text.substring(0, 60)}...`);
    });
    console.log('\n🎉 Done! Your Twitter feed will now show these tweets immediately.');

  } catch (error) {
    console.error('\n❌ Error fetching tweets:', error.message);
    
    if (error.code === 429) {
      console.error('\n⏳ Rate limit exceeded. Please wait 15 minutes and try again.');
      console.error('Twitter free tier only allows 3 requests per 15 minutes.');
    } else if (error.code === 401) {
      console.error('\n🔑 Authentication failed. Please check your Twitter API credentials.');
    }
    
    process.exit(1);
  }
}

// Run the script
fetchAndCacheTweets();

