/**
 * Setup for Jest tests
 * Initialize test database and mock services
 */

// Mock database operations if needed
process.env.NODE_ENV = 'test';

/**
 * Global test utilities
 */
global.testUtils = {
    /**
     * Wait for async operations
     */
    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Clean up after tests
     */
    cleanup: async () => {
        // Add cleanup logic here if needed
    }
};

/**
 * Suppress console messages in tests (optional)
 */
const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
    // Uncomment to suppress logs during tests
    // console.log = jest.fn();
    // console.error = jest.fn();
});

afterAll(() => {
    // Restore original console methods
    // console.log = originalLog;
    // console.error = originalError;
});

declare global {
    var testUtils: {
        delay: (ms: number) => Promise<void>;
        cleanup: () => Promise<void>;
    };
}

export {};
