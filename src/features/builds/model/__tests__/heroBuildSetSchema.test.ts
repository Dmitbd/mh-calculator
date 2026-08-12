import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";
import moranaBuild from "@/features/game-data/heroes/builds/morana.json";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

import {
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

  it("rejects invalid stable ids in weapon selections", () => {
    expectInvalidPayload((payload) => {
      payload.tabs[0].build!.weaponAwakening[0].colorId = "orange" as "green";
    }, "weaponAwakening.0.colorId");
  });
});
