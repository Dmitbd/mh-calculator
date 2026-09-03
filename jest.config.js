module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/app", "<rootDir>/src", "<rootDir>/scripts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.expo/",
    "<rootDir>/.worktrees/",
    "<rootDir>/e2e/",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.worktrees/"],
  watchPathIgnorePatterns: ["<rootDir>/.worktrees/"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "src/**/*.{ts,tsx}",
    "!**/__tests__/**",
    "!**/*.test.{ts,tsx}",
    "!**/*.spec.{ts,tsx}",
    "!src/**/testing/**",
    "!**/*.d.ts",
    "!src/features/builds/data/generated/**",
  ],
  coverageReporters: ["text-summary", "json-summary", "lcov"],
  coverageThreshold: {
    global: {
      branches: 82.44,
      functions: 95.92,
      lines: 90.48,
      statements: 90.28,
    },
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))",
  ],
};
