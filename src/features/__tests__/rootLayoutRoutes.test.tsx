const mockStackScreen = jest.fn((_props: unknown) => null);

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");

  return {
    __esModule: true,
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) => children,
      { Screen: (props: unknown) => mockStackScreen(props) },
    ),
    useLocalSearchParams: () => ({ heroId: "bastet" }),
    usePathname: () => "/summon-rivalry",
    useRouter: () => ({ replace: jest.fn() }),
  };
});

jest.mock("@/shared/ui/AppErrorBoundary", () => {
  const React = jest.requireActual("react");

  return {
    __esModule: true,
    AppErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("../heroes/screens/HeroBuildScreen", () => ({
  __esModule: true,
  HeroBuildScreen: () => null,
}));

import { render } from "@testing-library/react-native";

import RootLayout from "../../../app/_layout";
import { generateStaticParams } from "../../../app/heroes/[heroId]";
import { heroes } from "../game-data/heroes";

const expectedRouteEntries = [
  "index",
  "divinity",
  "divinity/manual",
  "divinity-talents",
  "divinity-talents/manual",
  "antiques",
  "antiques/manual",
  "summon-rivalry",
  "summon-rivalry/manual",
  "weekly-rivalry/beastly-echoes",
  "weekly-rivalry/beastly-echoes/manual",
  "weekly-rivalry/tower-of-babel",
  "weekly-rivalry/tower-of-babel/manual",
  "weekly-rivalry/zodiac-map",
  "weekly-rivalry/zodiac-map/manual",
  "heroes/index",
  "heroes/[heroId]",
  "admin/branch-builder",
];

beforeEach(() => {
  mockStackScreen.mockClear();
});

test("configures the complete canonical route inventory", () => {
  render(<RootLayout />);

  expect(mockStackScreen.mock.calls.map(([props]) => props)).toEqual(
    expectedRouteEntries.map((name) => ({
      name,
      options:
        name === "index"
          ? { title: "MH Calculator" }
          : { headerShown: false },
    })),
  );
});

test.each([
  "divinity-talents",
  "divinity-talents/manual",
  "summon-rivalry",
  "summon-rivalry/manual",
  "weekly-rivalry/tower-of-babel",
  "weekly-rivalry/tower-of-babel/manual",
  "weekly-rivalry/zodiac-map",
  "weekly-rivalry/zodiac-map/manual",
  "weekly-rivalry/beastly-echoes",
  "weekly-rivalry/beastly-echoes/manual",
])(
  "disables the native stack header for %s",
  (routeName) => {
    render(<RootLayout />);

    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: routeName,
        options: expect.objectContaining({ headerShown: false }),
      }),
    );
  },
);

test("generates one static hero route for every catalog hero", () => {
  const heroIds = heroes.map(({ id }) => id);
  const generatedIds = generateStaticParams().map(({ heroId }) => heroId);

  expect(new Set(generatedIds).size).toBe(generatedIds.length);
  expect(generatedIds).toEqual(heroIds);
});
