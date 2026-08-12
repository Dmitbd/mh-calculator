import {
  DIVINITY_SKILL_AWAKENED_NODE_BUDGET,
  DIVINITY_SKILL_BASE_NODE_BUDGET,
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
  getDivinitySkillLoadoutCost,
} from "@/features/game-data/divinity";
import {
  equipmentArtifacts,
  equipmentRunes,
} from "@/features/game-data/equipment";
import { heroes, validateHeroBuildTabs } from "@/features/game-data/heroes";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import {
  weaponAwakeningColors,
  weaponAwakeningSlots,
} from "@/features/game-data/weapon-awakening";

export type HeroBuildSetSchemaIssue = {
  message: string;
  path: string;
};

export class HeroBuildSetSchemaError extends Error {
  readonly issues: HeroBuildSetSchemaIssue[];

  constructor(issues: HeroBuildSetSchemaIssue[]) {
    super(`Invalid hero build set: ${issues[0]?.path ?? "payload"}`);
    this.name = "HeroBuildSetSchemaError";
    this.issues = issues;
  }
}

type JsonObject = Record<string, unknown>;

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const columnIds = ["left", "center", "right"] as const;
const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
const branchIds = new Set<string>(divinityBranches.map((branch) => branch.id));
const skillById = new Map(divinitySkills.map((skill) => [skill.id, skill]));
const artifactIds = new Set(equipmentArtifacts.map((artifact) => artifact.id));
const runeIds = new Set(equipmentRunes.map((rune) => rune.id));
const weaponColorIds = new Set<string>(
  weaponAwakeningColors.map((color) => color.id),
);
const weaponSlotIds = new Set(weaponAwakeningSlots.map((slot) => slot.slot));
const treeNodeKeys = new Set(
  divinityTreeTemplate.map((node) => `${node.columnId}:${node.level}`),
);
const majorSlotByKey = new Map(
  divinityTreeTemplate
    .filter((node) => node.nodeType === "majorSkill")
    .map((node) => [`${node.columnId}:${node.level}`, node]),
);

/**
 * Validates unknown backend JSON before it crosses into build UI or persistence.
 * The single assertion is intentionally kept at this fully checked boundary.
 */
export function parseHeroBuildSet(
  value: unknown,
  expectedHeroId: string,
): HeroBuildSet {
  const issues: HeroBuildSetSchemaIssue[] = [];

  if (!isObject(value)) {
    throw new HeroBuildSetSchemaError([
      { message: "must be an object", path: "payload" },
    ]);
  }

  validateLiteral(value.schemaVersion, 2, "schemaVersion", issues);
  validateStableId(expectedHeroId, "heroId", issues);

  if (!heroById.has(expectedHeroId)) {
    addIssue(issues, "heroId", "must reference a known hero");
  }

  if (!Array.isArray(value.tabs)) {
    addIssue(issues, "tabs", "must be an array");
  } else {
    validateTabs(value.tabs, expectedHeroId, issues, "tabs");
  }

  if (issues.length > 0) {
    throw new HeroBuildSetSchemaError(issues);
  }

  const buildSet = value as HeroBuildSet;
  const tabIssues = validateHeroBuildTabs(buildSet);

  if (tabIssues.length > 0) {
    throw new HeroBuildSetSchemaError(
      tabIssues.map((message) => ({ message, path: "tabs" })),
    );
  }

  return buildSet;
}

