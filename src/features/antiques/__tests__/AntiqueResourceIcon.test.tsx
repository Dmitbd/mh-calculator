jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: jest.fn((assetPath: string) => `resolved:${assetPath}`),
}));

import { render, screen } from "@testing-library/react-native";

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
  expect(screen.getByLabelText("Синтетический ресурс").props.source).toEqual({
    uri: "resolved:https://example.test/synthetic-icon.png",
  });
});

test.each(Object.values(antiqueResourceCatalog))(
  "renders the real $kind catalog entry through its controlled fallback",
  (resource) => {
    render(<AntiqueResourceIcon resource={resource} />);

    expect(screen.getByText(resource.fallbackLabel)).toBeTruthy();
    expect(
      screen.getByLabelText(`${resource.label}: иконка недоступна`),
    ).toBeTruthy();
    expect(resolveAssetUri).not.toHaveBeenCalled();
    expect(screen.queryByRole("image")).toBeNull();
  },
);
