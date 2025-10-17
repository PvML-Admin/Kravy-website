const RateLimiter = require('./rateLimiter');

// More conservative limit for RuneMetrics API, which is known to be sensitive
const runemetricsRateLimiter = new RateLimiter(1, 2000); // 1 request every 2 seconds

// Hiscores is generally more robust and can handle a faster rate
const hiscoresRateLimiter = new RateLimiter(1, 1000); // 1 request per second

module.exports = {
  runemetricsRateLimiter,
  hiscoresRateLimiter,
};
