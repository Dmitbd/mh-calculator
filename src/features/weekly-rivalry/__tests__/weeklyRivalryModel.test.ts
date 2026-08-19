import {
  beastlyEchoesConfig,
  towerOfBabelConfig,
  type WeeklyRivalryEventConfig,
  zodiacMapConfig,
} from "@/features/game-data/weekly-rivalry";

import { calculateWeeklyRivalryEventProgress } from "../model/calculateWeeklyRivalryEventProgress";
import { normalizeWeeklyRivalryInput } from "../model/normalizeWeeklyRivalryInput";
import type { WeeklyRivalryInput } from "../model/types";

function createInput(
  overrides: Partial<WeeklyRivalryInput> = {},
): WeeklyRivalryInput {
  return {
    ownedSpendResource: 0,
    ownedWeeklyEventChests: 0,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    includeSharedCashback: false,
    ...overrides,
  };
}

function calculateRivalryProgress(
  input: Partial<WeeklyRivalryInput>,
  config: WeeklyRivalryEventConfig,
) {
  return calculateWeeklyRivalryEventProgress(
    createInput({ ...input, includeSharedCashback: false }),
    config,
  ).rivalryProgress;
}

function calculateQuestProgress(
  input: Partial<WeeklyRivalryInput>,
  config: WeeklyRivalryEventConfig,
) {
  return calculateWeeklyRivalryEventProgress(
    createInput({ ...input, includeSharedCashback: false }),
    config,
  ).questProgress;
}

function completedTaskCount(
  progress: ReturnType<typeof calculateQuestProgress>,
) {
  return progress.sections.flatMap((section) => section.tasks).filter(
    (task) => task.isComplete,
  ).length;
}

function completedSectionCount(
  progress: ReturnType<typeof calculateQuestProgress>,
) {
  return progress.sections.filter((section) => section.isComplete).length;
}

function visibleQuestProgress(
  progress: ReturnType<typeof calculateQuestProgress>,
) {
  return progress.sections.at(-1)?.tasks.at(-1)?.current ?? 0;
}

function aggregatedRewardAmount(
  rewards: ReturnType<typeof calculateRivalryProgress>["cashbackRewards"],
  resourceId: number,
) {
  return rewards.find((reward) => reward.resourceId === resourceId)?.amount ?? 0;
}

describe("weekly rivalry input normalization", () => {
  test("normalizes quantities and keeps independent toggle values", () => {
    expect(
      normalizeWeeklyRivalryInput({
        ownedSpendResource: "12.9",
        ownedWeeklyEventChests: -4,
        includeRivalryCashback: false,
        includeWeeklyEventChestCashback: false,
        includeQuestCashback: false,
        includeSharedCashback: true,
      }),
    ).toEqual({
      ownedSpendResource: 12,
      ownedWeeklyEventChests: 0,
      includeRivalryCashback: false,
      includeWeeklyEventChestCashback: false,
      includeQuestCashback: false,
      includeSharedCashback: true,
    });
  });

  test("uses disabled cashback defaults for missing or invalid input", () => {
    expect(normalizeWeeklyRivalryInput(null)).toEqual({
      ownedSpendResource: 0,
      ownedWeeklyEventChests: 0,
      includeRivalryCashback: false,
      includeWeeklyEventChestCashback: false,
      includeQuestCashback: false,
      includeSharedCashback: false,
    });
  });

  test("caps unsafe counts before score multiplication can overflow", () => {
    const normalized = normalizeWeeklyRivalryInput({
      ownedSpendResource: Number.MAX_VALUE,
      ownedWeeklyEventChests: Number.MAX_VALUE,
    });

    expect(normalized.ownedSpendResource).toBe(1_000_000_000);
    expect(normalized.ownedWeeklyEventChests).toBe(1_000_000_000);
    const score =
      (normalized.ownedSpendResource + normalized.ownedWeeklyEventChests) * 30;
    expect(Number.isSafeInteger(score)).toBe(true);
  });

  test.each([true, [5], { value: 5 }, Symbol("5")])(
    "does not coerce non-numeric input %p",
    (ownedSpendResource) => {
      expect(() =>
        normalizeWeeklyRivalryInput({ ownedSpendResource }),
      ).not.toThrow();
      expect(
        normalizeWeeklyRivalryInput({ ownedSpendResource }).ownedSpendResource,
      ).toBe(0);
    },
  );
});

