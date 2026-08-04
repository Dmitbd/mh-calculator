import {
  ANTIQUE_EVENT_MAX_SCORE,
  ANTIQUE_MAJOR_THRESHOLDS,
  ANTIQUE_NODE_STEP,
  antiqueRivalryRewards,
} from "..";

test("defines every cumulative rivalry reward node", () => {
  expect(ANTIQUE_NODE_STEP).toBe(750);
  expect(ANTIQUE_EVENT_MAX_SCORE).toBe(12_000);
  expect(ANTIQUE_MAJOR_THRESHOLDS).toEqual([3000, 6000, 9000, 12_000]);
  expect(antiqueRivalryRewards.map((row) => row.score)).toEqual(
    Array.from({ length: 17 }, (_, index) => index * 750),
  );
  expect(
    antiqueRivalryRewards.filter((row) =>
      [3_000, 6_000, 9_000, 11_250, 12_000].includes(row.score),
    ),
  ).toEqual([
    {
      score: 3_000,
      tombMaps: 15,
      templeMaps: 5,
      legendaryChestFragments: 150,
      mythicChestFragments: 50,
    },
    {
      score: 6_000,
      tombMaps: 30,
      templeMaps: 10,
      legendaryChestFragments: 300,
      mythicChestFragments: 100,
    },
    {
      score: 9_000,
      tombMaps: 45,
      templeMaps: 15,
      legendaryChestFragments: 450,
      mythicChestFragments: 150,
    },
    {
      score: 11_250,
      tombMaps: 60,
      templeMaps: 15,
      legendaryChestFragments: 600,
      mythicChestFragments: 150,
    },
    {
      score: 12_000,
      tombMaps: 60,
      templeMaps: 20,
      legendaryChestFragments: 600,
      mythicChestFragments: 200,
    },
  ]);
});

test("keeps cumulative rewards monotonic", () => {
  for (let index = 1; index < antiqueRivalryRewards.length; index += 1) {
    const previous = antiqueRivalryRewards[index - 1];
    const current = antiqueRivalryRewards[index];
    expect(current.tombMaps).toBeGreaterThanOrEqual(previous.tombMaps);
    expect(current.templeMaps).toBeGreaterThanOrEqual(previous.templeMaps);
    expect(current.legendaryChestFragments).toBeGreaterThanOrEqual(previous.legendaryChestFragments);
    expect(current.mythicChestFragments).toBeGreaterThanOrEqual(previous.mythicChestFragments);
  }
});
