jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (assetPath: string) => `resolved:${assetPath}`,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  BEAST_SEAL_RESOURCE_ID,
  WEEKLY_EVENT_CHEST_RESOURCE_ID,
  beastlyEchoesConfig,
  getWeeklyQuestCashbackResources,
  getWeeklyRivalryCashbackResources,
  weeklyRivalryResourceCatalog,
} from "@/features/game-data/weekly-rivalry";

import { WeeklyQuestSection } from "../components/WeeklyQuestSection";
import { WeeklyRivalryCashback } from "../components/WeeklyRivalryCashback";
import { WeeklyRivalryInputs } from "../components/WeeklyRivalryInputs";
import { WeeklyRivalryRewardTrack } from "../components/WeeklyRivalryRewardTrack";
import { WeeklyRivalryToggle } from "../components/WeeklyRivalryToggle";
import { calculateWeeklyRivalryEventProgress } from "../model/calculateWeeklyRivalryEventProgress";
import { normalizeWeeklyRivalryInput } from "../model/normalizeWeeklyRivalryInput";

test("renders the Beast Seal field directly above the weekly chest field", () => {
  const onChangeSpendResource = jest.fn();
  const onChangeWeeklyEventChests = jest.fn();
  render(
    <WeeklyRivalryInputs
      chestResource={weeklyRivalryResourceCatalog[WEEKLY_EVENT_CHEST_RESOURCE_ID]}
      onChangeSpendResource={onChangeSpendResource}
      onChangeWeeklyEventChests={onChangeWeeklyEventChests}
      spendResource={weeklyRivalryResourceCatalog[BEAST_SEAL_RESOURCE_ID]}
      spendResourceCount={12}
      spendResourceGenitivePlural="Печатей зверя"
      weeklyEventChests={3}
    />,
  );

  const sealField = screen.getByLabelText("Количество Печатей зверя");
  const chestField = screen.getByLabelText(
    "Количество персональных сундуков еженедельного события",
  );
  fireEvent.changeText(sealField, "20");
  fireEvent.changeText(chestField, "4");
  expect(onChangeSpendResource).toHaveBeenCalledWith("20");
  expect(onChangeWeeklyEventChests).toHaveBeenCalledWith("4");
  expect(
    screen.getByText(
      "Печати зверя и сундуки используются в соперничестве и заданиях",
    ),
  ).toBeTruthy();
});

test("renders a partial reward track without empty rows and respects isSpecial", () => {
  const nodes = beastlyEchoesConfig.rivalryNodes.slice(0, 5).map((node, index) => ({
    ...node,
    isSpecial: index === 1,
  }));

  render(<WeeklyRivalryRewardTrack nodes={nodes} openedNodes={2} />);

  expect(screen.getAllByLabelText(/^Линия наград /)).toHaveLength(2);
  expect(screen.getAllByLabelText(/^Сундук награды /)).toHaveLength(5);
  expect(
    screen.getByLabelText("Сундук награды 2: 1500 очков, открыт, большой сундук"),
  ).toBeTruthy();
  expect(
    screen.getByLabelText("Сундук награды 4: 3000 очков, закрыт"),
  ).toBeTruthy();
});

test("renders the chest icon, exact toggle label, and explanation", () => {
  const onChange = jest.fn();
  render(
    <WeeklyRivalryToggle
      checked
      description="1 сундук = 1 печать зверя"
      icon={beastlyEchoesConfig.rivalryNodes[3].rewards[0]}
      label="Учитывать кешбэк «Персон. сундук еженед. события»"
      onChange={onChange}
    />,
  );

  expect(
    screen.getByLabelText("Персон. сундук еженед. события"),
  ).toBeTruthy();
  expect(
    screen.getByText("1 сундук = 1 печать зверя"),
  ).toBeTruthy();
  expect(screen.getByHintText("1 сундук = 1 печать зверя")).toBeTruthy();
  fireEvent.press(
    screen.getByRole("checkbox", {
      name: "Учитывать кешбэк «Персон. сундук еженед. события»",
    }),
  );
  expect(onChange).toHaveBeenCalledWith(false);
});

test("marks completed task rows and the section reward with green checks", () => {
  const result = calculateWeeklyRivalryEventProgress(
    normalizeWeeklyRivalryInput({
      ownedSpendResource: 80,
      includeQuestCashback: true,
    }),
    beastlyEchoesConfig,
  ).questProgress;
  render(
    <WeeklyQuestSection
      progress={result.sections[0]}
      spendResourceGenitivePlural="Печатей зверя"
    />,
  );

  expect(screen.getByText("Раздел 1")).toBeTruthy();
  expect(screen.getByText("Награды раздела 1")).toBeTruthy();
  expect(screen.getAllByText("✓")).toHaveLength(7);
  expect(
    screen.getByLabelText(
      /^Задание: потратить 5 Печатей зверя, выполнено\. Текущий прогресс 5 из 5\. Награды: /,
    ),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(/^Награды раздела 1: получены\. Состав: /),
  ).toBeTruthy();
});

