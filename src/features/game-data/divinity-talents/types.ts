export type DivinityTalentBranchId = "left" | "center" | "right";

export type DivinityTalentNodeKind = "minor" | "major";

export type DivinityTalentNodeCost = {
  readonly faith: number;
  readonly inheritedDivinity: number;
  readonly resonanceStone: number;
};

type DivinityTalentNodeBase = {
  readonly branchId: DivinityTalentBranchId;
  readonly level: number;
  readonly inheritedDivinity: number;
  readonly resonanceStone: number;
};

export type DivinityTalentMajorNode = DivinityTalentNodeBase & {
  readonly kind: "major";
};

export type DivinityTalentMinorNode = DivinityTalentNodeBase & {
  readonly kind: "minor";
  readonly label: string;
  readonly value: number;
  readonly unit: "%" | "flat" | "level";
  readonly icon: string;
};

export type DivinityTalentNode =
  | DivinityTalentMajorNode
  | DivinityTalentMinorNode;

export type DivinityTalentBranch = {
  readonly id: DivinityTalentBranchId;
  readonly label: string;
  readonly nodes: readonly DivinityTalentNode[];
};

export type DivinityTalentLevelCost = {
  readonly level: number;
  readonly faith: number;
};

export type DivinityTalentConfig = {
  readonly schemaVersion: 1;
  readonly source: {
    readonly clientVersion: "1.48.0";
    readonly build: 94;
  };
  readonly resources: {
    readonly faith: {
      readonly resourceIds: readonly [700301, 700302, 700303, 700304];
      readonly originalIcons: readonly [
        { readonly resourceId: 700301; readonly icon: string },
        { readonly resourceId: 700302; readonly icon: string },
        { readonly resourceId: 700303; readonly icon: string },
        { readonly resourceId: 700304; readonly icon: string },
      ];
      readonly label: string;
      readonly icon: string;
    };
    readonly inheritedDivinity: {
      readonly resourceId: 700300;
      readonly label: string;
      readonly icon: string;
    };
    readonly resonanceStone: {
      readonly resourceId: 700306;
      readonly label: string;
      readonly icon: string;
    };
  };
  readonly levelCosts: readonly DivinityTalentLevelCost[];
  readonly branches: readonly DivinityTalentBranch[];
};
