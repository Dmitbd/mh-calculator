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

import { render, screen } from "@testing-library/react-native";

import { getHeroBuildSet } from "@/features/game-data/heroes/heroBuilds";
import { HeroBuildScreen } from "@/features/heroes/screens/HeroBuildScreen";

describe("HeroBuildScreen", () => {
  test("renders only tabs with ready builds for bastet", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
    expect(screen.queryByLabelText("Select PvE build tab")).toBeNull();
    expect(screen.queryByLabelText("Select Кампания build tab")).toBeNull();
    expect(screen.queryByLabelText("Select Боссы build tab")).toBeNull();
  });

  test("defaults to the first ready build path", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });

  test("does not render empty placeholder when only ready tabs are visible", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.queryByText("Билд для этого режима ещё не готов.")).toBeNull();
    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });

  test("shows active weapon color bonus for read-only build with repeated colors", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();
    expect(
      screen.getByText(
        "If any allied frontline Hero is still alive, this Hero's damage taken is reduced by 24%.",
      ),
    ).toBeTruthy();
  });

  test("does not show weapon bonus block when build has no repeated colors", () => {
    const buildSet = getHeroBuildSet("bastet");

    if (!buildSet) {
      throw new Error("Expected bastet build set.");
    }

    const patchedTabs = buildSet.tabs.map((tab) => {
      if (!tab.build) {
        return tab;
      }

      return {
        ...tab,
        build: {
          ...tab.build,
          weaponAwakening: [
            { slot: 1, colorId: "red" },
            { slot: 2, colorId: "yellow" },
            { slot: 3, colorId: "green" },
            { slot: 4, colorId: "blue" },
            { slot: 5, colorId: "purple" },
          ],
        },
      };
    });

    const spy = jest
      .spyOn(require("@/features/game-data/heroes/heroBuilds"), "getHeroBuildSet")
      .mockReturnValue({
        ...buildSet,
        tabs: patchedTabs,
      });

    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.queryByText("Активные бонусы цветов")).toBeNull();

    spy.mockRestore();
  });
});
