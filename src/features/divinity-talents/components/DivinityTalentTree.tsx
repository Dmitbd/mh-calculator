import { memo, useCallback, useMemo } from "react";
import { View } from "react-native";

import { divinityBranchPointConnector } from "@/features/game-data/divinity";
import {
  getDivinityTalentNodeCost,
  type DivinityTalentBranch,
  type DivinityTalentBranchId,
  type DivinityTalentConfig,
  type DivinityTalentNode,
} from "@/features/game-data/divinity-talents";
import { BranchNodeCaption } from "@/shared/ui/BranchNodeCaption";
import {
  BranchTreeGrid,
  type BranchTreeTone,
} from "@/shared/ui/BranchTreeGrid";

import type { DivinityTalentSelections } from "../model/types";
import {
  DivinityTalentNode as DivinityTalentNodeView,
} from "./DivinityTalentNode";
import {
  DivinityTalentNodeCost,
  getDivinityTalentNodeCostItems,
  type DivinityTalentNodeCostItem,
} from "./DivinityTalentNodeCost";

const BRANCH_ORDER = ["left", "center", "right"] as const;
const BRANCH_TONE: Readonly<
  Record<DivinityTalentBranchId, BranchTreeTone>
> = {
  left: "blue",
  center: "green",
  right: "purple",
};

type DivinityTalentTreeNode = DivinityTalentNode & {
  readonly columnId: DivinityTalentBranchId;
  readonly cost: ReturnType<typeof getDivinityTalentNodeCost>;
  readonly costItems: readonly DivinityTalentNodeCostItem[];
  readonly costLabel: string;
  readonly branchLabel: string;
  readonly nodeKey: string;
};

type DivinityTalentTreeProps = {
  config: DivinityTalentConfig;
  selections: DivinityTalentSelections;
  onSelectNode: (
    branchId: DivinityTalentBranchId,
    level: number,
  ) => Promise<void>;
};

const isBranchPoint = (node: DivinityTalentTreeNode) =>
  node.kind === "major";

function getBranch(
  config: DivinityTalentConfig,
  branchId: DivinityTalentBranchId,
): DivinityTalentBranch {
  const branch = config.branches.find((item) => item.id === branchId);
  if (!branch) {
    throw new Error(`Missing divinity talent branch: ${branchId}`);
  }
  return branch;
}

function isLevelSelected(
  selections: DivinityTalentSelections,
  branchId: DivinityTalentBranchId,
  level: number,
): boolean {
  const selection = selections[branchId];
  if (!selection) {
    return false;
  }
  return (
    level >= Math.min(selection.a, selection.b) &&
    level <= Math.max(selection.a, selection.b)
  );
}

export function DivinityTalentTree({
  config,
  selections,
  onSelectNode,
}: DivinityTalentTreeProps) {
  const preparedTree = useMemo(() => {
    const branches = BRANCH_ORDER.map((branchId) =>
      getBranch(config, branchId),
    );
    const columns = branches.map((branch) => ({
      id: branch.id,
      label: branch.label,
      isMain: branch.id === "center",
      tone: BRANCH_TONE[branch.id],
    }));
    const nodes: readonly DivinityTalentTreeNode[] = branches.flatMap(
      (branch) =>
        branch.nodes.map((node) => {
          const cost = getDivinityTalentNodeCost(
            config,
            node.branchId,
            node.level,
          );
          const costItems = getDivinityTalentNodeCostItems(config, cost);

          return {
            ...node,
            branchLabel: branch.label,
            columnId: node.branchId,
            cost,
            costItems,
            costLabel:
              costItems
                .map((item) => `${item.resource.label} ${item.value}`)
                .join(", ") || "нет расхода ресурсов",
            nodeKey: `${node.branchId}:${node.level}`,
          };
        }),
    );

    return {
      branches,
      columns,
      levels: config.levelCosts.map((levelCost) => levelCost.level),
      nodes,
    };
  }, [config]);
  const isLevelActive = useCallback(
    (branchId: DivinityTalentBranchId, level: number) =>
      isLevelSelected(selections, branchId, level),
    [selections],
  );
  const renderNode = useCallback(
    (node: DivinityTalentTreeNode) => (
      <PreparedDivinityTalentNode
        active={isLevelSelected(selections, node.branchId, node.level)}
        key={node.nodeKey}
        node={node}
        onSelectNode={onSelectNode}
        tone={BRANCH_TONE[node.branchId]}
      />
    ),
    [onSelectNode, selections],
  );
  const renderNodeCaption = useCallback(
    (node: DivinityTalentTreeNode) => {
      const testID = `divinity-talent-node-caption-${node.branchId}-${node.level}`;
      const meta =
        node.kind === "minor"
          ? `+${node.value}${node.unit === "%" ? "%" : ""}`
          : null;

      return (
        <BranchNodeCaption
          active={isLevelSelected(selections, node.branchId, node.level)}
          meta={meta}
          testID={testID}
          title={node.kind === "major" ? "Большая нода" : node.label}
          tone={BRANCH_TONE[node.branchId]}
        >
          <DivinityTalentNodeCost
            config={config}
            cost={node.cost}
            items={node.costItems}
            testIDPrefix={`${testID}-cost`}
          />
        </BranchNodeCaption>
      );
    },
    [config, selections],
  );

  return (
    <View>
      <BranchTreeGrid
        branchPointConnector={divinityBranchPointConnector}
        columns={preparedTree.columns}
        isBranchPoint={isBranchPoint}
        isLevelActive={isLevelActive}
        levelHeading="lv."
        levels={preparedTree.levels}
        nodes={preparedTree.nodes}
        renderNode={renderNode}
        renderNodeCaption={renderNodeCaption}
      />
    </View>
  );
}

type PreparedDivinityTalentNodeProps = {
  readonly active: boolean;
  readonly node: DivinityTalentTreeNode;
  readonly onSelectNode: (
    branchId: DivinityTalentBranchId,
    level: number,
  ) => Promise<void>;
  readonly tone: BranchTreeTone;
};

const PreparedDivinityTalentNode = memo(
  function PreparedDivinityTalentNode({
    active,
    node,
    onSelectNode,
    tone,
  }: PreparedDivinityTalentNodeProps) {
    const handlePress = useCallback(() => {
      void onSelectNode(node.branchId, node.level).catch(() => undefined);
    }, [node.branchId, node.level, onSelectNode]);

    return (
      <DivinityTalentNodeView
        active={active}
        branchLabel={node.branchLabel}
        costLabel={node.costLabel}
        node={node}
        onPress={handlePress}
        tone={tone}
      />
    );
  },
);
