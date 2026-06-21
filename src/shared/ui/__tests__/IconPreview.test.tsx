jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import { render, screen } from "@testing-library/react-native";

import { IconPreview } from "../IconPreview";

test("renders resolved image when source is present", () => {
  render(<IconPreview label="Hero" source="/img/heroes/bastet.png" />);

  expect(screen.getByLabelText("Hero icon").props.source).toEqual({
    uri: "resolved:/img/heroes/bastet.png",
  });
});

test("renders placeholder when source is missing", () => {
  render(<IconPreview label="Skill" source="" />);

  expect(screen.getByLabelText("Skill icon placeholder")).toBeTruthy();
});
