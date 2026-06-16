import type { HeroBuildSet, HeroBuildTab } from "@/features/heroes/types/heroes.types";

import {
  findFirstReadyBuildTab,
  getBuildAtPath,
  getDefaultTabPath,
  getDefaultTabPathFromTabs,
  getFirstSelectablePath,
  getGameModeForPath,
  getTabByPath,
  hasReadyBuildInTabs,
  sortBuildTabs,
  validateHeroBuildTabs,
} from "../utils/heroBuildTabs";

const readyBuild = {
  schemaVersion: 1 as const,
  gameMode: "pvp" as const,
  heroName: "Test",
  columns: { left: "asterial" as const, center: "psyche" as const, right: "devoid" as const },
  majorNodes: [],
  weaponAwakening: [],
  equipment: { artifactIds: [], runeIds: [] },
  progress: {},
  activeNodes: [],
  metadata: { createdAt: "2026-01-01T00:00:00.000Z", source: "manual-branch-builder" as const },
};

const sampleTabs: HeroBuildTab[] = [
  {
    id: "pvp",
    label: "PvP",
    order: 1,
    kind: "build",
    gameMode: "pvp",
    build: null,
  },
  {
    id: "pve",
    label: "PvE",
    order: 2,
    kind: "group",
    gameMode: "pve",
    build: null,
    children: [
      {
        id: "bosses",
        label: "Боссы",
        order: 1,
        kind: "build",
        build: null,
      },
      {
        id: "campaign",
        label: "Кампания",
        order: 2,
        kind: "build",
        build: readyBuild,
      },
    ],
  },
];

