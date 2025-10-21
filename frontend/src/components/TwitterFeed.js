import React, { useState, useEffect } from 'react';
import './TwitterFeed.css';

function TwitterFeed() {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);

  const fetchTweets = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://kravy-website.onrender.com/api';
      const response = await fetch(`${apiUrl}/twitter/recent-tweets?limit=5`);
      const data = await response.json();

      if (data.success && data.tweets) {
        // Check if Twitter is configured
        if (data.message === 'Twitter feed is not configured') {
          setIsConfigured(false);
          setTweets([]);
          setError(null);
        } else {
          // Update tweets (could be empty array or actual tweets)
          setTweets(data.tweets);
          setIsConfigured(true);
          
          // Only set error if we have a message but no tweets (graceful degradation)
          if (data.message && data.tweets.length === 0) {
            setError('Tweets will appear once loaded from Twitter');
          } else {
            setError(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching tweets:', err);
      // Don't show error if we already have cached tweets
      if (tweets.length === 0) {
        setError('Unable to connect to Twitter feed');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTweets();

    // Auto-refresh every 60 minutes (1 hour) to avoid rate limits
    const interval = setInterval(fetchTweets, 60 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    
    // Format as DD/MM/YYYY HH:MM
    return date.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric', 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const truncateText = (text, maxLength = 180) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="card twitter-feed-card">
        <div className="twitter-header">
          <svg className="twitter-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <h2>Latest Posts</h2>
        </div>
        <p className="twitter-loading">Loading tweets...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="card twitter-feed-card">
        <div className="twitter-header">
          <svg className="twitter-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <h2>Latest Posts</h2>
        </div>
        <p className="twitter-message">Twitter feed coming soon...</p>
      </div>
    );
  }

  if (error && tweets.length === 0) {
    return (
      <div className="card twitter-feed-card">
        <div className="twitter-header">
          <svg className="twitter-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <h2>Latest Posts</h2>
        </div>
        <p className="twitter-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="card twitter-feed-card">
      <div className="twitter-header">
        <svg className="twitter-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <h2>Latest Posts</h2>
      </div>
      
      {tweets.length === 0 ? (
        <p className="twitter-message">
          {error ? error : 'No recent tweets available'}
        </p>
      ) : (
        <div className="tweets-container">
          {tweets.map((tweet) => (
            <a
              key={tweet.id}
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tweet-card"
            >
              <p className="tweet-text">{truncateText(tweet.text)}</p>
              <div className="tweet-footer">
                <div className="tweet-metrics">
                  <span className="metric" title="Likes">
                    ❤️ {formatNumber(tweet.metrics.likes)}
                  </span>
                  <span className="metric" title="Retweets">
                    🔁 {formatNumber(tweet.metrics.retweets)}
                  </span>
                  <span className="metric" title="Replies">
                    💬 {formatNumber(tweet.metrics.replies)}
                  </span>
                </div>
                <span className="tweet-time">{formatTimestamp(tweet.createdAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
      
      {error && tweets.length > 0 && (
        <p className="twitter-warning">⚠️ Using cached data</p>
      )}
    </div>
  );
}

export default TwitterFeed;