test("renders the rivalry track as sixteen connected chests like Antique", () => {
  render(
    <WeeklyRivalryRewardTrack
      nodes={beastlyEchoesConfig.rivalryNodes}
      openedNodes={4}
    />,
  );

  expect(screen.getAllByLabelText(/^Сундук награды /)).toHaveLength(16);
  expect(
    screen.getByLabelText(
      "Сундук награды 4: 3000 очков, открыт, большой сундук",
    ),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(
      "Сундук награды 16: 12000 очков, закрыт, большой сундук",
    ),
  ).toBeTruthy();
  expect(screen.getAllByLabelText(/^Линия наград /)).toHaveLength(4);
  expect(screen.getAllByLabelText("Открыто")).toHaveLength(4);
  expect(screen.queryByText("×2")).toBeNull();

  expect(
    screen.getAllByTestId(/^weekly-rivalry-reward-chest-/),
  ).toHaveLength(16);
});

test("shows all four rivalry cashback resources with icons and zero values", () => {
  render(
    <WeeklyRivalryCashback
      resources={getWeeklyRivalryCashbackResources(beastlyEchoesConfig)}
      rewards={[]}
      title="Кешбэк соперничества"
    />,
  );

  expect(
    screen.getAllByLabelText(/^Кешбэк соперничества — /),
  ).toHaveLength(4);
  expect(
    screen.getByLabelText("Кешбэк соперничества — Молоты вознесения: 0"),
  ).toBeTruthy();
  expect(
    screen.getByLabelText("Кешбэк соперничества — Печати зверя: 0"),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(
      "Кешбэк соперничества — Персон. сундук еженед. события: 0",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Учитывается в очках соперничества")).toBeNull();
  expect(screen.queryByText("Печати из собственных сундуков")).toBeNull();
  expect(screen.queryByText("Печати из полученных сундуков")).toBeNull();
  expect(screen.queryByText("Пока нет полученных наград")).toBeNull();
});

test("shows all twelve quest cashback resources with icons and zero values", () => {
  render(
    <WeeklyRivalryCashback
      resources={getWeeklyQuestCashbackResources(beastlyEchoesConfig)}
      rewards={[]}
      title="Кешбэк заданий"
    />,
  );

  expect(screen.getAllByLabelText(/^Кешбэк заданий — /)).toHaveLength(12);
  expect(
    screen.getByLabelText("Кешбэк заданий — Печати зверя: 0"),
  ).toBeTruthy();
  expect(
    screen.getByLabelText("Кешбэк заданий — Фрагмент Меча Мурамаса: 0"),
  ).toBeTruthy();
  expect(screen.queryByText("Пока нет полученных наград")).toBeNull();
});

test("keeps reached cashback totals isolated between zones", () => {
  const rivalry = calculateWeeklyRivalryEventProgress(
    normalizeWeeklyRivalryInput({ ownedSpendResource: 100 }),
    beastlyEchoesConfig,
  ).rivalryProgress;
  const quests = calculateWeeklyRivalryEventProgress(
    normalizeWeeklyRivalryInput({ ownedSpendResource: 5 }),
    beastlyEchoesConfig,
  ).questProgress;
  const { rerender } = render(
    <WeeklyRivalryCashback
      resources={getWeeklyRivalryCashbackResources(beastlyEchoesConfig)}
      rewards={rivalry.cashbackRewards}
      title="Кешбэк соперничества"
    />,
  );

  expect(screen.getByText("Кешбэк соперничества")).toBeTruthy();
  expect(
    screen.getByLabelText(
      "Кешбэк соперничества — Персон. сундук еженед. события: 10",
    ),
  ).toBeTruthy();

  rerender(
    <WeeklyRivalryCashback
      resources={getWeeklyQuestCashbackResources(beastlyEchoesConfig)}
      rewards={quests.cashbackRewards}
      title="Кешбэк заданий"
    />,
  );
  expect(screen.getByText("Кешбэк заданий")).toBeTruthy();
  expect(
    screen.queryByLabelText(
      "Кешбэк соперничества — Персон. сундук еженед. события: 10",
    ),
  ).toBeNull();
  expect(
    screen.getByLabelText("Кешбэк заданий — Печати зверя: 2"),
  ).toBeTruthy();
});
