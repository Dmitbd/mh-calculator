import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";
import moranaBuild from "@/features/game-data/heroes/builds/morana.json";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import * as heroBuildTabsModel from "@/features/game-data/heroes/heroBuildTabs";

import {
  HERO_BUILD_SET_SCHEMA_LIMITS,
  HeroBuildSetSchemaError,
  parseHeroBuildSet,
} from "../heroBuildSetSchema";

const validBastetBuildSet = parseHeroBuildSet(bastetBuild, "bastet");

function getPayload(): HeroBuildSet {
  return structuredClone(validBastetBuildSet);
}

function expectInvalidPayload(
  mutate: (payload: ReturnType<typeof getPayload>) => void,
  expectedPath: string,
) {
  const payload = getPayload();
  mutate(payload);

  expect(() => parseHeroBuildSet(payload, "bastet")).toThrow(
    HeroBuildSetSchemaError,
  );

  try {
    parseHeroBuildSet(payload, "bastet");
  } catch (error) {
    expect(error).toBeInstanceOf(HeroBuildSetSchemaError);
    expect((error as HeroBuildSetSchemaError).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: expect.stringContaining(expectedPath) }),
      ]),
    );
  }
}

function getSchemaError(value: unknown): HeroBuildSetSchemaError {
  try {
    parseHeroBuildSet(value, "bastet");
  } catch (error) {
    expect(error).toBeInstanceOf(HeroBuildSetSchemaError);
    return error as HeroBuildSetSchemaError;
  }

  throw new Error("Expected parseHeroBuildSet to reject the payload");
}

function createLeaf(index: number): Record<string, unknown> {
  const leaf = structuredClone(getPayload().tabs[0]) as unknown as Record<
    string,
    unknown
  >;
  leaf.id = `leaf-${index}`;
  leaf.order = index;
  return leaf;
}

