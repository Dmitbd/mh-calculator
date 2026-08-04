import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AntiqueCashback } from "../components/AntiqueCashback";
import { AntiqueCoinAllocation } from "../components/AntiqueCoinAllocation";
import { AntiqueOwnedCards } from "../components/AntiqueOwnedCards";
import { AntiqueRewardTrack } from "../components/AntiqueRewardTrack";
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

test("shows the five summary values without recalculating them", () => {
  render(<AntiqueSummary result={result} />);

  expect(screen.getByLabelText("Итоговые очки: 3600")).toBeTruthy();
  expect(screen.getByLabelText("Исходные очки: 2850")).toBeTruthy();
  expect(screen.getByLabelText("Осталось очков: 8400")).toBeTruthy();
  expect(screen.getByLabelText("Открыто узлов: 4 из 16")).toBeTruthy();
  expect(
    screen.getByLabelText("Открыто крупных сундуков: 1 из 4"),
  ).toBeTruthy();
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

  expect(screen.getByText("Неиспользовано монет: 499")).toBeTruthy();
  expect(screen.getByLabelText("Карт гробницы: 20")).toBeTruthy();
  expect(screen.getByLabelText("Карт храма: 0")).toBeTruthy();

  const addTomb = screen.getByLabelText("Увеличить карты гробницы");
  const removeTemple = screen.getByLabelText("Уменьшить карты храма");
  expect(addTomb.props.disabled).toBe(true);
  expect(addTomb.props.accessibilityState).toEqual({ disabled: true });
  expect(removeTemple.props.disabled).toBe(true);
  expect(removeTemple.props.accessibilityState).toEqual({ disabled: true });
  expect(StyleSheet.flatten(addTomb.props.style).opacity).toBeLessThan(1);
  expect(StyleSheet.flatten(removeTemple.props.style).opacity).toBeLessThan(1);

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

test("renders all 16 accessible reward nodes and four major markers", () => {
  render(<AntiqueRewardTrack openedNodes={result.openedNodes} />);

  expect(screen.getAllByLabelText(/^Узел награды /)).toHaveLength(16);
  expect(screen.getAllByLabelText(/крупный сундук$/)).toHaveLength(4);
  expect(
    screen.getByLabelText("Узел награды 4: 3000 очков, открыт, крупный сундук"),
  ).toBeTruthy();
  expect(
    screen.getByLabelText("Узел награды 16: 12000 очков, закрыт, крупный сундук"),
  ).toBeTruthy();
  expect(
    screen.queryByLabelText(
      "Узел награды 15: 11250 очков, закрыт, крупный сундук",
    ),
  ).toBeNull();
});

test("shows all four cashback resources and values", () => {
  render(<AntiqueCashback cashback={result.cashback} />);

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
