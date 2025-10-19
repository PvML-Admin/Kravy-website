class RateLimiter {
  constructor(requestsPerInterval, interval, maxQueueSize = 1000) {
    this.requestsPerInterval = requestsPerInterval;
    this.interval = interval;
    this.maxQueueSize = maxQueueSize;
    this.queue = [];
    this.processing = false;
    this.requestsThisInterval = 0;
    this.intervalStart = Date.now();
    this.droppedRequests = 0;
  }

  async execute(asyncFn) {
    return new Promise((resolve, reject) => {
      // Check if queue is at capacity
      if (this.queue.length >= this.maxQueueSize) {
        this.droppedRequests++;
        const error = new Error(`Rate limiter queue is full (max: ${this.maxQueueSize}). Request rejected.`);
        error.code = 'QUEUE_FULL';
        reject(error);
        return;
      }

      this.queue.push({ asyncFn, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      maxQueueSize: this.maxQueueSize,
      droppedRequests: this.droppedRequests,
      requestsThisInterval: this.requestsThisInterval,
      isProcessing: this.processing
    };
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
