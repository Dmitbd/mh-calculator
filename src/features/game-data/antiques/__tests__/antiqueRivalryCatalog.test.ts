import fs from "node:fs";
import path from "node:path";

import {
  ANTIQUE_EVENT_MAX_SCORE,
  ANTIQUE_MAJOR_THRESHOLDS,
  ANTIQUE_NODE_STEP,
  antiqueResourceCatalog,
  antiqueRivalryRewards,
} from "..";

const treasureFragmentResources = [
  {
    resource: antiqueResourceCatalog.legendaryChestFragments,
    label: "Фрагменты королевского сокровища",
    icon: "/img/antiques/royal-treasure-fragments.png",
  },
  {
    resource: antiqueResourceCatalog.mythicChestFragments,
    label: "Фрагменты небесного сокровища",
    icon: "/img/antiques/celestial-treasure-fragments.png",
  },
];

test("maps the supplied antique icons to the correct resources", () => {
  expect(antiqueResourceCatalog.researchCoins.icon).toBe(
    "/img/antiques/research-coins.png",
  );
  expect(antiqueResourceCatalog.templeMap.icon).toBe(
    "/img/antiques/temple-map.png",
  );
  expect(antiqueResourceCatalog.tombMap.icon).toBe(
    "/img/antiques/tomb-map.png",
  );
});

test("maps the supplied treasure fragment icons and game names", () => {
  for (const { resource, label, icon } of treasureFragmentResources) {
    expect(resource.label).toBe(label);
    expect(resource.icon).toBe(icon);
    expect(fs.existsSync(path.join(process.cwd(), "public", icon))).toBe(true);
  }
});

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
