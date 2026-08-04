jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: jest.fn((assetPath: string) => `resolved:${assetPath}`),
}));

import { render, screen } from "@testing-library/react-native";

import type { AntiqueResourceMetadata } from "@/features/game-data/antiques";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { AntiqueResourceIcon } from "../components/AntiqueResourceIcon";

const confirmedIconResource: AntiqueResourceMetadata = {
  kind: "tombMap",
  label: "Карта гробницы",
  fallbackLabel: "КГ",
  resourceId: 700042,
  spriteName: "700042",
  icon: "/img/antiques/tomb-map-700042.png",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("resolves and renders a confirmed icon path", () => {
  render(<AntiqueResourceIcon resource={confirmedIconResource} />);

  expect(resolveAssetUri).toHaveBeenCalledWith(confirmedIconResource.icon);
  expect(screen.getByLabelText("Карта гробницы").props.source).toEqual({
    uri: "resolved:/img/antiques/tomb-map-700042.png",
  });
});

test("renders a controlled label without producing a broken image URI", () => {
  const unresolvedResource: AntiqueResourceMetadata = {
    kind: "researchCoins",
    label: "Монеты исследования",
    fallbackLabel: "МИ",
  };

  render(<AntiqueResourceIcon resource={unresolvedResource} />);

  expect(screen.getByText("МИ")).toBeTruthy();
  expect(
    screen.getByLabelText("Монеты исследования: иконка недоступна"),
  ).toBeTruthy();
  expect(resolveAssetUri).not.toHaveBeenCalled();
  expect(screen.queryByRole("image")).toBeNull();
});
