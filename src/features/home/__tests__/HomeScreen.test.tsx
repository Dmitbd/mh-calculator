const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

import { render, screen } from "@testing-library/react-native";
import type React from "react";

import HomeScreen from "../screens/HomeScreen";

test("renders calculator and build entry points", () => {
  render(<HomeScreen />);

  expect(screen.getByText("Калькуляторы")).toBeTruthy();
  expect(screen.getByText("Божественность")).toBeTruthy();
  expect(screen.getByText("Билды")).toBeTruthy();
  expect(screen.getByText("Билды героев")).toBeTruthy();
  expect(screen.getByText("build builder")).toBeTruthy();
});
