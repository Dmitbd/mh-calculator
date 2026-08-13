jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: jest.fn((assetPath: string) => `resolved:${assetPath}`),
}));

import { render, screen } from "@testing-library/react-native";
import { Image } from "react-native";

import {
  antiqueResourceCatalog,
  type VerifiedAntiqueResourceMetadata,
} from "@/features/game-data/antiques";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { AntiqueResourceIcon } from "../components/AntiqueResourceIcon";

const syntheticIconResource: VerifiedAntiqueResourceMetadata = {
  kind: "researchCoins",
  verification: "verified",
  label: "Синтетический ресурс",
  fallbackLabel: "СР",
  resourceId: 1,
  spriteName: "synthetic-sprite",
  icon: "https://example.test/synthetic-icon.png",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("resolves the image branch for explicitly synthetic metadata", () => {
  render(<AntiqueResourceIcon resource={syntheticIconResource} />);

  expect(resolveAssetUri).toHaveBeenCalledWith(syntheticIconResource.icon);
  expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
    cache: "force-cache",
    uri: "resolved:https://example.test/synthetic-icon.png",
  });
  expect(
    screen.getByTestId("antique-resource-icon-researchCoins-placeholder"),
  ).toBeTruthy();
});

test.each(Object.values(antiqueResourceCatalog))(
  "renders the real $kind catalog entry according to its icon metadata",
  (resource) => {
    render(<AntiqueResourceIcon resource={resource} />);

    if ("icon" in resource && resource.icon) {
      expect(resolveAssetUri).toHaveBeenCalledWith(resource.icon);
      expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
        cache: "force-cache",
        uri: `resolved:${resource.icon}`,
      });
      expect(screen.queryByText(resource.fallbackLabel)).toBeNull();
      return;
    }

    expect(screen.getByText(resource.fallbackLabel)).toBeTruthy();
    expect(
      screen.getByLabelText(`${resource.label}: иконка недоступна`),
    ).toBeTruthy();
    expect(resolveAssetUri).not.toHaveBeenCalled();
    expect(screen.queryByRole("image")).toBeNull();
  },
);
