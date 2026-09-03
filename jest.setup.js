jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const {
  installConsoleGuard,
} = require("./scripts/testing/consoleGuard.cjs");

installConsoleGuard();

const { AccessibilityInfo } = require("react-native");

AccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(true);
