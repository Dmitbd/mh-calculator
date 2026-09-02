import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  divinityTalentConfig,
  getDivinityTalentNodeCost,
} from "..";
import type { DivinityTalentBranchId } from "..";

const EXPECTED_FAITH_COSTS = [
  0, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1050, 1200,
  1350, 1500, 1650, 1800, 2000, 2200, 2600, 2800, 3000, 3250, 3500, 3750,
  4000, 4000, 4000, 4000,
] as const;

const EXPECTED_SIDE_EXTRA_COSTS = [
  [3, 2, 0],
  [4, 1, 0],
  [5, 1, 0],
  [7, 2, 0],
  [8, 1, 0],
  [10, 2, 0],
  [11, 1, 0],
  [13, 2, 0],
  [15, 2, 0],
  [16, 1, 0],
  [17, 1, 0],
  [18, 1, 0],
  [19, 1, 10],
  [20, 1, 20],
  [21, 1, 30],
  [22, 1, 40],
  [23, 1, 50],
  [24, 1, 60],
  [25, 1, 70],
  [26, 1, 80],
  [27, 1, 100],
  [28, 1, 120],
  [29, 1, 140],
  [30, 1, 160],
] as const;

const EXPECTED_CENTER_EXTRA_COSTS = [
  [1, 0, 0],
  [2, 0, 0],
  [4, 0, 0],
  [6, 0, 0],
  [7, 0, 0],
  [8, 0, 0],
  [9, 0, 0],
  [10, 0, 0],
  [11, 0, 0],
  [12, 0, 0],
  [13, 0, 0],
  [14, 0, 0],
  [15, 0, 0],
  [16, 0, 0],
  [17, 0, 0],
  [18, 0, 0],
  [19, 0, 0],
  [20, 0, 20],
  [21, 0, 0],
  [22, 0, 0],
  [23, 0, 0],
  [24, 0, 60],
  [25, 0, 0],
  [26, 0, 0],
  [27, 0, 0],
  [28, 0, 120],
  [29, 0, 0],
  [30, 0, 0],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("Expected a record");
  }
  return value;
}

function readOriginalFaithIcons(value: unknown): Array<[number, string]> {
  const faith = requireRecord(value);
  if (!Array.isArray(faith.originalIcons)) {
    return [];
  }
  const mappings: Array<[number, string]> = [];
  faith.originalIcons.forEach((entryValue) => {
    const entry = requireRecord(entryValue);
    if (typeof entry.resourceId !== "number" || typeof entry.icon !== "string") {
      throw new Error("Invalid original faith icon mapping");
    }
    mappings.push([entry.resourceId, entry.icon]);
  });
  return mappings;
}

function expectDeeplyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(expectDeeplyFrozen);
}

function calculateBranchTotal(branchId: DivinityTalentBranchId) {
  const branch = divinityTalentConfig.branches.find(
    (item) => item.id === branchId,
  );
  if (!branch) {
    throw new Error(`Missing branch ${branchId}`);
  }
  const total = {
    nodes: 0,
    faith: 0,
    inheritedDivinity: 0,
    resonanceStone: 0,
  };
  branch.nodes.forEach((node) => {
    const cost = getDivinityTalentNodeCost(
      divinityTalentConfig,
      branchId,
      node.level,
    );
    total.nodes += 1;
    total.faith += cost.faith;
    total.inheritedDivinity += cost.inheritedDivinity;
    total.resonanceStone += cost.resonanceStone;
  });
  return total;
}

test("loads the exact 1.48.0 build 94 snapshot", () => {
  expect(divinityTalentConfig.schemaVersion).toBe(1);
  expect(divinityTalentConfig.source).toEqual({
    clientVersion: "1.48.0",
    build: 94,
  });
  expect(divinityTalentConfig.levelCosts).toHaveLength(30);
  expect(
    divinityTalentConfig.branches.map((branch) => [
      branch.id,
      branch.nodes.length,
    ]),
  ).toEqual([
    ["left", 24],
    ["center", 28],
    ["right", 24],
  ]);
});

test("preserves exact node and major-node levels", () => {
  const byId = Object.fromEntries(
    divinityTalentConfig.branches.map((branch) => [branch.id, branch]),
  );
  expect(byId.center.nodes.map((node) => node.level)).toEqual([
    1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30,
  ]);
  expect(byId.left.nodes.map((node) => node.level)).toEqual([
    3, 4, 5, 7, 8, 10, 11, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    26, 27, 28, 29, 30,
  ]);
  expect(byId.right.nodes.map((node) => node.level)).toEqual(
    byId.left.nodes.map((node) => node.level),
  );
  expect(
    byId.center.nodes
      .filter((node) => node.kind === "major")
      .map((node) => node.level),
  ).toEqual([1, 7, 13]);
  expect(
    byId.left.nodes
      .filter((node) => node.kind === "major")
      .map((node) => node.level),
  ).toEqual([3, 10, 15]);
  expect(
    byId.right.nodes
      .filter((node) => node.kind === "major")
      .map((node) => node.level),
  ).toEqual([3, 10, 15]);
});

