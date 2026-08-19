import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  BEAST_SEAL_RESOURCE_ID,
  GLOWING_PEARL_RESOURCE_ID,
  HAMMER_OF_ASCENSION_RESOURCE_ID,
  WEEKLY_EVENT_CHEST_RESOURCE_ID,
  beastlyEchoesConfig,
  towerOfBabelConfig,
  validateWeeklyRivalryEventConfig,
  weeklyRivalryEventConfigs,
  zodiacMapConfig,
} from "../index";

describe("weekly rivalry catalog", () => {
  test.each([
    ["tower-of-babel.json", "003aa942f3ac57472d331a66447cc3b4657fbfd16f0784a949192f2d4c63bc31"],
    ["zodiac-map.json", "aeef220b04a9121f66252094148e6afd2c755c489d5ea607bccb1a282db904fd"],
    ["beastly-echoes.json", "be8559faeee75c483f249bbe64f3f1ecd6527d809ca349c6a5f32fc28b0778c5"],
    ["resources.json", "f994a9889dbbdb1e1d6fd59fc067818839393ad9edf5d16b669648563f567e63"],
  ])("keeps the verified 1.48.0 snapshot for %s", (filename, checksum) => {
    const content = readFileSync(path.join(__dirname, "..", filename));
    expect(createHash("sha256").update(content).digest("hex")).toBe(checksum);
  });

  test("exposes the Beastly Echoes event snapshot", () => {
    expect(beastlyEchoesConfig).toMatchObject({
      id: "beastly-echoes",
      title: "Звериные эхо",
      pointsPerResource: 30,
      maxRivalryScore: 12_000,
      spendResourceId: BEAST_SEAL_RESOURCE_ID,
      weeklyEventChestResourceId: WEEKLY_EVENT_CHEST_RESOURCE_ID,
    });
  });

  test("rejects duplicate task ids before a config reaches the calculator", () => {
    const duplicateId = towerOfBabelConfig.questSections[0].tasks[0].id;
    const invalid = {
      ...towerOfBabelConfig,
      questSections: towerOfBabelConfig.questSections.map((section, index) =>
        index === 1
          ? {
              ...section,
              tasks: section.tasks.map((task, taskIndex) =>
                taskIndex === 0 ? { ...task, id: duplicateId } : task,
              ),
            }
          : section,
      ),
    };

    expect(() => validateWeeklyRivalryEventConfig(invalid)).toThrow(
      "duplicate task id",
    );
  });

  test("rejects a non-boolean special-node marker", () => {
    const invalid = {
      ...towerOfBabelConfig,
      rivalryNodes: [
        { ...towerOfBabelConfig.rivalryNodes[0], isSpecial: "false" },
        ...towerOfBabelConfig.rivalryNodes.slice(1),
      ],
    };

    expect(() => validateWeeklyRivalryEventConfig(invalid)).toThrow(
      "invalid special node marker",
    );
  });

  test("rejects an unexpected snapshot version or event resource role", () => {
    expect(() =>
      validateWeeklyRivalryEventConfig({
        ...towerOfBabelConfig,
        sourceVersion: "1.49.0",
      }),
    ).toThrow("unexpected source version");
    expect(() =>
      validateWeeklyRivalryEventConfig({
        ...towerOfBabelConfig,
        spendResourceId: WEEKLY_EVENT_CHEST_RESOURCE_ID,
      }),
    ).toThrow("invalid event resource roles");
  });

  test("exposes all three weekly events through one typed catalog", () => {
    expect(weeklyRivalryEventConfigs.map((event) => event.id)).toEqual([
      "tower-of-babel",
      "zodiac-map",
      "beastly-echoes",
    ]);
    expect(towerOfBabelConfig).toMatchObject({
      title: "Вавилонская башня",
      spendResourceId: HAMMER_OF_ASCENSION_RESOURCE_ID,
      spendResourceForms: {
        singular: "молот вознесения",
        singularTitle: "Молот вознесения",
        pluralTitle: "Молоты вознесения",
        genitivePlural: "Молотов вознесения",
      },
    });
    expect(zodiacMapConfig).toMatchObject({
      title: "Карта зодиака",
      spendResourceId: GLOWING_PEARL_RESOURCE_ID,
      spendResourceForms: {
        singular: "светящаяся жемчужина",
        singularTitle: "Светящаяся жемчужина",
        pluralTitle: "Светящиеся жемчужины",
        genitivePlural: "Светящихся жемчужин",
      },
    });
  });

  test.each([
    [towerOfBabelConfig, HAMMER_OF_ASCENSION_RESOURCE_ID],
    [zodiacMapConfig, GLOWING_PEARL_RESOURCE_ID],
    [beastlyEchoesConfig, BEAST_SEAL_RESOURCE_ID],
  ])("keeps config identities and thresholds safe for %s", (config, spendId) => {
    const nodeIds = config.rivalryNodes.map((node) => node.id);
    const taskIds = config.questSections.flatMap((section) =>
      section.tasks.map((task) => task.id),
    );
    const sectionNumbers = config.questSections.map((section) => section.number);
    const thresholds = config.questSections.flatMap((section) =>
      section.tasks.map((task) => task.requiredSpend),
    );

    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    expect(new Set(taskIds).size).toBe(taskIds.length);
    expect(new Set(sectionNumbers).size).toBe(sectionNumbers.length);
    expect(config.rivalryNodes.map((node) => node.requiredScore)).toEqual(
      [...config.rivalryNodes]
        .map((node) => node.requiredScore)
        .sort((left, right) => left - right),
    );
    expect(thresholds).toEqual([...thresholds].sort((left, right) => left - right));
    expect(config.rivalryNodes.at(-1)?.requiredScore).toBe(config.maxRivalryScore);
    expect(config.spendResourceId).toBe(spendId);
  });

  test.each(weeklyRivalryEventConfigs)(
    "contains the complete sixteen-node rivalry track for $id",
    (config) => {
    expect(config.sourceVersion).toBe("1.48.0");
    expect(config.rivalryNodes).toHaveLength(16);
    expect(
      config.rivalryNodes.map((node) => node.requiredScore),
    ).toEqual(Array.from({ length: 16 }, (_, index) => (index + 1) * 750));
    expect(
      config.rivalryNodes
        .filter((node) => node.isSpecial)
        .map((node) => [node.requiredScore, node.rewards]),
    ).toEqual([
      [3000, [expect.objectContaining({ resourceId: 600053, amount: 10 })]],
      [6000, [expect.objectContaining({ resourceId: 600053, amount: 10 })]],
      [9000, [expect.objectContaining({ resourceId: 600053, amount: 10 })]],
      [12000, [expect.objectContaining({ resourceId: 600053, amount: 10 })]],
    ]);
  });

  test.each(weeklyRivalryEventConfigs)(
    "contains five complete quest sections for $id",
    (config) => {
    expect(config.questSections).toHaveLength(5);
    expect(
      config.questSections.map((section) =>
        section.tasks.map((task) => task.requiredSpend),
      ),
    ).toEqual([
      [5, 10, 20, 30, 50, 80],
      [90, 110, 130, 160, 190, 240],
      [270, 310, 350, 400, 450, 520],
      [570, 630, 690, 760, 830, 920],
      [990, 1070, 1150, 1240, 1330, 1440],
    ]);

    for (const section of config.questSections) {
      expect(section.tasks).toHaveLength(6);
      expect(section.sectionRewards).toHaveLength(4);
      for (const task of section.tasks) {
        expect(task.rewards).toHaveLength(4);
      }
    }
  });

  test("uses feature-owned public asset paths for every reward", () => {
    const rewards = weeklyRivalryEventConfigs.flatMap((config) => [
      ...config.rivalryNodes.flatMap((node) => node.rewards),
      ...config.questSections.flatMap((section) => [
        ...section.tasks.flatMap((task) => task.rewards),
        ...section.sectionRewards,
      ]),
    ]);

    expect(rewards.length).toBeGreaterThan(0);
    for (const reward of rewards) {
      expect(reward.icon).toBe(
        `/img/weekly-rivalry/${reward.resourceId}.png`,
      );
      expect(reward.name).toBe(reward.name.trim());
      expect(
        existsSync(path.join(process.cwd(), "public", reward.icon.slice(1))),
      ).toBe(true);
    }
  });
});
