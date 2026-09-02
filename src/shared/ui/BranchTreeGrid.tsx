import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { AppImage } from "./AppImage";

export const BRANCH_TREE_COLUMN_GAP = 16;
export const BRANCH_TREE_ROW_GAP = 24;
export const BRANCH_TREE_LEVEL_COLUMN_WIDTH = 34;
export const BRANCH_TREE_NODE_STAGE_HEIGHT = 70;
export const BRANCH_TREE_MINOR_NODE_SIZE = 46;
export const BRANCH_TREE_MAJOR_NODE_SIZE = 64;
const BRANCH_TREE_NODE_CENTER = BRANCH_TREE_NODE_STAGE_HEIGHT / 2;
const BRANCH_TREE_ORNAMENT_WIDTH = 64;

const BRANCH_TREE_TONES = {
  blue: {
    color: "#2798ff",
    inactiveColor: "rgba(39, 152, 255, 0.24)",
    inactiveLineColor: "#1e5385",
    inactiveLineShadow: "0 0 4px rgba(39, 152, 255, 0.32)",
    shadow: "0 0 8px rgba(39, 152, 255, 0.9)",
    shadowColor: "rgba(39, 152, 255, 0.95)",
  },
  green: {
    color: "#62ef45",
    inactiveColor: "rgba(98, 239, 69, 0.24)",
    inactiveLineColor: "#3b7e28",
    inactiveLineShadow: "0 0 4px rgba(98, 239, 69, 0.32)",
    shadow: "0 0 8px rgba(98, 239, 69, 0.9)",
    shadowColor: "rgba(98, 239, 69, 0.95)",
  },
  purple: {
    color: "#a63dff",
    inactiveColor: "rgba(166, 61, 255, 0.24)",
    inactiveLineColor: "#5d2585",
    inactiveLineShadow: "0 0 4px rgba(166, 61, 255, 0.32)",
    shadow: "0 0 8px rgba(166, 61, 255, 0.9)",
    shadowColor: "rgba(166, 61, 255, 0.95)",
  },
} as const;

export type BranchTreeTone = keyof typeof BRANCH_TREE_TONES;

export function getBranchTreeTone(tone: BranchTreeTone) {
  return BRANCH_TREE_TONES[tone];
}

function getDecorativeConnectorAccessibility() {
  return {
    accessible: false,
    importantForAccessibility:
      Platform.OS === "android" ? ("no" as const) : undefined,
    "aria-hidden": Platform.OS === "web" ? true : undefined,
  } as const;
}

export type BranchTreeColumn<ColumnId extends string> = {
  id: ColumnId;
  label: string;
  isMain: boolean;
  tone: BranchTreeTone;
};

type BranchTreeNodeLike<ColumnId extends string> = {
  columnId: ColumnId;
  level: number;
};

export type BranchTreeGridProps<
  ColumnId extends string,
  Node extends BranchTreeNodeLike<ColumnId>,
> = {
  branchPointConnector?: {
    readonly description: string;
    readonly icon: string;
    readonly label: string;
    readonly meta: string;
  };
  columns: readonly BranchTreeColumn<ColumnId>[];
  levels: readonly number[];
  nodes: readonly Node[];
  isBranchPoint: (node: Node) => boolean;
  isLevelActive: (columnId: ColumnId, level: number) => boolean;
  levelHeading?: string;
  renderNode: (node: Node) => React.ReactNode;
  renderNodeCaption?: (node: Node) => React.ReactNode;
};

export function BranchTreeGrid<
  ColumnId extends string,
  Node extends BranchTreeNodeLike<ColumnId>,
