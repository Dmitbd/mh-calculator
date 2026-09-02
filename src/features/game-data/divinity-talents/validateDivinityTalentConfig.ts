import type {
  DivinityTalentBranch,
  DivinityTalentBranchId,
  DivinityTalentConfig,
  DivinityTalentLevelCost,
} from "./types";

const BRANCH_IDS = ["left", "center", "right"] as const;
const FAITH_RESOURCE_IDS = [700301, 700302, 700303, 700304] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`divinity talent config: invalid ${field}`);
  }
  return value;
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    throw new Error(`divinity talent config: invalid ${field}`);
  }
  return value;
}

function requireIcon(value: unknown, field: string): string {
  const icon = requireText(value, field);
  if (!icon.startsWith("/img/") || !icon.endsWith(".png")) {
    throw new Error(`divinity talent config: invalid ${field}`);
  }
  return icon;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(`divinity talent config: invalid ${field}`);
  }
  return value;
}

function requireLevel(value: unknown, field: string): number {
  const level = requireNonNegativeInteger(value, field);
  if (level < 1 || level > 30) {
    throw new Error(`divinity talent config: invalid ${field}`);
  }
  return level;
}

function requireExactNumber(value: unknown, expected: number, field: string) {
  const parsed = requireNonNegativeInteger(value, field);
  if (parsed !== expected) {
    throw new Error(`divinity talent config: unexpected ${field}`);
  }
}

function parseLevelCosts(value: unknown): DivinityTalentLevelCost[] {
  if (!Array.isArray(value) || value.length !== 30) {
    throw new Error("divinity talent config: expected 30 level costs");
  }
  return value.map((entryValue, index) => {
    const entry = requireRecord(entryValue, `level cost ${index + 1}`);
    const level = requireLevel(entry.level, `level cost ${index + 1} level`);
    if (level !== index + 1) {
      throw new Error("divinity talent config: level costs must be 1..30");
    }
    return {
      level,
      faith: requireNonNegativeInteger(
        entry.faith,
        `level ${level} faith cost`,
      ),
    };
  });
}

function parseOrderedLevels(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`divinity talent config: invalid ${field}`);
  }
  const levels = value.map((level) => requireLevel(level, field));
  if (new Set(levels).size !== levels.length) {
    throw new Error(`divinity talent config: duplicate ${field}`);
  }
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index] <= levels[index - 1]) {
      throw new Error(`divinity talent config: unordered ${field}`);
    }
  }
  return levels;
}

function parseExtraCosts(
  value: unknown,
  nodeLevels: ReadonlySet<number>,
  field: string,
): ReadonlyMap<number, number> {
  const record = requireRecord(value, field);
  const costs = new Map<number, number>();
  Object.entries(record).forEach(([levelKey, costValue]) => {
    const level = Number(levelKey);
    if (
      !Number.isSafeInteger(level) ||
      String(level) !== levelKey ||
      !nodeLevels.has(level)
    ) {
      throw new Error(`divinity talent config: invalid ${field} level`);
    }
    costs.set(level, requireNonNegativeInteger(costValue, `${field} ${level}`));
  });
  return costs;
}

function parseBranch(
  value: unknown,
  expectedId: DivinityTalentBranchId,
): DivinityTalentBranch {
  const branch = requireRecord(value, `${expectedId} branch`);
  if (branch.id !== expectedId) {
    throw new Error("divinity talent config: invalid branch order");
  }
  const nodeLevels = parseOrderedLevels(
    branch.nodeLevels,
    `${expectedId} node levels`,
  );
  const nodeLevelSet = new Set(nodeLevels);
  const majorLevels = parseOrderedLevels(
    branch.majorLevels,
    `${expectedId} major levels`,
  );
  if (majorLevels.some((level) => !nodeLevelSet.has(level))) {
    throw new Error(
      `divinity talent config: ${expectedId} major level has no node`,
    );
  }
  const majorLevelSet = new Set(majorLevels);
  const inheritedDivinityByLevel = parseExtraCosts(
    branch.inheritedDivinityByLevel,
    nodeLevelSet,
    `${expectedId} inherited divinity costs`,
  );
  const resonanceStoneByLevel = parseExtraCosts(
    branch.resonanceStoneByLevel,
    nodeLevelSet,
    `${expectedId} resonance stone costs`,
  );
  const minorNodeValues = branch.minorNodes;
  if (!Array.isArray(minorNodeValues)) {
    throw new Error(`divinity talent config: invalid ${expectedId} minor nodes`);
  }
  const minorNodes = new Map(
    minorNodeValues.map((nodeValue, index) => {
      const node = requireRecord(
        nodeValue,
        `${expectedId} minor node ${index + 1}`,
      );
      const level = requireLevel(
        node.level,
        `${expectedId} minor node ${index + 1} level`,
      );
      if (!nodeLevelSet.has(level) || majorLevelSet.has(level)) {
        throw new Error(
          `divinity talent config: invalid ${expectedId} minor node level`,
        );
      }
      const unit = requireText(
        node.unit,
        `${expectedId} minor node ${level} unit`,
      );
      if (unit !== "%" && unit !== "flat" && unit !== "level") {
        throw new Error(
          `divinity talent config: invalid ${expectedId} minor node ${level} unit`,
        );
      }
      return [
        level,
        {
          label: requireText(
            node.label,
            `${expectedId} minor node ${level} label`,
          ),
          value: requireNonNegativeInteger(
            node.value,
            `${expectedId} minor node ${level} value`,
          ),
          unit,
          icon: requireIcon(
            node.icon,
            `${expectedId} minor node ${level} icon`,
          ),
        },
      ] as const;
    }),
  );
  const expectedMinorLevels = nodeLevels.filter(
    (level) => !majorLevelSet.has(level),
  );
  if (
    minorNodes.size !== expectedMinorLevels.length ||
    expectedMinorLevels.some((level) => !minorNodes.has(level))
  ) {
    throw new Error(
      `divinity talent config: incomplete ${expectedId} minor nodes`,
    );
  }

  return {
    id: expectedId,
    label: requireText(branch.label, `${expectedId} label`),
    nodes: nodeLevels.map((level) => {
      const base = {
        branchId: expectedId,
        level,
        inheritedDivinity: inheritedDivinityByLevel.get(level) ?? 0,
        resonanceStone: resonanceStoneByLevel.get(level) ?? 0,
      } as const;
      if (majorLevelSet.has(level)) {
        return { ...base, kind: "major" as const };
      }
      const minorNode = minorNodes.get(level);
      if (!minorNode) {
        throw new Error(
          `divinity talent config: missing ${expectedId} minor node ${level}`,
        );
      }
      return { ...base, kind: "minor" as const, ...minorNode };
    }),
  };
}

