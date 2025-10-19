const RateLimiter = require('./rateLimiter');

// More conservative limit for RuneMetrics API, which is known to be sensitive
// Max queue size of 500 to prevent unbounded memory growth
const runemetricsRateLimiter = new RateLimiter(1, 1500, 500); // 1 request every 1.5 seconds, max 500 in queue

// Hiscores is generally more robust and can handle a faster rate
// Max queue size of 1000 for higher throughput
const hiscoresRateLimiter = new RateLimiter(1, 600, 1000); // 1 request every 600ms, max 1000 in queue

module.exports = {
  runemetricsRateLimiter,
  hiscoresRateLimiter,
};
