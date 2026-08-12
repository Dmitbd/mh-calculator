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
import { heroes } from "@/features/game-data/heroes";
import {
  weaponAwakeningColors,
  weaponAwakeningSlots,
} from "@/features/game-data/weapon-awakening";

import {
  HERO_BUILD_SET_SCHEMA_LIMITS,
  MIN_COMMITTED_BRANCH_PROGRESS,
  addHeroBuildSetNodeArrayLength as addNodeArrayLength,
  addHeroBuildSetSchemaIssue as addIssue,
  isHeroBuildSetCanonicalUtcDate as isCanonicalUtcDate,
  isHeroBuildSetPlainObject as isPlainObject,
  validateHeroBuildSetAllowedKeys as validateAllowedKeys,
  validateHeroBuildSetEnum as validateEnum,
  validateHeroBuildSetInteger as validateInteger,
  validateHeroBuildSetLiteral as validateLiteral,
  validateHeroBuildSetNonEmptyString as validateNonEmptyString,
  validateHeroBuildSetStableId as validateStableId,
  type HeroBuildSetSchemaIssue,
  type HeroBuildSetValidationContext,
} from "./heroBuildSetSchemaGuard";

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

export function validateHeroBuildLeaf(
  value: unknown,
  expectedHeroId: string,
  context: HeroBuildSetValidationContext,
  path: string,
  resolvedGameMode?: string,
): void {
  const { issues } = context;

  if (!isPlainObject(value)) {
    addIssue(issues, path, "must be a plain object or null");
    return;
  }

  validateAllowedKeys(
    value,
    [
      "schemaVersion",
      "gameMode",
      "heroId",
      "heroName",
      "columns",
      "majorNodes",
      "divinitySkills",
      "weaponAwakening",
      "equipment",
      "progress",
      "activeNodes",
      "metadata",
    ],
    path,
    issues,
  );

  validateLiteral(value.schemaVersion, 1, `${path}.schemaVersion`, issues);

  if (value.targetTabPath !== undefined) {
    addIssue(
      issues,
      `${path}.targetTabPath`,
      "is only allowed in standalone builder exports",
    );
  }

  validateEnum(value.gameMode, ["pvp", "pve"], `${path}.gameMode`, issues);

  if (resolvedGameMode !== undefined && value.gameMode !== resolvedGameMode) {
    addIssue(
      issues,
      `${path}.gameMode`,
      `must match resolved tab gameMode ${resolvedGameMode}`,
    );
  }

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

  validateNonEmptyString(
    value.heroName,
    `${path}.heroName`,
    issues,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxLabelLength,
  );

  addNodeArrayLength(context, value.majorNodes, `${path}.majorNodes`);
  addNodeArrayLength(
    context,
    value.weaponAwakening,
    `${path}.weaponAwakening`,
  );
  addNodeArrayLength(context, value.activeNodes, `${path}.activeNodes`);

  validateColumns(value.columns, issues, `${path}.columns`);
  validateMajorNodes(
    value.majorNodes,
    value.columns,
    value.progress,
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
  if (!isPlainObject(value)) {
    addIssue(issues, path, "must be a plain object");
    return;
  }

  validateAllowedKeys(value, columnIds, path, issues);

  Object.keys(value).forEach((columnId) => {
    if (!columnIds.includes(columnId as (typeof columnIds)[number])) {
      addIssue(issues, `${path}.${columnId}`, "must be a known column");
    }
  });

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
  progress: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array");
    return;
  }

  if (value.length > HERO_BUILD_SET_SCHEMA_LIMITS.maxMajorNodesPerLeaf) {
    addIssue(
      issues,
      path,
      `must contain at most ${HERO_BUILD_SET_SCHEMA_LIMITS.maxMajorNodesPerLeaf} entries`,
    );
  }

  const selectedColumns = isPlainObject(columns) ? columns : {};
  const seenSlots = new Set<string>();
  const entriesToVisit = Math.min(
    value.length,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxMajorNodesPerLeaf,
  );

  for (let index = 0; index < entriesToVisit; index += 1) {
    const entryPath = `${path}.${index}`;

    if (!(index in value)) {
      addIssue(issues, entryPath, "must not contain sparse entries");
      continue;
    }

    const entry = value[index];

    if (!isPlainObject(entry)) {
      addIssue(issues, entryPath, "must be a plain object");
      continue;
    }

    validateAllowedKeys(
      entry,
      ["level", "columnId", "branchId", "skillId"],
      entryPath,
      issues,
    );

    validateInteger(entry.level, `${entryPath}.level`, issues, 1, 30);
    validateEnum(entry.columnId, columnIds, `${entryPath}.columnId`, issues);
    validateStableId(entry.branchId, `${entryPath}.branchId`, issues);
    validateStableId(entry.skillId, `${entryPath}.skillId`, issues);

    if (typeof entry.branchId === "string" && !branchIds.has(entry.branchId)) {
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

    if (
      typeof entry.columnId === "string" &&
      typeof entry.level === "number" &&
      isPlainObject(progress)
    ) {
      const columnProgress = progress[entry.columnId];

      if (typeof columnProgress === "number" && entry.level > columnProgress) {
        addIssue(
          issues,
          `${entryPath}.level`,
          "must not exceed its column progress",
        );
      }
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
  }

  for (const slotKey of majorSlotByKey.keys()) {
    if (!seenSlots.has(slotKey)) {
      addIssue(issues, path, `must include major slot ${slotKey}`);
    }
  }
}

function validateDivinitySkills(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (value === undefined) {
    return;
  }

  if (!isPlainObject(value)) {
    addIssue(issues, path, "must be a plain object");
    return;
  }

  validateAllowedKeys(value, ["base", "awakened"], path, issues);

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

  if (value.length !== weaponSlotIds.size) {
    addIssue(issues, path, `must contain exactly ${weaponSlotIds.size} entries`);
  }

  const seenSlots = new Set<number>();
  const entriesToVisit = Math.min(value.length, weaponSlotIds.size);

  for (let index = 0; index < entriesToVisit; index += 1) {
    const entryPath = `${path}.${index}`;

    if (!(index in value)) {
      addIssue(issues, entryPath, "must not contain sparse entries");
      continue;
    }

    const entry = value[index];

    if (!isPlainObject(entry)) {
      addIssue(issues, entryPath, "must be a plain object");
      continue;
    }

    validateAllowedKeys(entry, ["slot", "colorId"], entryPath, issues);
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
  }

  for (const slotId of weaponSlotIds) {
    if (!seenSlots.has(slotId)) {
      addIssue(issues, path, `must include weapon slot ${slotId}`);
    }
  }
}

function validateEquipment(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isPlainObject(value)) {
    addIssue(issues, path, "must be a plain object");
    return;
  }

  validateAllowedKeys(value, ["artifactIds", "runeIds"], path, issues);
  validateKnownUniqueIds(
    value.artifactIds,
    artifactIds,
    issues,
    `${path}.artifactIds`,
    false,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxEquipmentVariantsPerType,
  );
  validateKnownUniqueIds(
    value.runeIds,
    runeIds,
    issues,
    `${path}.runeIds`,
    false,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxEquipmentVariantsPerType,
  );
}

function validateProgress(
  value: unknown,
  issues: HeroBuildSetSchemaIssue[],
  path: string,
): void {
  if (!isPlainObject(value)) {
    addIssue(issues, path, "must be a plain object");
    return;
  }

  validateAllowedKeys(value, columnIds, path, issues);

  columnIds.forEach((columnId) => {
    const level = value[columnId];

    if (level === undefined) {
      addIssue(issues, `${path}.${columnId}`, "is required");
      return;
    }

    validateInteger(
      level,
      `${path}.${columnId}`,
      issues,
      MIN_COMMITTED_BRANCH_PROGRESS,
      30,
    );

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

  if (value.length > HERO_BUILD_SET_SCHEMA_LIMITS.maxActiveNodesPerLeaf) {
    addIssue(
      issues,
      path,
      `must contain at most ${HERO_BUILD_SET_SCHEMA_LIMITS.maxActiveNodesPerLeaf} entries`,
    );
  }

  const progressByColumn = isPlainObject(progress) ? progress : {};
  const seenNodes = new Set<string>();
  const entriesToVisit = Math.min(
    value.length,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxActiveNodesPerLeaf,
  );

  for (let index = 0; index < entriesToVisit; index += 1) {
    const entryPath = `${path}.${index}`;

    if (!(index in value)) {
      addIssue(issues, entryPath, "must not contain sparse entries");
      continue;
    }

    const entry = value[index];

    if (!isPlainObject(entry)) {
      addIssue(issues, entryPath, "must be a plain object");
      continue;
    }

    validateAllowedKeys(entry, ["columnId", "level"], entryPath, issues);
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
  }

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
  if (!isPlainObject(value)) {
    addIssue(issues, path, "must be a plain object");
    return;
  }

  validateAllowedKeys(value, ["createdAt", "source"], path, issues);
  validateLiteral(
    value.source,
    "manual-branch-builder",
    `${path}.source`,
    issues,
  );
  validateNonEmptyString(
    value.createdAt,
    `${path}.createdAt`,
    issues,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxStringLength,
  );

  if (
    typeof value.createdAt === "string" &&
    !isCanonicalUtcDate(value.createdAt)
  ) {
    addIssue(
      issues,
      `${path}.createdAt`,
      "must be a canonical RFC3339 UTC date",
    );
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
  const entriesToVisit = Math.min(
    value.length,
    maximumLength ?? HERO_BUILD_SET_SCHEMA_LIMITS.maxArrayEntries,
  );

  for (let index = 0; index < entriesToVisit; index += 1) {
    const entryPath = `${path}.${index}`;

    if (!(index in value)) {
      addIssue(issues, entryPath, "must not contain sparse entries");
      continue;
    }

    const id = value[index];
    validateStableId(id, entryPath, issues);

    if (typeof id !== "string") {
      continue;
    }

    if (!knownIds.has(id)) {
      addIssue(issues, entryPath, "must reference a known stable id");
    }

    if (seenIds.has(id)) {
      addIssue(issues, entryPath, "must not be duplicated");
    }
    seenIds.add(id);
  }
}
