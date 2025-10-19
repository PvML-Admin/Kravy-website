const RateLimiter = require('./rateLimiter');

// More conservative limit for RuneMetrics API, which is known to be sensitive
const runemetricsRateLimiter = new RateLimiter(1, 1500); // 1 request every 1.5 seconds

// Hiscores is generally more robust and can handle a faster rate
const hiscoresRateLimiter = new RateLimiter(1, 600); // 1 request every 600ms

module.exports = {
  runemetricsRateLimiter,
  hiscoresRateLimiter,
};