describe("parseHeroBuildSet", () => {
  it("accepts the current bundled payloads", () => {
    expect(parseHeroBuildSet(getPayload(), "bastet")).toEqual(bastetBuild);
    expect(parseHeroBuildSet(moranaBuild, "morana")).toEqual(moranaBuild);
  });

  it("accepts recursively nested tab groups", () => {
    const payload = getPayload();
    const pveGroup = payload.tabs[1];
    const child = pveGroup.children![0];

    pveGroup.children = [
      {
        id: "nested-group",
        label: "Nested group",
        order: 1,
        kind: "group",
        gameMode: "pve",
        build: null,
        children: [child],
      },
    ];

    expect(parseHeroBuildSet(payload, "bastet").tabs[1].children?.[0].kind).toBe(
      "group",
    );
  });

  it("rejects tab nesting deeper than the bounded contract", () => {
    const payload = getPayload() as unknown as {
      schemaVersion: number;
      tabs: unknown[];
    };
    let nested: unknown = structuredClone(payload.tabs[0]);

    for (let depth = 0; depth < 9; depth += 1) {
      nested = {
        id: `group-${depth}`,
        label: `Group ${depth}`,
        order: depth,
        kind: "group",
        gameMode: "pvp",
        build: null,
        children: [nested],
      };
    }

    payload.tabs = [nested];

    expect(getSchemaError(payload).issues).toContainEqual({
      message: expect.stringContaining("depth"),
      path: "tabs.0.children.0.children.0.children.0.children.0.children.0.children.0.children.0.children",
    });
  });

  it("rejects an oversized tab array before traversing it", () => {
    const payload = getPayload() as unknown as {
      schemaVersion: number;
      tabs: unknown[];
    };
    const leaf = structuredClone(payload.tabs[0]) as Record<string, unknown>;

    payload.tabs = Array.from({ length: 33 }, (_, index) => ({
      ...structuredClone(leaf),
      id: `leaf-${index}`,
      order: index,
    }));

    expect(getSchemaError(payload).issues).toContainEqual({
      message: expect.stringContaining("at most 32"),
      path: "tabs",
    });
  });

  it("rejects too many leaves across individually bounded groups", () => {
    const payload = getPayload() as unknown as {
      schemaVersion: number;
      tabs: unknown[];
    };
    let leafIndex = 0;

    payload.tabs = Array.from({ length: 4 }, (_, groupIndex) => ({
      id: `group-${groupIndex}`,
      label: `Group ${groupIndex}`,
      order: groupIndex,
      kind: "group",
      gameMode: "pvp",
      build: null,
      children: Array.from({ length: 25 }, () => createLeaf(leafIndex++)),
    }));

    expect(getSchemaError(payload).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "exceeds the total leaf limit",
        }),
      ]),
    );
  });

  it("rejects too many build nodes across otherwise valid leaves", () => {
    const payload = getPayload() as unknown as {
      schemaVersion: number;
      tabs: unknown[];
    };
    let leafIndex = 0;

    payload.tabs = Array.from({ length: 4 }, (_, groupIndex) => ({
      id: `group-${groupIndex}`,
      label: `Group ${groupIndex}`,
      order: groupIndex,
      kind: "group",
      gameMode: "pvp",
      build: null,
      children: Array.from({ length: 24 }, () => createLeaf(leafIndex++)),
    }));

    expect(getSchemaError(payload).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "exceeds the total build-node limit",
        }),
      ]),
    );
  });

  it("rejects sparse arrays with the exact missing index path", () => {
    const payload = getPayload() as unknown as {
      schemaVersion: number;
      tabs: unknown[];
    };
    payload.tabs = new Array(1);

    expect(getSchemaError(payload).issues).toContainEqual({
      message: "must not contain sparse entries",
      path: "tabs.0",
    });
  });

  it("caps accumulated validation issues", () => {
    const payload = getPayload() as unknown as Record<string, unknown>;
    payload.tabs = Array.from({ length: 32 }, () => ({}));

    expect(getSchemaError(payload).issues).toHaveLength(64);
  });

  it("bounds object-key validation and caps issues for a huge object", () => {
    const payload = getPayload();
    const metadata = payload.tabs[0].build!.metadata as unknown as Record<
      string,
      unknown
    >;

    for (let index = 0; index < 10_000; index += 1) {
      metadata[`unknown-${index}`] = index;
    }

    const error = getSchemaError(payload);
    const maxObjectKeys = HERO_BUILD_SET_SCHEMA_LIMITS.maxObjectKeys;

    expect(error.issues).toContainEqual({
      message: `must contain at most ${maxObjectKeys} object keys`,
      path: "tabs.0.build.metadata",
    });
    expect(error.issues.length).toBeLessThanOrEqual(
      HERO_BUILD_SET_SCHEMA_LIMITS.maxIssues,
    );
  });

  it("does not run a second recursive tab validator", () => {
    const helper = jest
      .spyOn(heroBuildTabsModel, "validateHeroBuildTabs")
      .mockImplementation(() => {
        throw new Error("helper exploded");
      });

    try {
      expect(parseHeroBuildSet(getPayload(), "bastet")).toEqual(bastetBuild);
      expect(helper).not.toHaveBeenCalled();
    } finally {
      helper.mockRestore();
    }
  });

  it.each(["stateful", "throwing"] as const)(
    "rejects a %s nested accessor without invoking it",
    (behavior) => {
      const payload = getPayload();
      let calls = 0;

      Object.defineProperty(payload.tabs[0], "label", {
        enumerable: true,
        get() {
          calls += 1;
          if (behavior === "throwing") {
            throw new Error("getter exploded");
          }
          return calls === 1 ? "PvP" : "changed";
        },
      });

      expect(getSchemaError(payload).issues).toContainEqual({
        message: "must be a plain data property",
        path: "tabs.0.label",
      });
      expect(calls).toBe(0);
    },
  );

  it.each(["stateful", "throwing"] as const)(
    "rejects a %s nested array-entry accessor without invoking it",
    (behavior) => {
      const payload = getPayload();
      const firstTab = payload.tabs[0];
      let calls = 0;

      Object.defineProperty(payload.tabs, "0", {
        enumerable: true,
        get() {
          calls += 1;
          if (behavior === "throwing") {
            throw new Error("array getter exploded");
          }
          return firstTab;
        },
      });

      expect(getSchemaError(payload).issues).toContainEqual({
        message: "must be a plain data property",
        path: "tabs.0",
      });
      expect(calls).toBe(0);
    },
  );

  it("rejects non-plain payload objects", () => {
    const payload = Object.assign(
      Object.create({ inherited: true }) as Record<string, unknown>,
      getPayload(),
    );

    expect(getSchemaError(payload).issues).toEqual([
      { message: "must be a plain object", path: "payload" },
    ]);
  });

  it("rejects overlong bounded strings", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].label = "x".repeat(161);
    }, "tabs.0.label");
  });

  it("checks a huge string length before trimming it", () => {
    const originalTrim = String.prototype.trim;
    let hugeTrimCalls = 0;
    const trim = jest
      .spyOn(String.prototype, "trim")
      .mockImplementation(function (this: string) {
        if (this.length > HERO_BUILD_SET_SCHEMA_LIMITS.maxLabelLength) {
          hugeTrimCalls += 1;
          throw new Error("huge trim must not run");
        }
        return originalTrim.call(this);
      });

    try {
      const payload = getPayload();
      payload.tabs[0].label = "x".repeat(1_000_000);

      expect(getSchemaError(payload).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "tabs.0.label" }),
        ]),
      );
      expect(hugeTrimCalls).toBe(0);
    } finally {
      trim.mockRestore();
    }
  });

  it("rejects a non-object payload", () => {
    expect(() => parseHeroBuildSet("not-json-object", "bastet")).toThrow(
      HeroBuildSetSchemaError,
    );
  });

  it("rejects an incompatible build-set schemaVersion", () => {
    expectInvalidPayload((payload) => {
      payload.schemaVersion = 1 as 2;
    }, "schemaVersion");
  });

  it("rejects a malformed nested tab and unstable tab path id", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[1].children![0].id = "Boss Builds";
    }, "tabs.1.children.0.id");
  });

  it("requires an exact gameMode path on a ready root leaf", () => {
    const payload = getPayload();
    delete payload.tabs[0].gameMode;

    expect(getSchemaError(payload).issues).toContainEqual({
      message: "is required for a ready build",
      path: "tabs.0.gameMode",
    });
  });

  it("requires an exact gameMode path when neither a ready leaf nor its ancestor defines one", () => {
    const payload = getPayload();
    delete payload.tabs[1].gameMode;
    delete payload.tabs[1].children![0].gameMode;

    expect(getSchemaError(payload).issues).toContainEqual({
      message: "is required for a ready build",
      path: "tabs.1.children.0.gameMode",
    });
  });

  it("rejects a leaf whose hero identity differs from its row", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.heroId = "morana";
    }, "tabs.0.build.heroId");
  });

  it("rejects invalid equipment ids", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.equipment.artifactIds = ["unknown-artifact"];
    }, "equipment.artifactIds.0");
  });

  it("rejects invalid divinity branch and skill relationships", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.majorNodes[0].branchId = "asterial";
    }, "majorNodes.0.branchId");
  });

  it("rejects a committed leaf without every major divinity slot", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.majorNodes = [];
    }, "tabs.0.build.majorNodes");
  });

  it("rejects a committed leaf without every weapon awakening slot", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.weaponAwakening = [];
    }, "tabs.0.build.weaponAwakening");
  });

  it("rejects missing or below-minimum progress in every required column", () => {
    expectInvalidPayload((payload) => {
      delete payload.tabs[0].build!.progress.left;
      payload.tabs[0].build!.progress.right = 17;
    }, "tabs.0.build.progress.left");
  });

  it("rejects a major divinity node above its column progress", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.progress.left = 14;
      payload.tabs[0].build!.activeNodes = payload.tabs[0].build!.activeNodes.filter(
        (node) => node.columnId !== "left" || node.level <= 14,
      );
    }, "tabs.0.build.majorNodes.7.level");
  });

  it("rejects unknown divinity loadout ids", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.divinitySkills!.base = ["unknown-skill"];
    }, "divinitySkills.base.0");
  });

  it("rejects a divinity loadout over its node budget", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.divinitySkills!.base = [
        "asterial-new-moon",
        "asterial-night",
        "asterial-spotlight",
      ];
    }, "divinitySkills.base");
  });

  it("does bounded work for an oversized divinity loadout", () => {
    const payload = getPayload();
    const skillIds = [
      "asterial-new-moon",
      "asterial-night",
      "asterial-spotlight",
    ];
    skillIds.length = 1_000_000;
    let highestInspectedIndex = -1;
    const instrumentedSkills = new Proxy(skillIds, {
      getOwnPropertyDescriptor(target, property) {
        if (typeof property === "string" && /^\d+$/.test(property)) {
          const index = Number(property);
          highestInspectedIndex = Math.max(highestInspectedIndex, index);
          if (index > 2) {
            throw new Error("unbounded array traversal");
          }
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    payload.tabs[0].build!.divinitySkills!.base = instrumentedSkills;

    expect(getSchemaError(payload).issues).toContainEqual({
      message: "must contain at most 3 entries",
      path: "tabs.0.build.divinitySkills.base",
    });
    expect(highestInspectedIndex).toBeLessThanOrEqual(2);
  });

  it("rejects invalid progress and active-node paths", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.progress.left = 31;
      payload.tabs[0].build!.activeNodes[0].level = 999;
    }, "progress.left");
  });

  it("rejects active nodes that do not exactly match progress", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.activeNodes.pop();
    }, "activeNodes");
  });

  it("rejects a standalone builder target path inside a committed leaf", () => {
    expectInvalidPayload((payload) => {
      Object.assign(payload.tabs[0].build!, { targetTabPath: ["pvp"] });
    }, "targetTabPath");
  });

  it("rejects unknown schema fields with an exact recursive path", () => {
    const payload = getPayload();
    Object.assign(payload.tabs[1].children![0].build!.metadata, {
      unexpected: true,
    });

    expect(getSchemaError(payload).issues).toContainEqual({
      message: "is not allowed",
      path: "tabs.1.children.0.build.metadata.unexpected",
    });
  });

  it.each([
    "2026-06-16T12:25:14.491+03:00",
    "2026-02-30T12:25:14.491Z",
    "2026-06-16 12:25:14Z",
  ])("rejects a non-canonical UTC createdAt value: %s", (createdAt) => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.metadata.createdAt = createdAt;
    }, "tabs.0.build.metadata.createdAt");
  });

  it("rejects invalid stable ids in weapon selections", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.weaponAwakening[0].colorId = "orange" as "green";
    }, "weaponAwakening.0.colorId");
  });
});
