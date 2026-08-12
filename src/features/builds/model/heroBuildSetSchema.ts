import { heroes, validateHeroBuildTabs } from "@/features/game-data/heroes";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

import { validateHeroBuildLeaf } from "./heroBuildSetLeafSchema";
import {
  HERO_BUILD_SET_SCHEMA_LIMITS,
  HeroBuildSetSchemaError,
  addHeroBuildSetSchemaIssue as addIssue,
  createHeroBuildSetValidationContext,
  isHeroBuildSetPlainObject as isPlainObject,
  validateHeroBuildSetAllowedKeys as validateAllowedKeys,
  validateHeroBuildSetEnum as validateEnum,
  validateHeroBuildSetInteger as validateInteger,
  validateHeroBuildSetLiteral as validateLiteral,
  validateHeroBuildSetNonEmptyString as validateNonEmptyString,
  validateHeroBuildSetStableId as validateStableId,
  type HeroBuildSetValidationContext,
} from "./heroBuildSetSchemaGuard";

export {
  HERO_BUILD_SET_SCHEMA_LIMITS,
  HeroBuildSetSchemaError,
  MIN_COMMITTED_BRANCH_PROGRESS,
} from "./heroBuildSetSchemaGuard";
export type { HeroBuildSetSchemaIssue } from "./heroBuildSetSchemaGuard";

const heroIds = new Set(heroes.map((hero) => hero.id));

/**
 * Validates unknown backend JSON before it crosses into build UI or persistence.
 * The single assertion is intentionally kept at this fully checked boundary.
 */
export function parseHeroBuildSet(
  value: unknown,
  expectedHeroId: string,
): HeroBuildSet {
  try {
    return parseHeroBuildSetInternal(value, expectedHeroId);
  } catch (error) {
    if (error instanceof HeroBuildSetSchemaError) {
      throw error;
    }

    throw new HeroBuildSetSchemaError(
      [{ message: "could not be validated", path: "payload" }],
      error,
    );
  }
}

function parseHeroBuildSetInternal(
  value: unknown,
  expectedHeroId: string,
): HeroBuildSet {
  const context = createHeroBuildSetValidationContext();
  const { issues } = context;

  if (!isPlainObject(value)) {
    throw new HeroBuildSetSchemaError([
      { message: "must be a plain object", path: "payload" },
    ]);
  }

  validateAllowedKeys(value, ["schemaVersion", "tabs"], "", issues);
  validateLiteral(value.schemaVersion, 2, "schemaVersion", issues);
  validateStableId(expectedHeroId, "heroId", issues);

  if (!heroIds.has(expectedHeroId)) {
    addIssue(issues, "heroId", "must reference a known hero");
  }

  if (!Array.isArray(value.tabs)) {
    addIssue(issues, "tabs", "must be an array");
  } else {
    validateTabs(value.tabs, expectedHeroId, context, "tabs", 1);
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
  context: HeroBuildSetValidationContext,
  path: string,
  depth: number,
  inheritedGameMode?: string,
): void {
  const { issues } = context;

  if (depth > HERO_BUILD_SET_SCHEMA_LIMITS.maxNestingDepth) {
    addIssue(issues, path, "exceeds the maximum tab nesting depth");
    return;
  }

  if (value.length === 0) {
    addIssue(issues, path, "must be a non-empty array");
  }

  if (value.length > HERO_BUILD_SET_SCHEMA_LIMITS.maxTabsPerLevel) {
    addIssue(
      issues,
      path,
      `must contain at most ${HERO_BUILD_SET_SCHEMA_LIMITS.maxTabsPerLevel} entries`,
    );
  }

  const siblingIds = new Set<string>();
  const entriesToVisit = Math.min(
    value.length,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxTabsPerLevel,
  );

  for (let index = 0; index < entriesToVisit; index += 1) {
    const tabPath = `${path}.${index}`;

    if (!(index in value)) {
      addIssue(issues, tabPath, "must not contain sparse entries");
      continue;
    }

    context.totalTabs += 1;
    if (context.totalTabs > HERO_BUILD_SET_SCHEMA_LIMITS.maxTotalTabs) {
      addIssue(issues, tabPath, "exceeds the total tab limit");
      return;
    }

    const entry = value[index];

    if (!isPlainObject(entry)) {
      addIssue(issues, tabPath, "must be a plain object");
      continue;
    }

    validateAllowedKeys(
      entry,
      ["id", "label", "order", "kind", "gameMode", "build", "children"],
      tabPath,
      issues,
    );
    validateStableId(entry.id, `${tabPath}.id`, issues);
    validateNonEmptyString(
      entry.label,
      `${tabPath}.label`,
      issues,
      HERO_BUILD_SET_SCHEMA_LIMITS.maxLabelLength,
    );
    validateInteger(entry.order, `${tabPath}.order`, issues, 0);
    validateEnum(entry.kind, ["build", "group"], `${tabPath}.kind`, issues);

    if (typeof entry.id === "string") {
      if (siblingIds.has(entry.id)) {
        addIssue(issues, `${tabPath}.id`, "must be unique among siblings");
      }
      siblingIds.add(entry.id);
    }

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
          context,
          `${tabPath}.children`,
          depth + 1,
          typeof entry.gameMode === "string"
            ? entry.gameMode
            : inheritedGameMode,
        );
      }

      continue;
    }

    if (entry.kind === "build") {
      context.totalLeaves += 1;
      if (context.totalLeaves > HERO_BUILD_SET_SCHEMA_LIMITS.maxTotalLeaves) {
        addIssue(issues, tabPath, "exceeds the total leaf limit");
        return;
      }

      if (entry.children !== undefined) {
        addIssue(issues, `${tabPath}.children`, "is not allowed on a build tab");
      }

      if (entry.build !== null) {
        validateHeroBuildLeaf(
          entry.build,
          expectedHeroId,
          context,
          `${tabPath}.build`,
          typeof entry.gameMode === "string"
            ? entry.gameMode
            : inheritedGameMode,
        );
      }
    }
  }
}
