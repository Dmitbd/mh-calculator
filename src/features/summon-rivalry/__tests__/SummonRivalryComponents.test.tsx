jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (assetPath: string) => `resolved:${assetPath}`,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { summonRivalryResourceCatalog } from "@/features/game-data/summon-rivalry";

import { SummonCashback } from "../components/SummonCashback";
import { SummonCashbackToggle } from "../components/SummonCashbackToggle";
import { SummonDiamondExchange } from "../components/SummonDiamondExchange";
import { SummonOwnedResources } from "../components/SummonOwnedResources";
import { SummonRewardTrack } from "../components/SummonRewardTrack";
import { SummonResourceIcon } from "../components/SummonResourceIcon";
import { SummonScoreProgress } from "../components/SummonScoreProgress";

test("renders every verified resource icon through AppImage", () => {
  render(
    <View>
      {Object.values(summonRivalryResourceCatalog).map((resource) => (
        <SummonResourceIcon key={resource.kind} resource={resource} />
      ))}
    </View>,
  );

  for (const resource of Object.values(summonRivalryResourceCatalog)) {
    expect(
      screen.getByTestId(`summon-rivalry-resource-icon-${resource.kind}`),
    ).toBeTruthy();
  }
});

test("forwards all four owned resource fields as raw strings", () => {
  const handlers = {
    onChangeOwnedCommonScrolls: jest.fn(),
    onChangeOwnedLimitedScrolls: jest.fn(),
    onChangeOwnedFactionScrolls: jest.fn(),
    onChangeOwnedFateCrystals: jest.fn(),
  };

  render(
    <SummonOwnedResources
      ownedCommonScrolls={1}
      ownedLimitedScrolls={2}
      ownedFactionScrolls={3}
      ownedFateCrystals={4}
      {...handlers}
    />,
  );

  const fields = [
    ["Количество свитков обычного призыва", "11", handlers.onChangeOwnedCommonScrolls],
    ["Количество свитков ограниченного призыва", "12", handlers.onChangeOwnedLimitedScrolls],
    ["Количество свитков призыва фракции", "13", handlers.onChangeOwnedFactionScrolls],
    ["Количество кристаллов судьбы", "14", handlers.onChangeOwnedFateCrystals],
  ] as const;

  for (const [label, value, handler] of fields) {
    const input = screen.getByLabelText(label);
    expect(input.props.keyboardType).toBe("number-pad");
    fireEvent.changeText(input, value);
    expect(handler).toHaveBeenCalledWith(value);
  }
});

test("shows diamond total at the top and wires ten-item purchase controls", () => {
  const handlers = {
    onDecrementCommonScrolls: jest.fn(),
    onIncrementCommonScrolls: jest.fn(),
    onDecrementLimitedScrolls: jest.fn(),
    onIncrementLimitedScrolls: jest.fn(),
    onDecrementFateCrystals: jest.fn(),
    onIncrementFateCrystals: jest.fn(),
  };

  render(
    <SummonDiamondExchange
      commonScrolls={10}
      limitedScrolls={20}
      fateCrystals={30}
      costs={{
        commonScrolls: 2_700,
        limitedScrolls: 6_000,
        fateCrystals: 15_000,
        total: 23_700,
      }}
      {...handlers}
    />,
  );

  expect(screen.getByText("Покупки за алмазы")).toBeTruthy();
  expect(screen.getByLabelText("Алмазы: 23700")).toBeTruthy();
  expect(screen.getByText(": 23700")).toBeTruthy();
  expect(screen.queryByText(/Общие затраты/)).toBeNull();
  expect(screen.queryByText("2700 алмазов")).toBeNull();
  expect(screen.queryByText("6000 алмазов")).toBeNull();
  expect(screen.queryByText("15000 алмазов")).toBeNull();

  const actions = [
    ["Уменьшить свитки обычного призыва", handlers.onDecrementCommonScrolls],
    ["Увеличить свитки обычного призыва", handlers.onIncrementCommonScrolls],
    ["Уменьшить свитки ограниченного призыва", handlers.onDecrementLimitedScrolls],
    ["Увеличить свитки ограниченного призыва", handlers.onIncrementLimitedScrolls],
    ["Уменьшить кристаллы судьбы", handlers.onDecrementFateCrystals],
    ["Увеличить кристаллы судьбы", handlers.onIncrementFateCrystals],
  ] as const;

  for (const [label, handler] of actions) {
    fireEvent.press(screen.getByLabelText(label));
    expect(handler).toHaveBeenCalledTimes(1);
  }
});

