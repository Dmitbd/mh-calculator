import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AntiqueCashback } from "../components/AntiqueCashback";
import { AntiqueCoinAllocation } from "../components/AntiqueCoinAllocation";
import { AntiqueOwnedCards } from "../components/AntiqueOwnedCards";
import { AntiqueRewardTrack } from "../components/AntiqueRewardTrack";
import { AntiqueScoreProgress } from "../components/AntiqueScoreProgress";
import { AntiqueSummary } from "../components/AntiqueSummary";
import type { AntiqueRivalryResult } from "../model/types";

const result: AntiqueRivalryResult = {
  baseScore: 2_850,
  totalScore: 3_600,
  scoreRemaining: 8_400,
  openedNodes: 4,
  openedMajorChests: 1,
  allocation: {
    spendableCoins: 10_000,
    unusedCoins: 499,
    tombMaps: 20,
    templeMaps: 0,
    templeMapAllocation: 0,
  },
  cashback: {
    tombMaps: 15,
    templeMaps: 5,
    legendaryChestFragments: 150,
    mythicChestFragments: 50,
  },
  spentMaps: {
    tombMaps: 110,
    templeMaps: 5,
  },
};

test("shows only the rivalry calculator heading", () => {
  render(<AntiqueSummary result={result} />);

  expect(
    screen.getByText("Калькулятор соперничества за антиквариат"),
  ).toBeTruthy();
  expect(screen.queryByText("Прогресс соперничества")).toBeNull();
  expect(screen.queryByText("Итоговые очки")).toBeNull();
  expect(screen.queryByText("Исходные очки")).toBeNull();
  expect(screen.queryByText("До 12 000")).toBeNull();
  expect(screen.queryByText("Узлы")).toBeNull();
  expect(screen.queryByText("Крупные сундуки")).toBeNull();
});

test("forwards raw coin input and linked conversion actions", () => {
  const onChangeCoins = jest.fn();
  const onConvertToTemple = jest.fn();
  const onConvertToTombs = jest.fn();

  const { rerender } = render(
    <AntiqueCoinAllocation
      allocation={result.allocation}
      canConvertToTemple
      canConvertToTombs={false}
      coins={10_499}
      onChangeCoins={onChangeCoins}
      onConvertToTemple={onConvertToTemple}
      onConvertToTombs={onConvertToTombs}
    />,
  );

  const input = screen.getByLabelText("Количество монет исследования");
  expect(input.props.keyboardType).toBe("number-pad");
  expect(input.props.value).toBe("10499");
  fireEvent.changeText(input, "12abc");
  expect(onChangeCoins).toHaveBeenCalledWith("12abc");

  expect(screen.getByText("Обмен монет на карты")).toBeTruthy();
  expect(screen.queryByText(/Неиспользовано монет:/)).toBeNull();
  expect(screen.getByLabelText("Карт гробницы: 20")).toBeTruthy();
  expect(screen.getByLabelText("Карт храма: 0")).toBeTruthy();

  const addTomb = screen.getByLabelText("Увеличить карты гробницы");
  const removeTemple = screen.getByLabelText("Уменьшить карты храма");
  expect(addTomb.props.accessibilityState).toEqual({ disabled: true });
  expect(removeTemple.props.accessibilityState).toEqual({ disabled: true });
  expect(StyleSheet.flatten(addTomb.props.style).opacity).toBeLessThan(1);
  expect(StyleSheet.flatten(removeTemple.props.style).opacity).toBeLessThan(1);
  expect(StyleSheet.flatten(addTomb.props.style)).toMatchObject({
    height: 44,
    width: 44,
  });

  fireEvent.press(addTomb);
  fireEvent.press(removeTemple);
  expect(onConvertToTombs).not.toHaveBeenCalled();

  fireEvent.press(screen.getByLabelText("Уменьшить карты гробницы"));
  fireEvent.press(screen.getByLabelText("Увеличить карты храма"));
  expect(onConvertToTemple).toHaveBeenCalledTimes(2);
  expect(onConvertToTombs).not.toHaveBeenCalled();

  rerender(
    <AntiqueCoinAllocation
      allocation={{
        ...result.allocation,
        tombMaps: 18,
        templeMaps: 1,
        templeMapAllocation: 1,
      }}
      canConvertToTemple
      canConvertToTombs
      coins={10_499}
      onChangeCoins={onChangeCoins}
      onConvertToTemple={onConvertToTemple}
      onConvertToTombs={onConvertToTombs}
    />,
  );

  fireEvent.press(screen.getByLabelText("Увеличить карты гробницы"));
  fireEvent.press(screen.getByLabelText("Уменьшить карты храма"));
  expect(onConvertToTombs).toHaveBeenCalledTimes(2);
});