describe("heroBuildTabs", () => {
  test("sortBuildTabs keeps tab order stable", () => {
    const shuffled: HeroBuildTab[] = [
      { ...sampleTabs[1], order: 2 },
      { ...sampleTabs[0], order: 1 },
    ];

    expect(sortBuildTabs(shuffled).map((tab) => tab.id)).toEqual(["pvp", "pve"]);
    expect(
      sortBuildTabs(shuffled)[1].children?.map((tab) => tab.id),
    ).toEqual(["bosses", "campaign"]);
  });

  test("findFirstReadyBuildTab finds first ready top-level build", () => {
    const tabs: HeroBuildTab[] = [
      { ...sampleTabs[0], build: readyBuild },
      sampleTabs[1],
    ];

    expect(findFirstReadyBuildTab(tabs)?.id).toBe("pvp");
  });

  test("findFirstReadyBuildTab finds first ready nested build", () => {
    expect(findFirstReadyBuildTab(sampleTabs)?.id).toBe("campaign");
  });

  test("findFirstReadyBuildTab returns null when no ready build exists", () => {
    const emptyTabs: HeroBuildTab[] = [
      { ...sampleTabs[0] },
      {
        ...sampleTabs[1],
        children: sampleTabs[1].children?.map((child) => ({ ...child, build: null })),
      },
    ];

    expect(findFirstReadyBuildTab(emptyTabs)).toBeNull();
  });

  test("hasReadyBuildInTabs returns true when a nested build is ready", () => {
    expect(hasReadyBuildInTabs(sampleTabs)).toBe(true);
  });

  test("hasReadyBuildInTabs returns false for only empty tabs", () => {
    const emptyTabs: HeroBuildTab[] = [
      { ...sampleTabs[0] },
      { ...sampleTabs[1], children: sampleTabs[1].children?.map((child) => ({ ...child, build: null })) },
    ];

    expect(hasReadyBuildInTabs(emptyTabs)).toBe(false);
  });

  test("getTabByPath resolves pvp path", () => {
    expect(getTabByPath(sampleTabs, ["pvp"])?.label).toBe("PvP");
  });

  test("getTabByPath resolves nested pve bosses path", () => {
    expect(getTabByPath(sampleTabs, ["pve", "bosses"])?.label).toBe("Боссы");
  });

  test("getTabByPath handles missing paths without throwing", () => {
    expect(getTabByPath(sampleTabs, ["missing"])).toBeNull();
    expect(getTabByPath(sampleTabs, ["pve", "missing"])).toBeNull();
    expect(getTabByPath(sampleTabs, [])).toBeNull();
  });

  test("getBuildAtPath returns build at nested path", () => {
    expect(getBuildAtPath(sampleTabs, ["pve", "campaign"])).toBe(readyBuild);
    expect(getBuildAtPath(sampleTabs, ["pve", "bosses"])).toBeNull();
  });

  test("getFirstSelectablePath returns first leaf path for grouped tab", () => {
    expect(getFirstSelectablePath(sampleTabs)).toEqual(["pvp"]);
  });

  test("getDefaultTabPathFromTabs uses tabs array index 0", () => {
    expect(getDefaultTabPathFromTabs(sampleTabs)).toEqual(["pvp"]);

    const pveFirst: HeroBuildTab[] = [
      sampleTabs[1],
      sampleTabs[0],
    ];

    expect(getDefaultTabPathFromTabs(pveFirst)).toEqual(["pve", "bosses"]);
  });

  test("getDefaultTabPath prefers first ready build path", () => {
    expect(getDefaultTabPath(sampleTabs)).toEqual(["pve", "campaign"]);
  });

  test("getDefaultTabPath falls back to first selectable path", () => {
    const emptyTabs: HeroBuildTab[] = [
      { ...sampleTabs[0] },
      { ...sampleTabs[1], children: sampleTabs[1].children?.map((child) => ({ ...child, build: null })) },
    ];

    expect(getDefaultTabPath(emptyTabs)).toEqual(["pvp"]);
  });

  test("getGameModeForPath resolves pvp path", () => {
    expect(getGameModeForPath(sampleTabs, ["pvp"])).toBe("pvp");
  });

  test("getGameModeForPath inherits pve from parent for nested path", () => {
    expect(getGameModeForPath(sampleTabs, ["pve", "bosses"])).toBe("pve");
  });

  test("getGameModeForPath returns null for missing path", () => {
    expect(getGameModeForPath(sampleTabs, ["missing"])).toBeNull();
    expect(getGameModeForPath(sampleTabs, ["pve", "missing"])).toBeNull();
  });

  test("getGameModeForPath allows nested child to override gameMode", () => {
    const tabs: HeroBuildTab[] = [
      {
        ...sampleTabs[1],
        children: [
          {
            id: "arena",
            label: "Arena",
            order: 1,
            kind: "build",
            gameMode: "pvp",
            build: null,
          },
        ],
      },
    ];

    expect(getGameModeForPath(tabs, ["pve", "arena"])).toBe("pvp");
  });

  test("validateHeroBuildTabs catches gameMode mismatch", () => {
    const invalidSet: HeroBuildSet = {
      schemaVersion: 2,
      tabs: [
        {
          id: "pve",
          label: "PvE",
          order: 1,
          kind: "build",
          gameMode: "pve",
          build: {
            ...readyBuild,
            gameMode: "pvp",
          },
        },
      ],
    };

    const errors = validateHeroBuildTabs(invalidSet);

    expect(errors.some((error) => error.includes("gameMode"))).toBe(true);
  });

  test("validateHeroBuildTabs catches duplicate sibling ids", () => {
    const invalidSet: HeroBuildSet = {
      schemaVersion: 2,
      tabs: [
        {
          id: "pvp",
          label: "PvP",
          order: 1,
          kind: "build",
          gameMode: "pvp",
          build: null,
        },
        {
          id: "pvp",
          label: "Duplicate",
          order: 2,
          kind: "build",
          gameMode: "pvp",
          build: null,
        },
      ],
    };

    expect(validateHeroBuildTabs(invalidSet)).toContain('duplicate sibling id "pvp" at pvp');
  });
});