test("disables all purchase decrements at zero and starts diamond spend at zero", () => {
  render(
    <SummonDiamondExchange
      commonScrolls={0}
      limitedScrolls={0}
      fateCrystals={0}
      costs={{ commonScrolls: 0, limitedScrolls: 0, fateCrystals: 0, total: 0 }}
      onDecrementCommonScrolls={jest.fn()}
      onIncrementCommonScrolls={jest.fn()}
      onDecrementLimitedScrolls={jest.fn()}
      onIncrementLimitedScrolls={jest.fn()}
      onDecrementFateCrystals={jest.fn()}
      onIncrementFateCrystals={jest.fn()}
    />,
  );

  expect(screen.getByLabelText("Алмазы: 0")).toBeTruthy();
  expect(
    screen.getAllByRole("button").filter(
      (button) => button.props.accessibilityLabel?.startsWith("Уменьшить"),
    ).map((button) => button.props.accessibilityState),
  ).toEqual([
    { disabled: true },
    { disabled: true },
    { disabled: true },
  ]);
});

test("shows all cashback resources and toggles the checkbox", () => {
  const onChange = jest.fn();
  render(
    <>
      <SummonCashback
        cashback={{
          commonScrolls: 15,
          fateCrystals: 5,
          ssrFragments: 15,
          urFragments: 5,
        }}
      />
      <SummonCashbackToggle checked onChange={onChange} />
    </>,
  );

  expect(screen.getAllByLabelText(/^Кешбэк — /)).toHaveLength(4);
  expect(
    screen.getByLabelText("Кешбэк — Свиток обычного призыва: 15"),
  ).toBeTruthy();
  expect(screen.getByLabelText("Кешбэк — Кристалл судьбы: 5")).toBeTruthy();
  expect(screen.getByLabelText("Кешбэк — Осколок SSR героя: 15")).toBeTruthy();
  expect(screen.getByLabelText("Кешбэк — Осколок UR героя: 5")).toBeTruthy();

  fireEvent.press(screen.getByRole("checkbox", { name: "Учитывать кешбэк" }));
  expect(onChange).toHaveBeenCalledWith(false);
});

test.each([
  [0, "0 / 12000", "Очки соревнования: 0 из 12000"],
  [15_000, "15000 / 12000", "Очки соревнования: 15000 из 12000"],
])("shows uncapped score %i against the event maximum", (score, text, label) => {
  render(<SummonScoreProgress totalScore={score} />);

  expect(screen.getByText(text)).toBeTruthy();
  expect(screen.getByLabelText(label)).toBeTruthy();
});

test("renders all 16 reward chests and marks every fourth as major", () => {
  render(<SummonRewardTrack openedNodes={4} totalScore={3_505} />);

  const chests = screen.getAllByLabelText(/^Сундук награды /);
  expect(chests).toHaveLength(16);
  expect(chests[0].props.accessibilityLabel).toBe(
    "Сундук награды 1: 750 очков, открыт",
  );
  expect(chests[3].props.accessibilityLabel).toBe(
    "Сундук награды 4: 3000 очков, открыт, большой сундук",
  );
  expect(
    chests.filter((chest) =>
      chest.props.accessibilityLabel.endsWith("большой сундук"),
    ),
  ).toHaveLength(4);
  expect(screen.getAllByLabelText("Открыто")).toHaveLength(4);
  expect(
    screen
      .getAllByLabelText(/^Линия наград /)
      .map((row) => row.props.accessibilityValue?.now),
  ).toEqual([100, 0, 0, 0]);
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
