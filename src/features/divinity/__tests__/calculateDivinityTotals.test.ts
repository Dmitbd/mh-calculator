import steps from "../data/divinity-steps.json";
import { calculateDivinityTotals } from "../model/calculateDivinityTotals";
import { getNextDivinityStep } from "../model/getNextDivinityStep";

test("divinity steps expose progress indices and stone costs", () => {
  expect(steps[0]).toMatchObject({
    fromLevel: 0,
    toLevel: 1,
    label: "18-19",
    totalCost: { stone5: 70, stone6: 0, stone7: 0 },
  });
});

test("calculates cumulative costs up to the selected level", () => {
  expect(calculateDivinityTotals(steps, 2)).toEqual({
    currentLevel: 2,
    totalCost: { stone5: 134, stone6: 16, stone7: 0 },
  });
});

test("returns the next step for the current level", () => {
  expect(getNextDivinityStep(steps, 2)).toMatchObject({
    fromLevel: 2,
    toLevel: 3,
    label: "20-21",
  });
});

test("returns null when there is no next step", () => {
  expect(getNextDivinityStep(steps, 13)).toBeNull();
});
