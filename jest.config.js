const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Load test environment variables
  setupFiles: ['<rootDir>/jest.env.js'],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    'pages/api/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!pages/_app.tsx',
    '!pages/_document.tsx',
    '!**/*.d.ts',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
  // Memory and performance optimizations
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  // Force garbage collection between test files
  logHeapUsage: true,
  // Prevent memory leaks from test files
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)