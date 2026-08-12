import {
  convertToTempleMap,
  convertToTombMaps,
  getCoinAllocation,
} from "../model/allocateAntiqueCoins";
import { calculateAntiqueRivalry } from "../model/calculateAntiqueRivalry";
import { normalizeAntiqueCount } from "../model/normalizeAntiqueInput";

test("normalizes antique values to non-negative integers", () => {
  expect(normalizeAntiqueCount(12.9)).toBe(12);
  expect(normalizeAntiqueCount("7.8")).toBe(7);
  expect(normalizeAntiqueCount(-5)).toBe(0);
  expect(normalizeAntiqueCount(Number.POSITIVE_INFINITY)).toBe(0);
  expect(normalizeAntiqueCount("not-a-number")).toBe(0);
});

test("allocates spendable coins to tomb maps by default", () => {
  expect(getCoinAllocation(499, 0)).toEqual({
    spendableCoins: 0,
    unusedCoins: 499,
    tombMaps: 0,
    templeMaps: 0,
    templeMapAllocation: 0,
  });
  expect(getCoinAllocation(10_000, 0)).toEqual({
    spendableCoins: 10_000,
    unusedCoins: 0,
    tombMaps: 20,
    templeMaps: 0,
    templeMapAllocation: 0,
  });
  expect(getCoinAllocation(10_499, 10)).toEqual({
    spendableCoins: 10_000,
    unusedCoins: 499,
    tombMaps: 0,
    templeMaps: 10,
    templeMapAllocation: 10,
  });
});

test("clamps allocation and converts maps in both directions", () => {
  expect(getCoinAllocation(2_000, 99).templeMapAllocation).toBe(2);
  expect(getCoinAllocation(-1, -1)).toMatchObject({
    spendableCoins: 0,
    unusedCoins: 0,
    tombMaps: 0,
    templeMaps: 0,
  });
  expect(convertToTempleMap({ coins: 10_000, templeMapAllocation: 0 })).toBe(1);
  expect(convertToTempleMap({ coins: 10_000, templeMapAllocation: 10 })).toBe(10);
  expect(convertToTombMaps({ coins: 10_000, templeMapAllocation: 1 })).toBe(0);
  expect(convertToTombMaps({ coins: 10_000, templeMapAllocation: 0 })).toBe(0);
});

test("keeps the base score invariant for equivalent 2:1 allocations", () => {
  const tombResult = calculateAntiqueRivalry({
    coins: 10_000,
    templeMapAllocation: 0,
    ownedTombMaps: 0,
    ownedTempleMaps: 0,
  });
  const templeResult = calculateAntiqueRivalry({
    coins: 10_000,
    templeMapAllocation: 10,
    ownedTombMaps: 0,
    ownedTempleMaps: 0,
  });

  expect(tombResult.baseScore).toBe(600);
  expect(templeResult.baseScore).toBe(600);
  expect(tombResult.totalScore).toBe(600);
  expect(templeResult.totalScore).toBe(600);
  expect(tombResult.openedNodes).toBe(0);
  expect(tombResult.openedMajorChests).toBe(0);
});

test("normalizes calculator inputs and adds owned maps to spent maps", () => {
  const result = calculateAntiqueRivalry({
    coins: "invalid",
    templeMapAllocation: -4,
    ownedTombMaps: 1.9,
    ownedTempleMaps: "1",
  });

  expect(result.baseScore).toBe(90);
  expect(result.totalScore).toBe(90);
  expect(result.spentMaps).toEqual({ tombMaps: 1, templeMaps: 1 });
  expect(result.scoreRemaining).toBe(11_910);
});

test("does not open a reward node just below its threshold", () => {
  const result = calculateAntiqueRivalry({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 24,
    ownedTempleMaps: 0,
  });

  expect(result.baseScore).toBe(720);
  expect(result.totalScore).toBe(720);
  expect(result.openedNodes).toBe(0);
  expect(result.cashback).toEqual({
    tombMaps: 0,
    templeMaps: 0,
    legendaryChestFragments: 0,
    mythicChestFragments: 0,
  });
});

test("applies a reached node cashback once", () => {
  const result = calculateAntiqueRivalry({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 25,
    ownedTempleMaps: 0,
  });

  expect(result.baseScore).toBe(750);
  expect(result.cashback.tombMaps).toBe(5);
  expect(result.totalScore).toBe(900);
  expect(result.openedNodes).toBe(1);
});

test("uses cashback to unlock a later node without reapplying earlier deltas", () => {
  const result = calculateAntiqueRivalry({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 45,
    ownedTempleMaps: 0,
  });

  expect(result.baseScore).toBe(1_350);
  expect(result.cashback).toEqual({
    tombMaps: 10,
    templeMaps: 0,
    legendaryChestFragments: 100,
    mythicChestFragments: 0,
  });
  expect(result.totalScore).toBe(1_650);
  expect(result.openedNodes).toBe(2);
});

test("shows reached cashback without adding it to score when disabled", () => {
  const result = calculateAntiqueRivalry({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 45,
    ownedTempleMaps: 0,
    includeCashback: false,
  });

  expect(result.baseScore).toBe(1_350);
  expect(result.totalScore).toBe(1_350);
  expect(result.openedNodes).toBe(1);
  expect(result.cashback).toEqual({
    tombMaps: 5,
    templeMaps: 0,
    legendaryChestFragments: 50,
    mythicChestFragments: 0,
  });
  expect(result.spentMaps).toEqual({ tombMaps: 45, templeMaps: 0 });
});

test("cascades across multiple thresholds in one ascending pass", () => {
  const result = calculateAntiqueRivalry({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 95,
    ownedTempleMaps: 0,
  });

  expect(result.baseScore).toBe(2_850);
  expect(result.cashback).toEqual({
    tombMaps: 15,
    templeMaps: 5,
    legendaryChestFragments: 150,
    mythicChestFragments: 50,
  });
  expect(result.totalScore).toBe(3_600);
  expect(result.openedNodes).toBe(4);
  expect(result.openedMajorChests).toBe(1);
});

test("caps progress counters while preserving score above the final node", () => {
  const result = calculateAntiqueRivalry({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 400,
    ownedTempleMaps: 0,
  });

  expect(result.baseScore).toBe(12_000);
  expect(result.totalScore).toBe(15_000);
  expect(result.scoreRemaining).toBe(0);
  expect(result.openedNodes).toBe(16);
  expect(result.openedMajorChests).toBe(4);
  expect(result.cashback).toEqual({
    tombMaps: 60,
    templeMaps: 20,
    legendaryChestFragments: 600,
    mythicChestFragments: 200,
  });
  expect(result.spentMaps).toEqual({ tombMaps: 460, templeMaps: 20 });
});
