class RateLimiter {
  constructor(requestsPerInterval, interval) {
    this.requestsPerInterval = requestsPerInterval;
    this.interval = interval;
    this.queue = [];
    this.processing = false;
    this.requestsThisInterval = 0;
    this.intervalStart = Date.now();
  }

  async execute(asyncFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ asyncFn, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      if (now - this.intervalStart >= this.interval) {
        this.intervalStart = now;
        this.requestsThisInterval = 0;
      }

      if (this.requestsThisInterval < this.requestsPerInterval) {
        this.requestsThisInterval++;
        const { asyncFn, resolve, reject } = this.queue.shift();
        try {
          const result = await asyncFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        const timeToWait = this.interval - (now - this.intervalStart);
        if (timeToWait > 0) {
          await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
      }
    }

    this.processing = false;
  }
}

module.exports = RateLimiter;