function validateTabs(
  value: unknown[],
  expectedHeroId: string,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (value.length === 0) {
    addIssue(issues, path, "must be a non-empty array");
  }

  value.forEach((entry, index) => {
    const tabPath = `${path}.${index}`;

    if (!isObject(entry)) {
      addIssue(issues, tabPath, "must be an object");
      return;
    }

    validateStableId(entry.id, `${tabPath}.id`, issues);
    validateNonEmptyString(entry.label, `${tabPath}.label`, issues);
    validateInteger(entry.order, `${tabPath}.order`, issues, 0);
    validateEnum(entry.kind, ["build", "group"], `${tabPath}.kind`, issues);

    if (entry.gameMode !== undefined) {
      validateEnum(
        entry.gameMode,
        ["pvp", "pve"],
        `${tabPath}.gameMode`,
        issues,
      );
    }

    if (entry.kind === "group") {
      validateLiteral(entry.build, null, `${tabPath}.build`, issues);

      if (!Array.isArray(entry.children)) {
        addIssue(issues, `${tabPath}.children`, "must be an array");
      } else {
        validateTabs(
          entry.children,
          expectedHeroId,
          issues,
          `${tabPath}.children`,
        );
      }

      return;
    }

    if (entry.kind === "build") {
      if (entry.children !== undefined) {
        addIssue(issues, `${tabPath}.children`, "is not allowed on a build tab");
      }

      if (entry.build !== null) {
        validateBuild(entry.build, expectedHeroId, issues, `${tabPath}.build`);
      }
    }
  });
}

function validateBuild(
  value: unknown,
  expectedHeroId: string,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isObject(value)) {
    addIssue(issues, path, "must be an object or null");
    return;
  }

  validateLiteral(value.schemaVersion, 1, `${path}.schemaVersion`, issues);

  if (value.targetTabPath !== undefined) {
    addIssue(
      issues,
      `${path}.targetTabPath`,
      "is only allowed in standalone builder exports",
    );
  }

  validateEnum(value.gameMode, ["pvp", "pve"], `${path}.gameMode`, issues);
  validateStableId(value.heroId, `${path}.heroId`, issues);

  if (value.heroId !== expectedHeroId) {
    addIssue(issues, `${path}.heroId`, `must equal ${expectedHeroId}`);
  }

  const hero = heroById.get(expectedHeroId);

  if (!hero) {
    addIssue(issues, `${path}.heroId`, "must reference a known hero");
  } else if (value.heroName !== hero.name.ru) {
    addIssue(issues, `${path}.heroName`, "must match the hero catalog");
  }

  validateColumns(value.columns, issues, `${path}.columns`);
  validateMajorNodes(
    value.majorNodes,
    value.columns,
    issues,
    `${path}.majorNodes`,
  );
  validateDivinitySkills(value.divinitySkills, issues, `${path}.divinitySkills`);
  validateWeaponAwakening(
    value.weaponAwakening,
    issues,
    `${path}.weaponAwakening`,
  );
  validateEquipment(value.equipment, issues, `${path}.equipment`);
  validateProgress(value.progress, issues, `${path}.progress`);
  validateActiveNodes(
    value.activeNodes,
    value.progress,
    issues,
    `${path}.activeNodes`,
  );
  validateMetadata(value.metadata, issues, `${path}.metadata`);
}

function validateColumns(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isObject(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  columnIds.forEach((columnId) => {
    const branchId = value[columnId];
    validateStableId(branchId, `${path}.${columnId}`, issues);

    if (typeof branchId === "string" && !branchIds.has(branchId)) {
      addIssue(issues, `${path}.${columnId}`, "must reference a known branch");
    }
  });
}

function validateMajorNodes(
  value: unknown,
  columns: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array");
    return;
  }

  const selectedColumns = isObject(columns) ? columns : {};
  const seenSlots = new Set<string>();

  value.forEach((entry, index) => {
    const entryPath = `${path}.${index}`;

    if (!isObject(entry)) {
      addIssue(issues, entryPath, "must be an object");
      return;
    }

    validateInteger(entry.level, `${entryPath}.level`, issues, 1, 30);
    validateEnum(entry.columnId, columnIds, `${entryPath}.columnId`, issues);
    validateStableId(entry.branchId, `${entryPath}.branchId`, issues);
    validateStableId(entry.skillId, `${entryPath}.skillId`, issues);

    if (
      typeof entry.branchId === "string" &&
      !branchIds.has(entry.branchId)
    ) {
      addIssue(issues, `${entryPath}.branchId`, "must reference a known branch");
    }

    if (
      typeof entry.columnId === "string" &&
      entry.branchId !== selectedColumns[entry.columnId]
    ) {
      addIssue(
        issues,
        `${entryPath}.branchId`,
        "must match the selected column branch",
      );
    }

    const slotKey = `${entry.columnId}:${entry.level}`;
    const slot = majorSlotByKey.get(slotKey);

    if (!slot) {
      addIssue(issues, entryPath, "must reference a major divinity slot");
    }

    if (seenSlots.has(slotKey)) {
      addIssue(issues, entryPath, "must not duplicate a major divinity slot");
    }
    seenSlots.add(slotKey);

    const skill =
      typeof entry.skillId === "string"
        ? skillById.get(entry.skillId)
        : undefined;

    if (!skill) {
      addIssue(issues, `${entryPath}.skillId`, "must reference a known skill");
    } else {
      if (skill.branchId !== entry.branchId) {
        addIssue(
          issues,
          `${entryPath}.skillId`,
          "must belong to the selected branch",
        );
      }

      if (slot?.nodeType === "majorSkill" && skill.tier !== slot.tier) {
        addIssue(issues, `${entryPath}.skillId`, "must match the major slot tier");
      }
    }
  });
}

