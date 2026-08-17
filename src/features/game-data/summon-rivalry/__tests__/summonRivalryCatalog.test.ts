import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  SUMMON_RIVALRY_MAJOR_THRESHOLDS,
  SUMMON_RIVALRY_MAX_SCORE,
  SUMMON_RIVALRY_NODE_STEP,
  summonRivalryResourceCatalog,
  summonRivalryRewards,
} from "..";

test("defines all summon rivalry nodes and major rewards", () => {
  expect(SUMMON_RIVALRY_NODE_STEP).toBe(750);
  expect(SUMMON_RIVALRY_MAX_SCORE).toBe(12_000);
  expect(SUMMON_RIVALRY_MAJOR_THRESHOLDS).toEqual([
    3_000,
    6_000,
    9_000,
    12_000,
  ]);
  expect(summonRivalryRewards.map(({ score }) => score)).toEqual(
    Array.from({ length: 16 }, (_, index) => (index + 1) * 750),
  );

  for (const reward of summonRivalryRewards) {
    const isMajor = SUMMON_RIVALRY_MAJOR_THRESHOLDS.includes(reward.score);
    expect(reward).toMatchObject(
      isMajor
        ? {
            commonScrolls: 0,
            fateCrystals: 5,
            ssrFragments: 0,
            urFragments: 5,
          }
        : {
            commonScrolls: 5,
            fateCrystals: 0,
            ssrFragments: 5,
            urFragments: 0,
          },
    );
  }
});

test("maps verified resource ids to stable local PNG paths", () => {
  expect(
    Object.fromEntries(
      Object.values(summonRivalryResourceCatalog).map((resource) => [
        resource.resourceId,
        resource.icon,
      ]),
    ),
  ).toEqual({
    100001: "/img/summon-rivalry/diamond.png",
    400002: "/img/summon-rivalry/ssr-hero-fragment.png",
    400003: "/img/summon-rivalry/ur-hero-fragment.png",
    700008: "/img/summon-rivalry/common-summon-scroll.png",
    700009: "/img/summon-rivalry/faction-summon-scroll.png",
    700010: "/img/summon-rivalry/limited-summon-scroll.png",
    700011: "/img/summon-rivalry/fate-crystal.png",
  });

  for (const resource of Object.values(summonRivalryResourceCatalog)) {
    expect(
      existsSync(join(process.cwd(), "public", resource.icon.slice(1))),
    ).toBe(true);
  }
});
