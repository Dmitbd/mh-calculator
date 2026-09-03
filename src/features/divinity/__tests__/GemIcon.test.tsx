jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (assetPath: string) => `resolved:${assetPath}`,
}));

import { render, screen } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";

import { GemIcon } from "../ui/GemIcon";

const fs = jest.requireActual("fs") as {
  existsSync: (filePath: string) => boolean;
};

const gemCases = [
  [1, "/img/divinity/gems/gem-700361.png"],
  [2, "/img/divinity/gems/gem-700362.png"],
  [3, "/img/divinity/gems/gem-700363.png"],
  [4, "/img/divinity/gems/gem-700364.png"],
  [5, "/img/divinity/gems/gem-700365.png"],
  [6, "/img/divinity/gems/gem-700366.png"],
  [7, "/img/divinity/gems/gem-700367.png"],
] as const;

test.each(gemCases)("renders the level %s game icon", (level, iconPath) => {
  render(<GemIcon level={level} size={28} />);

  const icon = screen.getByLabelText(
    `Самоцвет божественности ${level} ур.`,
  );
  const image = screen.UNSAFE_getByType(Image);

  expect(image.props.source).toEqual({
    cache: "force-cache",
    uri: `resolved:${iconPath}`,
  });
  expect(image.props.resizeMode).toBe("contain");
  expect(StyleSheet.flatten(icon.props.style)).toMatchObject({
    width: 28,
    height: 28,
  });
  expect(
    fs.existsSync(`${process.cwd()}/public${iconPath}`),
  ).toBe(true);
  expect(
    screen.getByTestId(`divinity-gem-icon-${level}-placeholder`),
  ).toBeTruthy();
});

test("uses the default icon size", () => {
  render(<GemIcon level={1} />);

  const icon = screen.getByLabelText("Самоцвет божественности 1 ур.");

  expect(StyleSheet.flatten(icon.props.style)).toMatchObject({
    width: 18,
    height: 18,
  });
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
