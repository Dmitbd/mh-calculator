import {
  calculateRemainingDivinityCosts,
} from "../model/calculateRemainingDivinityCosts";
import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import type { StoneCosts } from "../model/types";

const costs = (
  values: Partial<StoneCosts> = {},
): StoneCosts => ({
  stone1: 0,
  stone2: 0,
  stone3: 0,
  stone4: 0,
  stone5: 0,
  stone6: 0,
  stone7: 0,
  ...values,
});

test("keeps raw costs when owned resources are empty", () => {
  const totalCost = costs({ stone1: 82, stone6: 398, stone7: 422 });

  expect(
    calculateRemainingDivinityCosts(
      totalCost,
      createEmptyDivinityOwnedResources(),
    ),
  ).toEqual(totalCost);
});

test("subtracts individual gems before allocating chests", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.gemCounts[1] = 20;
  resources.chestCounts["600001"] = 1;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 20, stone2: 12 }),
      resources,
    ),
  ).toEqual(costs());
});

test("small chests close levels one through five from low to high", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 3;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 21, stone2: 13, stone3: 6 }),
      resources,
    ),
  ).toEqual(costs({ stone2: 1, stone3: 6 }));
});

test("does not carry a fixed chest reward excess to the next level", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 1;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 1, stone2: 12 }),
      resources,
    ),
  ).toEqual(costs({ stone2: 12 }));
});

test("large chests close levels six and seven before lower levels", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600076"] = 3;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 40, stone6: 5, stone7: 4 }),
      resources,
    ),
  ).toEqual(costs({ stone1: 40, stone7: 1 }));
});

test("remaining large chests close low-level deficits after small chests run out", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 1;
  resources.chestCounts["600076"] = 2;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 41, stone2: 24 }),
      resources,
    ),
  ).toEqual(costs());
});

test("extra resources never create negative remaining costs", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.gemCounts[7] = 100;
  resources.chestCounts["600001"] = 100;
  resources.chestCounts["600076"] = 100;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 1, stone7: 1 }),
      resources,
    ),
  ).toEqual(costs());
});