describe("weekly rivalry calculation", () => {
  test.each([towerOfBabelConfig, zodiacMapConfig, beastlyEchoesConfig])(
    "opens every rivalry node exactly at its configured boundary for $id",
    (config) => {
      config.rivalryNodes.forEach((node, index) => {
        const requiredResources = node.requiredScore / config.pointsPerResource;
        expect(
          calculateRivalryProgress(
            { ownedSpendResource: requiredResources - 1 },
            config,
          ).openedNodes,
        ).toBe(index);
        expect(
          calculateRivalryProgress({ ownedSpendResource: requiredResources }, config)
            .openedNodes,
        ).toBe(index + 1);
      });
    },
  );

  test("does not open a node below 750 points", () => {
    expect(
      calculateRivalryProgress(
        {
          ownedSpendResource: 24,
          includeRivalryCashback: false,
          includeWeeklyEventChestCashback: false,
        },
        beastlyEchoesConfig,
      ),
    ).toMatchObject({ totalScore: 720, openedNodes: 0, cashbackRewards: [] });
  });

  test("uses direct resource rewards only when rivalry cashback is enabled", () => {
    const enabled = calculateRivalryProgress(
      {
        ownedSpendResource: 25,
        includeRivalryCashback: true,
        includeWeeklyEventChestCashback: false,
      },
      beastlyEchoesConfig,
    );
    const disabled = calculateRivalryProgress(
      {
        ownedSpendResource: 25,
        includeRivalryCashback: false,
        includeWeeklyEventChestCashback: false,
      },
      beastlyEchoesConfig,
    );

    expect(enabled).toMatchObject({
      totalScore: 810,
      openedNodes: 1,
    });
    expect(disabled).toMatchObject({
      totalScore: 750,
      openedNodes: 1,
    });
    expect(
      aggregatedRewardAmount(
        enabled.cashbackRewards,
        beastlyEchoesConfig.spendResourceId,
      ),
    ).toBe(2);
    expect(disabled.cashbackRewards).toEqual(enabled.cashbackRewards);
  });

  test("always uses owned weekly-event chests as a base resource", () => {
    const enabled = calculateRivalryProgress(
      {
        ownedSpendResource: 15,
        ownedWeeklyEventChests: 10,
        includeRivalryCashback: false,
        includeWeeklyEventChestCashback: true,
      },
      beastlyEchoesConfig,
    );
    const disabled = calculateRivalryProgress(
      {
        ownedSpendResource: 15,
        ownedWeeklyEventChests: 10,
        includeRivalryCashback: false,
        includeWeeklyEventChestCashback: false,
      },
      beastlyEchoesConfig,
    );

    expect(enabled).toMatchObject({ totalScore: 750, openedNodes: 1 });
    expect(disabled).toEqual(enabled);
  });

  test("earned chests can continue only the rivalry cascade", () => {
    const withoutChestCashback = calculateRivalryProgress(
      {
        ownedSpendResource: 115,
        includeRivalryCashback: true,
        includeWeeklyEventChestCashback: false,
      },
      beastlyEchoesConfig,
    );
    const withChestCashback = calculateRivalryProgress(
      {
        ownedSpendResource: 115,
        includeRivalryCashback: true,
        includeWeeklyEventChestCashback: true,
      },
      beastlyEchoesConfig,
    );

    expect(withoutChestCashback).toMatchObject({
      totalScore: 3630,
      openedNodes: 4,
    });
    expect(withChestCashback).toMatchObject({
      totalScore: 3990,
      openedNodes: 5,
    });
    expect(
      aggregatedRewardAmount(
        withoutChestCashback.cashbackRewards,
        beastlyEchoesConfig.weeklyEventChestResourceId,
      ),
    ).toBe(10);
    expect(
      aggregatedRewardAmount(
        withChestCashback.cashbackRewards,
        beastlyEchoesConfig.spendResourceId,
      ),
    ).toBe(8);
  });

  test("caps the track while retaining all calculated points", () => {
    const progress = calculateRivalryProgress(
      {
        ownedSpendResource: 400,
        includeRivalryCashback: true,
        includeWeeklyEventChestCashback: true,
      },
      beastlyEchoesConfig,
    );
    expect(progress).toMatchObject({ totalScore: 13_920, openedNodes: 16 });
    expect(
      aggregatedRewardAmount(
        progress.cashbackRewards,
        beastlyEchoesConfig.spendResourceId,
      ),
    ).toBe(24);
    expect(
      aggregatedRewardAmount(
        progress.cashbackRewards,
        beastlyEchoesConfig.weeklyEventChestResourceId,
      ),
    ).toBe(40);
  });
});

