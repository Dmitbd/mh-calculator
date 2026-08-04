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
  expect(antiqueRivalryRewards.at(-1)).toEqual({
    score: 12_000,
    tombMaps: 60,
    templeMaps: 20,
    legendaryChestFragments: 600,
    mythicChestFragments: 200,
  });
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
