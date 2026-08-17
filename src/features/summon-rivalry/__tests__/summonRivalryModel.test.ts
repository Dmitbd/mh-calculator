import { calculateSummonPurchaseCosts } from "../model/calculateSummonPurchases";
import { calculateSummonRivalry } from "../model/calculateSummonRivalry";
import {
  adjustSummonPurchase,
  normalizeSummonCount,
} from "../model/normalizeSummonRivalryInput";

describe("summon rivalry input normalization", () => {
  test("normalizes resource counts and ten-item purchase steps", () => {
    expect(normalizeSummonCount("12.9")).toBe(12);
    expect(normalizeSummonCount(-1)).toBe(0);
    expect(normalizeSummonCount(Number.POSITIVE_INFINITY)).toBe(0);

    expect(adjustSummonPurchase(0, -1)).toBe(0);
    expect(adjustSummonPurchase(0, 1)).toBe(10);
    expect(adjustSummonPurchase(20, -1)).toBe(10);
    expect(adjustSummonPurchase(29, 1)).toBe(30);
  });
});

describe("diamond exchange", () => {
  test("calculates each bundle cost and the total", () => {
    expect(
      calculateSummonPurchaseCosts({
        commonScrolls: 10,
        limitedScrolls: 20,
        fateCrystals: 30,
      }),
    ).toEqual({
      commonScrolls: 2_700,
      limitedScrolls: 6_000,
      fateCrystals: 15_000,
      total: 23_700,
    });
  });
});

describe("summon rivalry score", () => {
  test("includes purchased resources in the base score and diamond spend", () => {
    expect(
      calculateSummonRivalry({
        ownedCommonScrolls: 1,
        ownedLimitedScrolls: 1,
        ownedFactionScrolls: 1,
        ownedFateCrystals: 1,
        purchasedCommonScrolls: 10,
        purchasedLimitedScrolls: 10,
        purchasedFateCrystals: 10,
      }),
    ).toMatchObject({ baseScore: 1_207, diamondCost: 10_700 });
  });

  test("does not open a node below the first threshold", () => {
    expect(
      calculateSummonRivalry({ ownedCommonScrolls: 27 }),
    ).toMatchObject({
      baseScore: 729,
      totalScore: 729,
      openedNodes: 0,
      openedMajorChests: 0,
    });
  });

  test("adds a reached normal chest to the cashback score", () => {
    expect(
      calculateSummonRivalry({ ownedLimitedScrolls: 25 }),
    ).toMatchObject({
      baseScore: 750,
      totalScore: 885,
      openedNodes: 1,
      openedMajorChests: 0,
      cashback: {
        commonScrolls: 5,
        fateCrystals: 0,
        ssrFragments: 5,
        urFragments: 0,
      },
    });
  });

  test("opens rewards sequentially when cashback crosses a major threshold", () => {
    expect(
      calculateSummonRivalry({ ownedLimitedScrolls: 95 }),
    ).toMatchObject({
      baseScore: 2_850,
      totalScore: 3_505,
      openedNodes: 4,
      openedMajorChests: 1,
      cashback: {
        commonScrolls: 15,
        fateCrystals: 5,
        ssrFragments: 15,
        urFragments: 5,
      },
    });
  });

  test("reports reached rewards without spending them when cashback is disabled", () => {
    expect(
      calculateSummonRivalry({
        ownedLimitedScrolls: 95,
        includeCashback: false,
      }),
    ).toMatchObject({
      baseScore: 2_850,
      totalScore: 2_850,
      openedNodes: 3,
      openedMajorChests: 0,
      cashback: {
        commonScrolls: 15,
        fateCrystals: 0,
        ssrFragments: 15,
        urFragments: 0,
      },
    });
  });

  test("caps track metrics while retaining the uncapped total score", () => {
    const result = calculateSummonRivalry({ ownedFateCrystals: 500 });

    expect(result.totalScore).toBeGreaterThan(12_000);
    expect(result).toMatchObject({
      openedNodes: 16,
      openedMajorChests: 4,
      scoreRemaining: 0,
    });
  });
});
