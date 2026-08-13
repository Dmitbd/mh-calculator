module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.expo/",
    "<rootDir>/.worktrees/",
    "<rootDir>/e2e/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))",
  ],
};