describe("weekly event quest calculation", () => {
  test.each([towerOfBabelConfig, zodiacMapConfig, beastlyEchoesConfig])(
    "completes every task exactly at its configured boundary for $id",
    (config) => {
      const tasks = config.questSections.flatMap((section) => section.tasks);
      tasks.forEach((task, index) => {
        expect(
          completedTaskCount(
            calculateQuestProgress(
              { ownedSpendResource: task.requiredSpend - 1 },
              config,
            ),
          ),
        ).toBe(index);
        expect(
          completedTaskCount(
            calculateQuestProgress(
              { ownedSpendResource: task.requiredSpend },
              config,
            ),
          ),
        ).toBe(index + 1);
      });
    },
  );

  test("uses one spent resource as one point of quest progress", () => {
    const belowFirstTask = calculateQuestProgress(
      { ownedSpendResource: 4, includeQuestCashback: true },
      beastlyEchoesConfig,
    );
    expect(visibleQuestProgress(belowFirstTask)).toBe(4);
    expect(completedTaskCount(belowFirstTask)).toBe(0);

    const atFirstTask = calculateQuestProgress(
      { ownedSpendResource: 5, includeQuestCashback: false },
      beastlyEchoesConfig,
    );
    expect(visibleQuestProgress(atFirstTask)).toBe(5);
    expect(completedTaskCount(atFirstTask)).toBe(1);
  });

  test("applies quest resource cashback sequentially", () => {
    const progress = calculateQuestProgress(
      { ownedSpendResource: 8, includeQuestCashback: true },
      beastlyEchoesConfig,
    );
    expect(visibleQuestProgress(progress)).toBe(12);
    expect(completedTaskCount(progress)).toBe(2);
    expect(completedSectionCount(progress)).toBe(0);
  });

  test("completes a section and advances only with quest resource rewards", () => {
    const result = calculateQuestProgress(
      { ownedSpendResource: 80, includeQuestCashback: true },
      beastlyEchoesConfig,
    );

    expect(visibleQuestProgress(result)).toBe(102);
    expect(completedTaskCount(result)).toBe(7);
    expect(completedSectionCount(result)).toBe(1);
    expect(result.sections[0].isComplete).toBe(true);
    expect(result.sections[1].tasks[0].isComplete).toBe(true);
    expect(result.sections[1].tasks[1].isComplete).toBe(false);
  });

  test("uses owned chests in quests without sharing cashback toggles", () => {
    const chestCashbackDisabled = calculateQuestProgress(
      {
        ownedSpendResource: 4,
        ownedWeeklyEventChests: 1,
        includeRivalryCashback: false,
        includeWeeklyEventChestCashback: false,
        includeQuestCashback: false,
      },
      beastlyEchoesConfig,
    );
    const chestCashbackEnabled = calculateQuestProgress(
      {
        ownedSpendResource: 4,
        ownedWeeklyEventChests: 1,
        includeRivalryCashback: true,
        includeWeeklyEventChestCashback: true,
        includeQuestCashback: false,
      },
      beastlyEchoesConfig,
    );

    expect(visibleQuestProgress(chestCashbackDisabled)).toBe(5);
    expect(completedTaskCount(chestCashbackDisabled)).toBe(1);
    expect(chestCashbackEnabled).toEqual(chestCashbackDisabled);
  });

  test("completes all thirty tasks and five section rewards at 1440", () => {
    const result = calculateQuestProgress(
      { ownedSpendResource: 1440, includeQuestCashback: true },
      beastlyEchoesConfig,
    );

    expect(visibleQuestProgress(result)).toBe(1440);
    expect(completedTaskCount(result)).toBe(30);
    expect(completedSectionCount(result)).toBe(5);
    expect(result.sections.every((section) => section.isComplete)).toBe(true);
    expect(result.cashbackRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceId: 200025, amount: 54 }),
        expect.objectContaining({ resourceId: 200019, amount: 216 }),
      ]),
    );
  });
});