>({
  branchPointConnector,
  columns,
  levels,
  nodes,
  isBranchPoint,
  isLevelActive,
  levelHeading,
  renderNode,
  renderNodeCaption,
}: BranchTreeGridProps<ColumnId, Node>) {
  const columnTones = useMemo(
    () => new Map(columns.map((column) => [column.id, column.tone])),
    [columns],
  );
  const getColumnTone = (columnId: ColumnId) => {
    const tone = columnTones.get(columnId);

    if (!tone) {
      throw new Error(`BranchTreeGrid received unknown column "${columnId}".`);
    }

    return getBranchTreeTone(tone);
  };
  const columnNodeLevels = useMemo(() => {
    const levelsByColumn = new Map<ColumnId, number[]>();

    columns.forEach((column) => {
      levelsByColumn.set(
        column.id,
        nodes
          .filter((node) => node.columnId === column.id)
          .map((node) => node.level)
          .sort((first, second) => first - second),
      );
    });

    return levelsByColumn;
  }, [columns, nodes]);

  const columnNodeRanges = useMemo(() => {
    const ranges = new Map<
      ColumnId,
      { first: number; last: number } | null
    >();

    columns.forEach((column) => {
      const nodeLevels = columnNodeLevels.get(column.id) ?? [];
      ranges.set(
        column.id,
        nodeLevels.length > 0
          ? { first: nodeLevels[0], last: nodeLevels[nodeLevels.length - 1] }
          : null,
      );
    });

    return ranges;
  }, [columnNodeLevels, columns]);

  const nodesByLevel = useMemo(() => {
    const byLevel = new Map<number, Map<ColumnId, Node>>();

    nodes.forEach((node) => {
      const levelNodes = byLevel.get(node.level) ?? new Map<ColumnId, Node>();

      if (levelNodes.has(node.columnId)) {
        throw new Error(
          `BranchTreeGrid received duplicate node for column "${node.columnId}" at level ${node.level}.`,
        );
      }

      levelNodes.set(node.columnId, node);
      byLevel.set(node.level, levelNodes);
    });

    return byLevel;
  }, [nodes]);

  const trunkBranchLevels = useMemo(() => {
    const mainColumnId = columns.find((column) => column.isMain)?.id;
    const branchLevels = new Set<number>();

    if (mainColumnId) {
      nodes.forEach((node) => {
        if (node.columnId === mainColumnId && isBranchPoint(node)) {
          branchLevels.add(node.level);
        }
      });
    }

    return branchLevels;
  }, [columns, isBranchPoint, nodes]);

  const hasNode = (columnId: ColumnId, level: number) =>
    nodesByLevel.get(level)?.has(columnId) ?? false;

  const getPreviousNodeLevel = (columnId: ColumnId, level: number) => {
    const nodeLevels = columnNodeLevels.get(columnId) ?? [];
    let previousLevel: number | null = null;

    for (const nodeLevel of nodeLevels) {
      if (nodeLevel >= level) {
        break;
      }

      previousLevel = nodeLevel;
    }

    return previousLevel;
  };

  const getNextNodeLevel = (columnId: ColumnId, level: number) =>
    (columnNodeLevels.get(columnId) ?? []).find(
      (nodeLevel) => nodeLevel > level,
    ) ?? null;

  const renderBranchLine = (columnId: ColumnId, level: number) => {
    const range = columnNodeRanges.get(columnId);
    const tone = getColumnTone(columnId);

    if (!range || level < range.first || level > range.last) {
      return null;
    }

    const previousNodeLevel = getPreviousNodeLevel(columnId, level);
    const nextNodeLevel = getNextNodeLevel(columnId, level);
    const upperSegmentTargetLevel = hasNode(columnId, level)
      ? level
      : nextNodeLevel;
    const upperSegmentActive =
      previousNodeLevel !== null &&
      upperSegmentTargetLevel !== null &&
      isLevelActive(columnId, previousNodeLevel) &&
      isLevelActive(columnId, upperSegmentTargetLevel);
    const lowerSegmentSourceLevel = hasNode(columnId, level)
      ? level
      : previousNodeLevel;
    const lowerSegmentActive =
      lowerSegmentSourceLevel !== null &&
      nextNodeLevel !== null &&
      isLevelActive(columnId, lowerSegmentSourceLevel) &&
      isLevelActive(columnId, nextNodeLevel);
    return (
      <>
        {level !== range.first ? (
          <View
            {...getDecorativeConnectorAccessibility()}
            accessibilityLabel={`${columnId} level ${level} upper branch connector`}
            style={[
              styles.branchLineSegment,
              styles.branchLineUpperSegment,
              {
                backgroundColor: tone.inactiveLineColor,
                boxShadow: tone.inactiveLineShadow,
              },
              upperSegmentActive && {
                backgroundColor: tone.color,
                boxShadow: tone.shadow,
              },
            ]}
            testID={`branch-tree-upper-${columnId}-${level}`}
          />
        ) : null}
        {level !== range.last ? (
          <View
              {...getDecorativeConnectorAccessibility()}
              accessibilityLabel={`${columnId} level ${level} lower branch connector`}
              style={[
                styles.branchLineSegment,
                styles.branchLineLowerSegment,
                {
                  backgroundColor: tone.inactiveLineColor,
                  boxShadow: tone.inactiveLineShadow,
                },
                lowerSegmentActive && {
                  backgroundColor: tone.color,
                  boxShadow: tone.shadow,
                },
              ]}
              testID={`branch-tree-lower-${columnId}-${level}`}
            />
        ) : null}
      </>
    );
  };

  const renderActiveTail = (columnId: ColumnId, level: number) => {
    const nextNodeLevel = getNextNodeLevel(columnId, level);
    const showActiveTail =
      hasNode(columnId, level) &&
      isLevelActive(columnId, level) &&
      (nextNodeLevel === null || !isLevelActive(columnId, nextNodeLevel));

    if (!showActiveTail) {
      return null;
    }

    const tone = getColumnTone(columnId);

    return (
      <View
        {...getDecorativeConnectorAccessibility()}
        style={[
          styles.branchLineSegment,
          styles.branchLineActiveTail,
          {
            backgroundColor: tone.color,
            boxShadow: tone.shadow,
          },
        ]}
        testID={`branch-tree-active-tail-${columnId}-${level}`}
      />
    );
  };

  const renderHorizontalTrack = (level: number) => {
    if (!trunkBranchLevels.has(level)) {
      return null;
    }

    const mainColumnIndex = columns.findIndex((column) => column.isMain);
    const mainColumn = columns[mainColumnIndex];
    const leftId = columns[mainColumnIndex - 1]?.id;
    const rightId = columns[mainColumnIndex + 1]?.id;

    if (!mainColumn || !leftId || !rightId) {
      return null;
    }

    const columnId = mainColumn.id;
    const leftTone = getColumnTone(leftId);
    const rightTone = getColumnTone(rightId);
    const hasLeft = leftId ? hasNode(leftId, level) : false;
    const hasRight = rightId ? hasNode(rightId, level) : false;

    if (!hasLeft && !hasRight) {
      return null;
    }

    const selfActive = isLevelActive(columnId, level);
    const leftActive =
      hasLeft && leftId
        ? selfActive && isLevelActive(leftId, level)
        : false;
    const rightActive =
      hasRight && rightId
        ? selfActive && isLevelActive(rightId, level)
        : false;

    return (
      <>
        <View
          {...getDecorativeConnectorAccessibility()}
          style={styles.branchLineHorizontalTrack}
          testID={`branch-tree-horizontal-track-${level}`}
        >
          <View
            style={[
              styles.branchLineHorizontalHalf,
              {
                backgroundColor: leftTone.inactiveLineColor,
                boxShadow: leftTone.inactiveLineShadow,
              },
              leftActive && {
                backgroundColor: leftTone.color,
                boxShadow: leftTone.shadow,
              },
              !hasLeft && styles.branchLineHorizontalHidden,
            ]}
            testID={`branch-tree-horizontal-left-${level}`}
          />
          <View
            style={[
              styles.branchLineHorizontalHalf,
              {
                backgroundColor: rightTone.inactiveLineColor,
                boxShadow: rightTone.inactiveLineShadow,
              },
              rightActive && {
                backgroundColor: rightTone.color,
                boxShadow: rightTone.shadow,
              },
              !hasRight && styles.branchLineHorizontalHidden,
            ]}
            testID={`branch-tree-horizontal-right-${level}`}
          />
        </View>
        {hasLeft && branchPointConnector ? (
          <View
            accessibilityLabel={`${branchPointConnector.label}. ${branchPointConnector.description}`}
            accessible
            style={[styles.branchOrnament, styles.branchOrnamentLeft]}
            testID={`branch-tree-ornament-${columnId}-left-${level}`}
          >
            <AppImage
              accessible={false}
              accessibilityLabel=""
              borderRadius={10}
              height={20}
              loadingMode="static"
              resizeMode="contain"
              source={branchPointConnector.icon}
              width={20}
            />
          </View>
        ) : null}
        {hasRight && branchPointConnector ? (
          <View
            accessibilityLabel={`${branchPointConnector.label}. ${branchPointConnector.description}`}
            accessible
            style={[styles.branchOrnament, styles.branchOrnamentRight]}
            testID={`branch-tree-ornament-${columnId}-right-${level}`}
          >
            <AppImage
              accessible={false}
              accessibilityLabel=""
              borderRadius={10}
              height={20}
              loadingMode="static"
              resizeMode="contain"
              source={branchPointConnector.icon}
              width={20}
            />
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      {levelHeading ? (
        <Text style={styles.levelHeading} testID="branch-tree-level-heading">
          {levelHeading}
        </Text>
      ) : null}
      <View style={styles.rows}>
        {levels.map((level) => {
          return (
            <View key={level} style={styles.row}>
            <Text style={styles.levelCell} testID={`branch-tree-level-${level}`}>
              {level}
            </Text>
            <View style={styles.branchColumns}>
              {renderHorizontalTrack(level)}
              {columns.map((column) => {
                const node = nodesByLevel.get(level)?.get(column.id) ?? null;

                if (!node) {
                  return (
                    <View key={column.id} style={styles.emptyCell}>
                      {renderBranchLine(column.id, level)}
                    </View>
                  );
                }

                return (
                  <View
                    key={column.id}
                    style={styles.nodeCell}
                    testID={`branch-tree-node-${column.id}-${level}`}
                  >
                    {renderBranchLine(column.id, level)}
                    <View
                      style={styles.nodeCellContent}
                      testID={`branch-tree-node-content-${column.id}-${level}`}
                    >
                      {renderActiveTail(column.id, level)}
                      <View
                        style={styles.nodeStage}
                        testID={`branch-tree-node-stage-${column.id}-${level}`}
                      >
                        {renderNode(node)}
                      </View>
                      {renderNodeCaption ? (
                        <View
                          style={styles.nodeCaptionStage}
                          testID={`branch-tree-node-caption-stage-${column.id}-${level}`}
                        >
                          {renderNodeCaption(node)}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  rows: {
    gap: BRANCH_TREE_ROW_GAP,
  },
  levelHeading: {
    width: BRANCH_TREE_LEVEL_COLUMN_WIDTH,
    marginBottom: 8,
    color: "#d8c2a1",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: BRANCH_TREE_COLUMN_GAP,
    alignItems: "stretch",
    zIndex: 1,
  },
  branchColumns: {
    flex: 1,
    flexDirection: "row",
    gap: BRANCH_TREE_COLUMN_GAP,
    position: "relative",
  },
  levelCell: {
    flex: 0,
    flexBasis: BRANCH_TREE_LEVEL_COLUMN_WIDTH,
    width: BRANCH_TREE_LEVEL_COLUMN_WIDTH,
    minWidth: BRANCH_TREE_LEVEL_COLUMN_WIDTH,
    maxWidth: BRANCH_TREE_LEVEL_COLUMN_WIDTH,
    minHeight: BRANCH_TREE_NODE_STAGE_HEIGHT,
    color: "#d8c2a1",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: BRANCH_TREE_NODE_STAGE_HEIGHT,
    textAlign: "center",
  },
  nodeCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },
  nodeCellContent: {
    position: "relative",
    zIndex: 4,
    width: "100%",
  },
  nodeStage: {
    width: "100%",
    height: BRANCH_TREE_NODE_STAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 4,
  },
  nodeCaptionStage: {
    width: "100%",
    minWidth: 0,
    alignItems: "center",
    position: "relative",
    zIndex: 4,
  },
  emptyCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: BRANCH_TREE_NODE_STAGE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  branchLineSegment: {
    position: "absolute",
    left: "50%",
    width: 2,
    zIndex: 0,
    pointerEvents: "none",
    transform: [{ translateX: "-50%" }],
  },
  branchLineUpperSegment: {
    top: -BRANCH_TREE_ROW_GAP,
    height: BRANCH_TREE_NODE_CENTER + BRANCH_TREE_ROW_GAP,
  },
  branchLineLowerSegment: {
    top: BRANCH_TREE_NODE_CENTER,
    bottom: -BRANCH_TREE_ROW_GAP,
  },
  branchLineActiveTail: {
    top: BRANCH_TREE_NODE_CENTER,
    bottom: 0,
  },
  branchLineHorizontalTrack: {
    position: "absolute",
    top: BRANCH_TREE_NODE_CENTER - 1,
    left: "16.6667%",
    right: "16.6667%",
    height: 2,
    flexDirection: "row",
    zIndex: 0,
    pointerEvents: "none",
  },
  branchLineHorizontalHalf: {
    flex: 1,
    height: 2,
  },
  branchLineHorizontalHidden: {
    opacity: 0,
  },
  branchOrnament: {
    position: "absolute",
    top: BRANCH_TREE_NODE_CENTER,
    zIndex: 2,
    width: BRANCH_TREE_ORNAMENT_WIDTH,
    marginTop: -10,
    pointerEvents: "none",
    alignItems: "center",
  },
  branchOrnamentLeft: {
    left: "33.3333%",
    marginLeft: -BRANCH_TREE_ORNAMENT_WIDTH / 2,
  },
  branchOrnamentRight: {
    right: "33.3333%",
    marginRight: -BRANCH_TREE_ORNAMENT_WIDTH / 2,
  },
});