function validateDivinitySkills(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (value === undefined) {
    return;
  }

  if (!isObject(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  validateDivinitySkillRow(
    value.base,
    DIVINITY_SKILL_BASE_NODE_BUDGET,
    issues,
    `${path}.base`,
  );

  if (value.awakened !== undefined) {
    validateDivinitySkillRow(
      value.awakened,
      DIVINITY_SKILL_AWAKENED_NODE_BUDGET,
      issues,
      `${path}.awakened`,
    );
  }
}

function validateDivinitySkillRow(
  value: unknown,
  nodeBudget: number,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  validateKnownUniqueIds(value, skillById, issues, path, true, 3);

  if (
    Array.isArray(value) &&
    value.every((skillId): skillId is string => typeof skillId === "string") &&
    getDivinitySkillLoadoutCost(value, skillById) > nodeBudget
  ) {
    addIssue(issues, path, `must fit the ${nodeBudget}-node budget`);
  }
}

function validateWeaponAwakening(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array");
    return;
  }

  if (value.length > weaponSlotIds.size) {
    addIssue(issues, path, `must contain at most ${weaponSlotIds.size} entries`);
  }

  const seenSlots = new Set<number>();

  value.forEach((entry, index) => {
    const entryPath = `${path}.${index}`;

    if (!isObject(entry)) {
      addIssue(issues, entryPath, "must be an object");
      return;
    }

    validateInteger(entry.slot, `${entryPath}.slot`, issues, 1, 8);
    validateStableId(entry.colorId, `${entryPath}.colorId`, issues);

    if (typeof entry.slot === "number") {
      if (!weaponSlotIds.has(entry.slot)) {
        addIssue(issues, `${entryPath}.slot`, "must reference a known slot");
      }
      if (seenSlots.has(entry.slot)) {
        addIssue(issues, `${entryPath}.slot`, "must not be duplicated");
      }
      seenSlots.add(entry.slot);
    }

    if (
      typeof entry.colorId === "string" &&
      !weaponColorIds.has(entry.colorId)
    ) {
      addIssue(issues, `${entryPath}.colorId`, "must reference a known color");
    }
  });
}

function validateEquipment(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isObject(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  validateKnownUniqueIds(
    value.artifactIds,
    artifactIds,
    issues,
    `${path}.artifactIds`,
    false,
  );
  validateKnownUniqueIds(
    value.runeIds,
    runeIds,
    issues,
    `${path}.runeIds`,
    false,
  );
}

function validateProgress(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isObject(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  Object.keys(value).forEach((columnId) => {
    if (!columnIds.includes(columnId as (typeof columnIds)[number])) {
      addIssue(issues, `${path}.${columnId}`, "must be a known column");
    }
  });

  columnIds.forEach((columnId) => {
    const level = value[columnId];

    if (level === undefined) {
      return;
    }

    validateInteger(level, `${path}.${columnId}`, issues, 1, 30);

    if (
      typeof level === "number" &&
      !treeNodeKeys.has(`${columnId}:${level}`)
    ) {
      addIssue(issues, `${path}.${columnId}`, "must reference a tree node level");
    }
  });
}

function validateActiveNodes(
  value: unknown,
  progress: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array");
    return;
  }

  const progressByColumn = isObject(progress) ? progress : {};
  const seenNodes = new Set<string>();

  value.forEach((entry, index) => {
    const entryPath = `${path}.${index}`;

    if (!isObject(entry)) {
      addIssue(issues, entryPath, "must be an object");
      return;
    }

    validateEnum(entry.columnId, columnIds, `${entryPath}.columnId`, issues);
    validateInteger(entry.level, `${entryPath}.level`, issues, 1, 30);

    const nodeKey = `${entry.columnId}:${entry.level}`;

    if (!treeNodeKeys.has(nodeKey)) {
      addIssue(issues, entryPath, "must reference a divinity tree node");
    }

    if (seenNodes.has(nodeKey)) {
      addIssue(issues, entryPath, "must not duplicate an active node");
    }
    seenNodes.add(nodeKey);

    const columnProgress =
      typeof entry.columnId === "string"
        ? progressByColumn[entry.columnId]
        : undefined;

    if (
      typeof entry.level === "number" &&
      (typeof columnProgress !== "number" || entry.level > columnProgress)
    ) {
      addIssue(issues, entryPath, "must not exceed column progress");
    }
  });

  const expectedNodes = new Set(
    divinityTreeTemplate
      .filter((node) => {
        const columnProgress = progressByColumn[node.columnId];
        return (
          typeof columnProgress === "number" && node.level <= columnProgress
        );
      })
      .map((node) => `${node.columnId}:${node.level}`),
  );

  if (
    expectedNodes.size !== seenNodes.size ||
    [...expectedNodes].some((nodeKey) => !seenNodes.has(nodeKey))
  ) {
    addIssue(issues, path, "must exactly match the nodes selected by progress");
  }
}

function validateMetadata(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isObject(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  validateLiteral(
    value.source,
    "manual-branch-builder",
    `${path}.source`,
    issues,
  );
  validateNonEmptyString(value.createdAt, `${path}.createdAt`, issues);

  if (
    typeof value.createdAt === "string" &&
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    addIssue(issues, `${path}.createdAt`, "must be an ISO date");
  }
}

function validateKnownUniqueIds(
  value: unknown,
  knownIds: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
  allowEmpty: boolean,
  maximumLength?: number,
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array");
    return;
  }

  if (!allowEmpty && value.length === 0) {
    addIssue(issues, path, "must be a non-empty array");
  }

  if (maximumLength !== undefined && value.length > maximumLength) {
    addIssue(issues, path, `must contain at most ${maximumLength} entries`);
  }

  const seenIds = new Set<string>();

  value.forEach((id, index) => {
    const entryPath = `${path}.${index}`;
    validateStableId(id, entryPath, issues);

    if (typeof id !== "string") {
      return;
    }

    if (!knownIds.has(id)) {
      addIssue(issues, entryPath, "must reference a known stable id");
    }

    if (seenIds.has(id)) {
      addIssue(issues, entryPath, "must not be duplicated");
    }
    seenIds.add(id);
  });
}

function validateStableId(
  value: unknown,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (typeof value !== "string" || !stableIdPattern.test(value)) {
    addIssue(issues, path, "must be a stable kebab-case id");
  }
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    addIssue(issues, path, "must be a non-empty string");
  }
}

function validateInteger(
  value: unknown,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): void {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    addIssue(issues, path, `must be an integer from ${minimum} to ${maximum}`);
  }
}

function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    addIssue(issues, path, `must be one of ${allowedValues.join(", ")}`);
  }
}

function validateLiteral(
  value: unknown,
  expected: string | number | null,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (value !== expected) {
    addIssue(issues, path, `must equal ${String(expected)}`);
  }
}

function addIssue(
  issues: HeroBuildSetSchemaIssue[],
  path: string,
  message: string,
): void {
  issues.push({ message, path });
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