test("forwards raw owned-card inputs", () => {
  const onChangeOwnedTombMaps = jest.fn();
  const onChangeOwnedTempleMaps = jest.fn();

  render(
    <AntiqueOwnedCards
      ownedTempleMaps={3}
      ownedTombMaps={7}
      onChangeOwnedTempleMaps={onChangeOwnedTempleMaps}
      onChangeOwnedTombMaps={onChangeOwnedTombMaps}
    />,
  );

  const tombInput = screen.getByLabelText("Количество своих карт гробницы");
  const templeInput = screen.getByLabelText("Количество своих карт храма");
  expect(tombInput.props.keyboardType).toBe("number-pad");
  expect(templeInput.props.keyboardType).toBe("number-pad");
  expect(tombInput.props.value).toBe("7");
  expect(templeInput.props.value).toBe("3");

  fireEvent.changeText(tombInput, "8x");
  fireEvent.changeText(templeInput, "4y");
  expect(onChangeOwnedTombMaps).toHaveBeenCalledWith("8x");
  expect(onChangeOwnedTempleMaps).toHaveBeenCalledWith("4y");
});

test("renders all 16 accessible reward chests in order without visible node numbers", () => {
  render(
    <AntiqueRewardTrack
      openedNodes={result.openedNodes}
      totalScore={result.totalScore}
    />,
  );

  const expectedChestLabels = [
    "Сундук награды 1: 750 очков, открыт",
    "Сундук награды 2: 1500 очков, открыт",
    "Сундук награды 3: 2250 очков, открыт",
    "Сундук награды 4: 3000 очков, открыт, большой сундук",
    "Сундук награды 5: 3750 очков, закрыт",
    "Сундук награды 6: 4500 очков, закрыт",
    "Сундук награды 7: 5250 очков, закрыт",
    "Сундук награды 8: 6000 очков, закрыт, большой сундук",
    "Сундук награды 9: 6750 очков, закрыт",
    "Сундук награды 10: 7500 очков, закрыт",
    "Сундук награды 11: 8250 очков, закрыт",
    "Сундук награды 12: 9000 очков, закрыт, большой сундук",
    "Сундук награды 13: 9750 очков, закрыт",
    "Сундук награды 14: 10500 очков, закрыт",
    "Сундук награды 15: 11250 очков, закрыт",
    "Сундук награды 16: 12000 очков, закрыт, большой сундук",
  ];
  const expectedLargeChestLabels = [
    "Сундук награды 4: 3000 очков, открыт, большой сундук",
    "Сундук награды 8: 6000 очков, закрыт, большой сундук",
    "Сундук награды 12: 9000 очков, закрыт, большой сундук",
    "Сундук награды 16: 12000 очков, закрыт, большой сундук",
  ];
  const chestLabels = screen
    .getAllByLabelText(/^Сундук награды /)
    .map((node) => node.props.accessibilityLabel);

  expect(chestLabels).toEqual(expectedChestLabels);
  expect(
    chestLabels.filter((label) => label.endsWith("большой сундук")),
  ).toEqual(expectedLargeChestLabels);
  expect(
    screen.queryByText(
      "Четыре линии · большой сундук каждые 3 000 очков",
    ),
  ).toBeNull();
  for (let nodeNumber = 1; nodeNumber <= 16; nodeNumber += 1) {
    expect(screen.queryByText(String(nodeNumber))).toBeNull();
  }
});

test.each([
  [0, 0, [false, true, true, true]],
  [3_600, 4, [false, false, true, true]],
  [12_000, 16, [false, false, false, false]],
])(
  "marks reward rows available for a total score of %i",
  (totalScore, openedNodes, disabledRows) => {
    render(
      <AntiqueRewardTrack
        openedNodes={openedNodes}
        totalScore={totalScore}
      />,
    );

    const rows = screen.getAllByLabelText(/^Линия наград /);

    expect(rows).toHaveLength(4);
    expect(
      rows.map((row) => row.props.accessibilityState?.disabled),
    ).toEqual(disabledRows);
  },
);

test.each([
  [0, "0 / 12000", "Очки соревнования: 0 из 12000"],
  [15_000, "15000 / 12000", "Очки соревнования: 15000 из 12000"],
])(
  "shows the uncapped rivalry score %i against the fixed maximum",
  (totalScore, visibleValue, accessibilityLabel) => {
    render(<AntiqueScoreProgress totalScore={totalScore} />);

    expect(screen.getByText("Очки соревнования")).toBeTruthy();
    expect(screen.getByText(visibleValue)).toBeTruthy();
    expect(screen.getByLabelText(accessibilityLabel)).toBeTruthy();
  },
);

test("shows all four cashback resources and values", () => {
  render(<AntiqueCashback cashback={result.cashback} />);

  expect(screen.getByText("Ресурсы из открытых сундуков")).toBeTruthy();
  expect(screen.getAllByLabelText(/^Кешбэк — /)).toHaveLength(4);
  expect(screen.getByLabelText("Кешбэк — Карта гробницы: 15")).toBeTruthy();
  expect(screen.getByLabelText("Кешбэк — Карта храма: 5")).toBeTruthy();
  expect(
    screen.getByLabelText(
      "Кешбэк — Фрагменты легендарного сундука антиквариата: 150",
    ),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(
      "Кешбэк — Фрагменты мифического сундука антиквариата: 50",
    ),
  ).toBeTruthy();
});
