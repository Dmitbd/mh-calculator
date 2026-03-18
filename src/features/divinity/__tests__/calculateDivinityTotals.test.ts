import levels from "../data/divinity-levels.json";
import { calculateDivinityTotals } from "../model/calculateDivinityTotals";
import { getCurrentDivinityStep } from "../model/getCurrentDivinityStep";

test("divinity levels expose segment counts and stone costs", () => {
  expect(levels[0]).toMatchObject({
    level: 1,
    segmentCount: 3,
    segmentCost: {
      stone1: 1,
      stone2: 0,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
    transitionCost: {
      stone1: 0,
      stone2: 2,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
  });
});

test("calculates cumulative costs for fully completed levels", () => {
  expect(
    calculateDivinityTotals(levels, {
      startLevel: 1,
      endLevel: 19,
      currentLevel: 3,
      filledSegments: 0,
    }),
  ).toEqual({
    startLevel: 1,
    endLevel: 19,
    currentLevel: 3,
    filledSegments: 0,
    totalCost: {
      stone1: 9,
      stone2: 6,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
  });
});

test("calculates partial costs inside the current level", () => {
  expect(
    calculateDivinityTotals(levels, {
      startLevel: 1,
      endLevel: 19,
      currentLevel: 2,
      filledSegments: 2,
    }),
  ).toEqual({
    startLevel: 1,
    endLevel: 19,
    currentLevel: 2,
    filledSegments: 2,
    totalCost: {
      stone1: 7,
      stone2: 2,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
  });
});

test("returns the current target level progress", () => {
  expect(
    getCurrentDivinityStep(levels, {
      startLevel: 1,
      endLevel: 19,
      currentLevel: 2,
      filledSegments: 2,
    }),
  ).toMatchObject({
    level: 2,
    segmentCount: 3,
    filledSegments: 2,
    transitionReady: false,
  });
});

test("returns transition ready when all segments are filled", () => {
  expect(
    getCurrentDivinityStep(levels, {
      startLevel: 1,
      endLevel: 19,
      currentLevel: 2,
      filledSegments: 3,
    }),
  ).toMatchObject({
    level: 2,
    transitionReady: true,
  });
});

test("returns null at the maximum completed level", () => {
  expect(
    getCurrentDivinityStep(levels, {
      startLevel: 1,
      endLevel: 30,
      currentLevel: 30,
      filledSegments: 0,
    }),
  ).toBeNull();
});

test("returns null when the selected range maximum is reached", () => {
  expect(
    getCurrentDivinityStep(levels, {
      startLevel: 1,
      endLevel: 5,
      currentLevel: 5,
      filledSegments: 0,
    }),
  ).toBeNull();
});

test("limits totals to the selected range", () => {
  expect(
    calculateDivinityTotals(levels, {
      startLevel: 4,
      endLevel: 8,
      currentLevel: 6,
      filledSegments: 1,
    }),
  ).toEqual({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 6,
    filledSegments: 1,
    totalCost: {
      stone1: 44,
      stone2: 18,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
  });
});

test("includes level 30 as the maximum divinity level", () => {
  expect(levels[levels.length - 1]).toMatchObject({
    level: 30,
    segmentCount: 6,
  });
});

test("calculates totals with stone6 and stone7 costs", () => {
  expect(
    calculateDivinityTotals(levels, {
      startLevel: 24,
      endLevel: 30,
      currentLevel: 25,
      filledSegments: 2,
    }),
  ).toEqual({
    startLevel: 24,
    endLevel: 30,
    currentLevel: 25,
    filledSegments: 2,
    totalCost: {
      stone1: 0,
      stone2: 0,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 78,
      stone7: 31,
    },
  });
});