test("preserves every faith cost without divinity gems", () => {
  expect(divinityTalentConfig.levelCosts.map((cost) => cost.faith)).toEqual(
    EXPECTED_FAITH_COSTS,
  );
  expect("gems" in divinityTalentConfig.resources).toBe(false);
  divinityTalentConfig.levelCosts.forEach((cost) => {
    expect("gems" in cost).toBe(false);
  });
});

test("preserves every branch extra cost", () => {
  const extrasByBranch = Object.fromEntries(
    divinityTalentConfig.branches.map((branch) => [
      branch.id,
      branch.nodes.map((node) => [
        node.level,
        node.inheritedDivinity,
        node.resonanceStone,
      ]),
    ]),
  );
  expect(extrasByBranch.left).toEqual(EXPECTED_SIDE_EXTRA_COSTS);
  expect(extrasByBranch.center).toEqual(EXPECTED_CENTER_EXTRA_COSTS);
  expect(extrasByBranch.right).toEqual(EXPECTED_SIDE_EXTRA_COSTS);
});

test("calculates exact branch and full-snapshot totals", () => {
  const totals = {
    left: calculateBranchTotal("left"),
    center: calculateBranchTotal("center"),
    right: calculateBranchTotal("right"),
  };
  expect(totals).toEqual({
    left: {
      nodes: 24,
      faith: 49450,
      inheritedDivinity: 29,
      resonanceStone: 880,
    },
    center: {
      nodes: 28,
      faith: 52150,
      inheritedDivinity: 0,
      resonanceStone: 200,
    },
    right: {
      nodes: 24,
      faith: 49450,
      inheritedDivinity: 29,
      resonanceStone: 880,
    },
  });

  const fullTotal = Object.values(totals).reduce(
    (sum, total) => ({
      nodes: sum.nodes + total.nodes,
      faith: sum.faith + total.faith,
      inheritedDivinity:
        sum.inheritedDivinity + total.inheritedDivinity,
      resonanceStone: sum.resonanceStone + total.resonanceStone,
    }),
    {
      nodes: 0,
      faith: 0,
      inheritedDivinity: 0,
      resonanceStone: 0,
    },
  );
  expect(fullTotal).toEqual({
    nodes: 76,
    faith: 151050,
    inheritedDivinity: 58,
    resonanceStone: 1960,
  });
});

test("maps every resource id to its exact configured icon", () => {
  const originalFaithIcons = readOriginalFaithIcons(
    divinityTalentConfig.resources.faith,
  );
  const mappings: Array<[number, string]> = [
    ...originalFaithIcons,
    [
      divinityTalentConfig.resources.inheritedDivinity.resourceId,
      divinityTalentConfig.resources.inheritedDivinity.icon,
    ],
    [
      divinityTalentConfig.resources.resonanceStone.resourceId,
      divinityTalentConfig.resources.resonanceStone.icon,
    ],
  ];
  mappings.sort(([leftId], [rightId]) => leftId - rightId);
  expect(mappings).toEqual([
    [700300, "/img/divinity/talents/700300.png"],
    [700301, "/img/divinity/talents/700301.png"],
    [700302, "/img/divinity/talents/700302.png"],
    [700303, "/img/divinity/talents/700303.png"],
    [700304, "/img/divinity/talents/700304.png"],
    [700306, "/img/divinity/talents/700306.png"],
  ]);
  expect(divinityTalentConfig.resources.faith.icon).toBe(
    "/img/divinity/talents/faith-combined.png",
  );

  const configuredPaths = [
    divinityTalentConfig.resources.faith.icon,
    ...mappings.map(([, icon]) => icon),
  ];
  configuredPaths.forEach((icon) => {
    expect(existsSync(join(process.cwd(), "public", icon.slice(1)))).toBe(true);
  });
});

test("exports a deeply frozen static catalog", () => {
  expectDeeplyFrozen(divinityTalentConfig);
  const originalFaith = divinityTalentConfig.levelCosts[0].faith;
  expect(
    Reflect.set(divinityTalentConfig.levelCosts[0], "faith", 999999),
  ).toBe(false);
  expect(divinityTalentConfig.levelCosts[0].faith).toBe(originalFaith);
});