describe("shared weekly rivalry cashback", () => {
  const expectedCheckboxMatrix = [
    [3150, 105, 4, 7, 1],
    [3330, 105, 4, 7, 1],
    [3450, 105, 4, 7, 1],
    [3630, 105, 4, 7, 1],
    [3150, 137, 4, 9, 1],
    [3330, 137, 4, 9, 1],
    [3450, 137, 4, 9, 1],
    [3630, 137, 4, 9, 1],
    [3150, 105, 4, 7, 1],
    [3330, 111, 4, 8, 1],
    [3450, 115, 4, 8, 1],
    [3630, 121, 4, 8, 1],
    [4110, 137, 5, 9, 1],
    [4350, 145, 5, 9, 1],
    [4410, 147, 5, 9, 1],
    [4710, 157, 6, 9, 1],
  ];

  test.each([towerOfBabelConfig, zodiacMapConfig, beastlyEchoesConfig])(
    "matches the exact 16-checkbox matrix for $id",
    (config) => {
      const actual = Array.from({ length: 16 }, (_, mask) => {
        const result = calculateWeeklyRivalryEventProgress(
          createInput({
            ownedSpendResource: 100,
            ownedWeeklyEventChests: 5,
            includeRivalryCashback: Boolean(mask & 1),
            includeWeeklyEventChestCashback: Boolean(mask & 2),
            includeQuestCashback: Boolean(mask & 4),
            includeSharedCashback: Boolean(mask & 8),
          }),
          config,
        );
        return [
          result.rivalryProgress.totalScore,
          visibleQuestProgress(result.questProgress),
          result.rivalryProgress.openedNodes,
          completedTaskCount(result.questProgress),
          completedSectionCount(result.questProgress),
        ];
      });

      expect(actual).toEqual(expectedCheckboxMatrix);
    },
  );

  test("repeats rivalry and quest rewards mutually until no new reward opens", () => {
    const spendResourceReward = {
      resourceId: 200025,
      amount: 1,
      name: "Печати зверя",
      icon: "/img/weekly-rivalry/200025.png" as const,
    };
    const config: WeeklyRivalryEventConfig = {
      sourceVersion: "test",
      id: "beastly-echoes",
      title: "Test",
      spendResourceId: 200025,
      spendResourceForms: {
        singular: "печать зверя",
        singularTitle: "Печать зверя",
        pluralTitle: "Печати зверя",
        genitivePlural: "Печатей зверя",
      },
      weeklyEventChestResourceId: 600053,
      pointsPerResource: 30,
      maxRivalryScore: 90,
      rivalryNodes: [
        {
          id: 1,
          node: 1,
          requiredScore: 30,
          isSpecial: false,
          rewards: [spendResourceReward],
        },
        {
          id: 2,
          node: 2,
          requiredScore: 90,
          isSpecial: false,
          rewards: [],
        },
      ],
      questSections: [
        {
          number: 1,
          tasks: [
            { id: 1, requiredSpend: 2, rewards: [spendResourceReward] },
            { id: 2, requiredSpend: 3, rewards: [] },
          ],
          sectionRewards: [],
        },
      ],
    };

    const result = calculateWeeklyRivalryEventProgress(
      createInput({
        ownedSpendResource: 1,
        includeRivalryCashback: true,
        includeWeeklyEventChestCashback: false,
        includeQuestCashback: true,
        includeSharedCashback: true,
      }),
      config,
    );

    expect(result.rivalryProgress).toMatchObject({
      totalScore: 90,
      openedNodes: 2,
    });
    expect(visibleQuestProgress(result.questProgress)).toBe(3);
    expect(completedTaskCount(result.questProgress)).toBe(2);
    expect(completedSectionCount(result.questProgress)).toBe(1);
    expect(result.rivalryProgress.cashbackRewards).toEqual([
      spendResourceReward,
    ]);
    expect(result.questProgress.cashbackRewards).toEqual([
      spendResourceReward,
    ]);
  });

  test("shares enabled chest cashback with event quests", () => {
    const result = calculateWeeklyRivalryEventProgress(
      createInput({
        ownedSpendResource: 100,
        includeRivalryCashback: false,
        includeWeeklyEventChestCashback: true,
        includeQuestCashback: false,
        includeSharedCashback: true,
      }),
      beastlyEchoesConfig,
    );

    expect(result.rivalryProgress).toMatchObject({
      totalScore: 3_300,
      openedNodes: 4,
    });
    expect(visibleQuestProgress(result.questProgress)).toBe(110);
    expect(completedTaskCount(result.questProgress)).toBe(8);
    expect(completedSectionCount(result.questProgress)).toBe(1);
  });

  test("keeps section rewards out of the cascade even when they use the spend resource", () => {
    const config: WeeklyRivalryEventConfig = {
      ...beastlyEchoesConfig,
      rivalryNodes: [],
      maxRivalryScore: 1,
      questSections: [
        {
          number: 1,
          tasks: [
            {
              id: 1,
              requiredSpend: 1,
              rewards: [],
            },
          ],
          sectionRewards: [
            {
              resourceId: 200025,
              amount: 100,
              name: "Печати зверя",
              icon: "/img/weekly-rivalry/200025.png",
            },
          ],
        },
      ],
    };

    const result = calculateWeeklyRivalryEventProgress(
      createInput({
        ownedSpendResource: 1,
        includeQuestCashback: true,
        includeSharedCashback: true,
      }),
      config,
    );

    expect(visibleQuestProgress(result.questProgress)).toBe(1);
    expect(completedTaskCount(result.questProgress)).toBe(1);
    expect(completedSectionCount(result.questProgress)).toBe(1);
    expect(result.rivalryProgress).toMatchObject({
      totalScore: 30,
      openedNodes: 0,
    });
    expect(result.questProgress.cashbackRewards).toEqual([
      expect.objectContaining({ resourceId: 200025, amount: 100 }),
    ]);
  });
});
