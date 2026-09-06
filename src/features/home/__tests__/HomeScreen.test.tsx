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
  Link: ({
    children,
    href,
  }: {
    children: React.ReactElement;
    href: string;
  }) => require("react").cloneElement(children, { testID: `link-${href}` }),
}));

import { render, screen, within } from "@testing-library/react-native";
import type React from "react";
import { StyleSheet } from "react-native";

import { APP_VERSION } from "../../../shared/lib/appVersion";
import {
  beastlyEchoesConfig,
  towerOfBabelConfig,
  zodiacMapConfig,
} from "../../../features/game-data/weekly-rivalry";
import HomeScreen from "../screens/HomeScreen";

test("renders calculator and build entry points", () => {
  render(<HomeScreen />);

  expect(screen.getByText("Калькуляторы")).toBeTruthy();
  const navigationButtons = [
    {
      href: "/divinity",
      buttonText: "Божественность",
      screenHeader: "Божественность",
    },
    {
      href: "/divinity-talents",
      buttonText: "Дерево навыков",
      screenHeader: "Дерево навыков",
    },
    {
      href: "/antiques",
      buttonText: "Антиквариат",
      screenHeader: "Антиквариат",
    },
    {
      href: "/summon-rivalry",
      buttonText: "Призыв",
      screenHeader: "Призыв",
    },
    {
      href: "/weekly-rivalry/beastly-echoes",
      buttonText: beastlyEchoesConfig.title,
      screenHeader: beastlyEchoesConfig.title,
    },
    {
      href: "/weekly-rivalry/tower-of-babel",
      buttonText: towerOfBabelConfig.title,
      screenHeader: towerOfBabelConfig.title,
    },
    {
      href: "/weekly-rivalry/zodiac-map",
      buttonText: zodiacMapConfig.title,
      screenHeader: zodiacMapConfig.title,
    },
    {
      href: "/heroes",
      buttonText: "Билды героев",
      screenHeader: "Билды героев",
    },
    {
      href: "/admin/branch-builder",
      buttonText: "Builder",
      screenHeader: "Builder",
    },
  ];

  for (const { href, buttonText, screenHeader } of navigationButtons) {
    expect(within(screen.getByTestId(`link-${href}`)).getByText(buttonText))
      .toBeTruthy();
    expect(buttonText).toBe(screenHeader);
  }

  expect(screen.queryByText("Ветки героев")).toBeNull();
  expect(screen.queryByText("Дерево навыков")).toBeTruthy();
  expect(screen.queryByText("build builder")).toBeNull();
  expect(screen.getByText("Билды")).toBeTruthy();
  expect(screen.getByText("Builder")).toBeTruthy();

  const calculatorButtonStyle = StyleSheet.flatten(
    screen.getByTestId("link-/divinity").props.style,
  );
  const heroBuildButtonStyle = StyleSheet.flatten(
    screen.getByTestId("link-/heroes").props.style,
  );
  expect(heroBuildButtonStyle.width).toBe(calculatorButtonStyle.width);
  expect(heroBuildButtonStyle.width).toBe(246);

  const calculatorLinks = screen.getAllByTestId(/^link-\//);
  expect(calculatorLinks.slice(0, 2).map((link) => link.props.testID)).toEqual([
    "link-/divinity",
    "link-/divinity-talents",
  ]);
});

test("shows the current version in a footer linked to the latest release", () => {
  render(<HomeScreen />);

  const releaseLink = screen.getByTestId(
    "link-https://github.com/Dmitbd/mh-calculator/releases/latest",
  );

  expect(within(releaseLink).getByText(`Версия ${APP_VERSION}`)).toBeTruthy();
  expect(within(releaseLink).getByText("Что нового")).toBeTruthy();
});

test("keeps the release footer outside scrolling navigation and respects safe areas", () => {
  mockUseSafeAreaInsets.mockReturnValueOnce({
    top: 20,
    right: 4,
    bottom: 34,
    left: 4,
  });
  render(<HomeScreen />);

  const releaseLabel = `Версия ${APP_VERSION}. Что нового`;
  const navigation = screen.getByTestId("home-navigation");
  const footer = screen.getByTestId("home-footer");

  expect(within(navigation).queryByLabelText(releaseLabel)).toBeNull();
  expect(within(footer).getByLabelText(releaseLabel)).toBeTruthy();
  expect(within(navigation).getByText("Builder")).toBeTruthy();
  expect(navigation).toHaveStyle({ flex: 1 });
  expect(footer).toHaveStyle({ flexShrink: 0, paddingBottom: 34 });
  expect(screen.getByTestId("home-screen")).toHaveStyle({
    flex: 1,
    paddingTop: 20,
    paddingLeft: 4,
    paddingRight: 4,
  });
});
