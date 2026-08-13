export type HeroBuildSetSchemaIssue = {
  message: string;
  path: string;
};

export class HeroBuildSetSchemaError extends Error {
  readonly cause: unknown;
  readonly issues: HeroBuildSetSchemaIssue[];

  constructor(issues: HeroBuildSetSchemaIssue[], cause?: unknown) {
    super(`Invalid hero build set: ${issues[0]?.path ?? "payload"}`);
    this.name = "HeroBuildSetSchemaError";
    this.cause = cause;
    this.issues = issues;
  }
}

export type HeroBuildSetValidationContext = {
  issues: HeroBuildSetSchemaIssue[];
  totalLeaves: number;
  totalNodes: number;
  totalTabs: number;
};

export type HeroBuildSetJsonObject = Record<string, unknown>;

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MIN_COMMITTED_BRANCH_PROGRESS = 18;

/**
 * Defensive ceilings for the current HeroBuildSet v2 / committed build v1.
 * They intentionally exceed bundled content while bounding recursive work,
 * aggregate node traversal, individual arrays, strings, and error output.
 */
export const HERO_BUILD_SET_SCHEMA_LIMITS = {
  maxActiveNodesPerLeaf: 128,
  maxArrayEntries: 128,
  maxEquipmentVariantsPerType: 16,
  maxIdLength: 64,
  maxIssues: 64,
  maxLabelLength: 160,
  maxMajorNodesPerLeaf: 16,
  maxNestingDepth: 8,
  maxObjectKeys: 32,
  maxStringLength: 256,
  maxTabsPerLevel: 32,
  maxTotalLeaves: 96,
  maxTotalNodes: 8192,
  maxTotalTabs: 128,
} as const;

export function createHeroBuildSetValidationContext(): HeroBuildSetValidationContext {
  return {
    issues: [],
    totalLeaves: 0,
    totalNodes: 0,
    totalTabs: 0,
  };
}

export function addHeroBuildSetSchemaIssue(
  issues: HeroBuildSetSchemaIssue[],
  path: string,
  message: string,
): void {
  if (issues.length < HERO_BUILD_SET_SCHEMA_LIMITS.maxIssues) {
    issues.push({ message, path });
  }
}

export function validateHeroBuildSetAllowedKeys(
  value: HeroBuildSetJsonObject,
  allowedKeys: readonly string[],
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): boolean {
  const allowed = new Set(allowedKeys);

  if (issues.length >= HERO_BUILD_SET_SCHEMA_LIMITS.maxIssues) {
    return false;
  }

  const ownKeys = Reflect.ownKeys(value);
  const exceedsKeyBudget =
    ownKeys.length > HERO_BUILD_SET_SCHEMA_LIMITS.maxObjectKeys;
  let valid = !exceedsKeyBudget;

  if (exceedsKeyBudget) {
    addHeroBuildSetSchemaIssue(
      issues,
      path || "payload",
      `must contain at most ${HERO_BUILD_SET_SCHEMA_LIMITS.maxObjectKeys} object keys`,
    );
  }

  for (const key of ownKeys.slice(0, HERO_BUILD_SET_SCHEMA_LIMITS.maxObjectKeys)) {
    if (issues.length >= HERO_BUILD_SET_SCHEMA_LIMITS.maxIssues) {
      return false;
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    const printableKey =
      typeof key === "symbol" ? `[${String(key)}]` : key;
    const propertyPath = path ? `${path}.${printableKey}` : printableKey;

    if (!descriptor || !("value" in descriptor)) {
      addHeroBuildSetSchemaIssue(
        issues,
        propertyPath,
        "must be a plain data property",
      );
      valid = false;
    }

    if (typeof key !== "string" || !allowed.has(key)) {
      addHeroBuildSetSchemaIssue(
        issues,
        propertyPath,
        "is not allowed",
      );
    }
  }

  return valid;
}

export function readHeroBuildSetArrayEntry(
  value: unknown[],
  index: number,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): { valid: false } | { valid: true; value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(value, String(index));

  if (!descriptor) {
    addHeroBuildSetSchemaIssue(issues, path, "must not contain sparse entries");
    return { valid: false };
  }

  if (!("value" in descriptor)) {
    addHeroBuildSetSchemaIssue(issues, path, "must be a plain data property");
    return { valid: false };
  }

  return { valid: true, value: descriptor.value };
}

export function validateHeroBuildSetStableId(
  value: unknown,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (
    typeof value !== "string" ||
    value.length > HERO_BUILD_SET_SCHEMA_LIMITS.maxIdLength ||
    !stableIdPattern.test(value)
  ) {
    addHeroBuildSetSchemaIssue(issues, path, "must be a stable kebab-case id");
  }
}

export function validateHeroBuildSetNonEmptyString(
  value: unknown,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
  maximumLength: number = HERO_BUILD_SET_SCHEMA_LIMITS.maxStringLength,
): void {
  if (
    typeof value !== "string" ||
    value.length > maximumLength ||
    value.trim().length === 0
  ) {
    addHeroBuildSetSchemaIssue(issues, path, "must be a non-empty string");
  }
}

export function validateHeroBuildSetInteger(
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
    addHeroBuildSetSchemaIssue(
      issues,
      path,
      `must be an integer from ${minimum} to ${maximum}`,
    );
  }
}

export function validateHeroBuildSetEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    addHeroBuildSetSchemaIssue(
      issues,
      path,
      `must be one of ${allowedValues.join(", ")}`,
    );
  }
}

export function validateHeroBuildSetLiteral(
  value: unknown,
  expected: string | number | null,
  path: string,
  issues: HeroBuildSetSchemaIssue[],
): void {
  if (value !== expected) {
    addHeroBuildSetSchemaIssue(
      issues,
      path,
      `must equal ${String(expected)}`,
    );
  }
}

export function addHeroBuildSetNodeArrayLength(
  context: HeroBuildSetValidationContext,
  value: unknown,
  path: string,
): void {
  if (!Array.isArray(value)) {
    return;
  }

  context.totalNodes += Math.min(
    value.length,
    HERO_BUILD_SET_SCHEMA_LIMITS.maxArrayEntries,
  );

  if (context.totalNodes > HERO_BUILD_SET_SCHEMA_LIMITS.maxTotalNodes) {
    addHeroBuildSetSchemaIssue(
      context.issues,
      path,
      "exceeds the total build-node limit",
    );
  }
}

export function isHeroBuildSetCanonicalUtcDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function isHeroBuildSetPlainObject(
  value: unknown,
): value is HeroBuildSetJsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
