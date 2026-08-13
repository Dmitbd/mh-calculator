jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const { AccessibilityInfo } = require("react-native");

AccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(true);