function parseOriginalFaithIcon<
  ResourceId extends (typeof FAITH_RESOURCE_IDS)[number],
>(
  value: unknown,
  expectedResourceId: ResourceId,
  index: number,
): { resourceId: ResourceId; icon: string } {
  const entry = requireRecord(value, `original faith icon ${index}`);
  requireExactNumber(
    entry.resourceId,
    expectedResourceId,
    `original faith icon ${index} resource id`,
  );
  const icon = requireIcon(entry.icon, `original faith icon ${index}`);
  if (icon !== `/img/divinity/talents/${expectedResourceId}.png`) {
    throw new Error(
      `divinity talent config: unexpected original faith icon ${index}`,
    );
  }
  return { resourceId: expectedResourceId, icon };
}

function parseResources(value: unknown): DivinityTalentConfig["resources"] {
  const resources = requireRecord(value, "resources");
  const faith = requireRecord(resources.faith, "faith resource");
  const faithResourceIds = faith.resourceIds;
  if (
    !Array.isArray(faithResourceIds) ||
    faithResourceIds.length !== FAITH_RESOURCE_IDS.length
  ) {
    throw new Error("divinity talent config: invalid faith resource ids");
  }
  FAITH_RESOURCE_IDS.forEach((resourceId, index) => {
    requireExactNumber(
      faithResourceIds[index],
      resourceId,
      `faith resource id ${index + 1}`,
    );
  });
  const originalFaithIcons = faith.originalIcons;
  if (
    !Array.isArray(originalFaithIcons) ||
    originalFaithIcons.length !== FAITH_RESOURCE_IDS.length
  ) {
    throw new Error("divinity talent config: invalid original faith icons");
  }
  const parsedOriginalFaithIcons = [
    parseOriginalFaithIcon(originalFaithIcons[0], FAITH_RESOURCE_IDS[0], 1),
    parseOriginalFaithIcon(originalFaithIcons[1], FAITH_RESOURCE_IDS[1], 2),
    parseOriginalFaithIcon(originalFaithIcons[2], FAITH_RESOURCE_IDS[2], 3),
    parseOriginalFaithIcon(originalFaithIcons[3], FAITH_RESOURCE_IDS[3], 4),
  ] as const;

  const inheritedDivinity = requireRecord(
    resources.inheritedDivinity,
    "inherited divinity resource",
  );
  requireExactNumber(
    inheritedDivinity.resourceId,
    700300,
    "inherited divinity resource id",
  );

  const resonanceStone = requireRecord(
    resources.resonanceStone,
    "resonance stone resource",
  );
  requireExactNumber(
    resonanceStone.resourceId,
    700306,
    "resonance stone resource id",
  );

  return {
    faith: {
      resourceIds: FAITH_RESOURCE_IDS,
      originalIcons: parsedOriginalFaithIcons,
      label: requireText(faith.label, "faith label"),
      icon: requireIcon(faith.icon, "faith icon"),
    },
    inheritedDivinity: {
      resourceId: 700300,
      label: requireText(inheritedDivinity.label, "inherited divinity label"),
      icon: requireIcon(inheritedDivinity.icon, "inherited divinity icon"),
    },
    resonanceStone: {
      resourceId: 700306,
      label: requireText(resonanceStone.label, "resonance stone label"),
      icon: requireIcon(resonanceStone.icon, "resonance stone icon"),
    },
  };
}

export function validateDivinityTalentConfig(
  value: unknown,
): DivinityTalentConfig {
  const config = requireRecord(value, "root");
  if (config.schemaVersion !== 1) {
    throw new Error("divinity talent config: unexpected schema version");
  }
  const source = requireRecord(config.source, "source");
  if (source.clientVersion !== "1.48.0" || source.build !== 94) {
    throw new Error("divinity talent config: unexpected source");
  }
  if (!Array.isArray(config.branches) || config.branches.length !== 3) {
    throw new Error("divinity talent config: expected three branches");
  }
  const branches = config.branches;

  return {
    schemaVersion: 1,
    source: { clientVersion: "1.48.0", build: 94 },
    resources: parseResources(config.resources),
    levelCosts: parseLevelCosts(config.levelCosts),
    branches: BRANCH_IDS.map((branchId, index) =>
      parseBranch(branches[index], branchId),
    ),
  };
}
