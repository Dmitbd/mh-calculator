jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { IconPreview } from "../IconPreview";

test("renders resolved image when source is present", () => {
  render(<IconPreview label="Hero" source="/img/heroes/bastet.png" />);
  const icon = screen.getByLabelText("Hero icon");

  expect(icon).toBeTruthy();
  expect(StyleSheet.flatten(icon.props.style).borderRadius).toBe(17);
});

test("renders placeholder when source is missing", () => {
  render(<IconPreview label="Skill" source="" />);

  expect(screen.getByLabelText("Skill icon placeholder")).toBeTruthy();
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
