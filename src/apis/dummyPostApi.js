export function dummyApiPost(endpoint, data) {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 1000 + 300;

    setTimeout(() => {
      let successRate = 0.9; // Default 90% success

      if (endpoint.includes("/orders/")) successRate = 0.95; // Orders are critical
      if (endpoint.includes("/products/")) successRate = 0.88; // Products sync
      if (endpoint.includes("/inventory/")) successRate = 0.92; // Inventory sync

      if (Math.random() < successRate) {
        // Success response
        resolve({
          status: "success",
          message: `${endpoint} processed successfully`,
          data: data,
          endpoint: endpoint,
          timestamp: Date.now(),
          server: "dummy-api-v1.0",
        });
      } else {
        // Simulate realistic API errors
        const errors = [
          "Server temporarily unavailable",
          "Database connection timeout",
          "Rate limit exceeded",
          "Invalid request format",
          "Authentication failed",
        ];

        const error = new Error(
          errors[Math.floor(Math.random() * errors.length)]
        );
        error.statusCode = Math.random() < 0.7 ? 500 : 400;
        error.endpoint = endpoint;
        reject(error);
      }
    }, delay);
  });
}

/**
 * Simulates a GET API call (if needed later)
 */
export function dummyApiGet(endpoint) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.95) {
        resolve({
          status: "success",
          data: { message: `Data from ${endpoint}` },
          timestamp: Date.now(),
        });
      } else {
        reject(new Error("Failed to fetch data"));
      }
    }, Math.random() * 800 + 200);
  });
}

/**
 * Configure dummy API behavior for testing
 */
export const dummyApiConfig = {
  setGlobalSuccessRate(rate) {
    this.globalSuccessRate = Math.max(0, Math.min(1, rate));
  },

  setGlobalDelay(minMs, maxMs) {
    this.minDelay = minMs;
    this.maxDelay = maxMs;
  },

  // Default config
  globalSuccessRate: 0.9,
  minDelay: 300,
  maxDelay: 1300,
};
