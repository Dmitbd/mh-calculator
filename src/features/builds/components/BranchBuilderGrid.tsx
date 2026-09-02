import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { filterSkillsForSlot } from "@/features/game-data/divinity/filterSkillsForSlot";
import { divinityBranchPointConnector } from "@/features/game-data/divinity";

import type {
  BranchColumn,
  BranchColumnId,
  DivinityBranch,
  DivinityBranchId,
  DivinityMajorSkill,
  DraftBranchColumns,
  TreeTemplateNode,
} from "@/features/game-data/divinity/types";
import { MajorNodeCard, MinorStatCard } from "./BranchNodeCard";
import { IconPreview } from "@/shared/ui/IconPreview";
import { AppImage } from "@/shared/ui/AppImage";
import { BranchNodeCaption } from "@/shared/ui/BranchNodeCaption";
import {
  BRANCH_TREE_COLUMN_GAP as COLUMN_GAP,
  BRANCH_TREE_LEVEL_COLUMN_WIDTH as LEVEL_COLUMN_WIDTH,
  BRANCH_TREE_ROW_GAP as ROW_GAP,
  BranchTreeGrid,
} from "@/shared/ui/BranchTreeGrid";
import { MajorSkillPicker } from "./MajorSkillPicker";
import { getBranchTreeToneForColumn } from "./branchTreeTone";

// Фиксированная высота ячеек заголовка — иконка + 2 строки текста без сдвига сетки
const BRANCH_HEADER_HEIGHT = 72;

type ActiveMajorSlot = {
  columnId: BranchColumnId;
  level: number;
} | null;

type BranchBuilderGridProps = {
  branches: readonly DivinityBranch[];
  columns: readonly BranchColumn[];
  selectedBranches: DraftBranchColumns;
  selectedMajorSkills: Partial<Record<string, string>>;
  /** Полный справочник скиллов — для отображения уже выбранных */
  skillCatalog: readonly DivinityMajorSkill[];
  /** Скиллы, доступные в текущем режиме — для пикера */
  skills: readonly DivinityMajorSkill[];
  template: readonly TreeTemplateNode[];
  activeMajorSlot?: ActiveMajorSlot;
  onSelectBranch?: (columnId: BranchColumnId, branchId: DivinityBranchId) => void;
  onOpenMajorSlot?: (columnId: BranchColumnId, level: number) => void;
  onSelectMajorSkill?: (
    columnId: BranchColumnId,
    level: number,
    skillId: string,
  ) => void;
  /** Уровень прогресса по столбцам — до какой ноды включительно подсвечивать активным */
  progressLevels: Partial<Record<BranchColumnId, number>>;
  /** Клик по ноде: установить/откатить прогресс столбца */
  onToggleProgress?: (columnId: BranchColumnId, level: number) => void;
  /** Режим только для чтения — без пикеров, выбора веток и переключения прогресса */
  readOnly?: boolean;
};

export function BranchBuilderGrid({
  branches,
  columns,
  selectedBranches,
  selectedMajorSkills,
  skillCatalog,
  skills,
  template,
  activeMajorSlot,
  onSelectBranch,
  onOpenMajorSlot,
  onSelectMajorSkill,
  progressLevels,
  onToggleProgress,
  readOnly = false,
}: BranchBuilderGridProps) {
  const levels = Array.from({ length: 30 }, (_, index) => index + 1);
  const [activeBranchColumn, setActiveBranchColumn] =
    useState<BranchColumnId | null>(null);

  // Нода активна, если уровень не выше прогресса своего столбца
  const isNodeActive = (columnId: BranchColumnId, level: number) => {
    const progress = progressLevels[columnId];
    return progress !== undefined && level <= progress;
  };

  const renderBuildNode = (node: TreeTemplateNode) => {
    const selectedSkillId =
      selectedMajorSkills[getMajorSkillKey(node.columnId, node.level)] ?? null;
    const selectedSkill =
      skillCatalog.find((skill) => skill.id === selectedSkillId) ?? null;

    if (node.nodeType === "minorStat") {
      return (
        <MinorStatCard
          active={isNodeActive(node.columnId, node.level)}
          node={node}
          onPress={() => onToggleProgress?.(node.columnId, node.level)}
          readOnly={readOnly}
        />
      );
    }

    return (
      <MajorNodeCard
        active={isNodeActive(node.columnId, node.level)}
        node={node}
        onPress={() => onOpenMajorSlot?.(node.columnId, node.level)}
        readOnly={readOnly}
        selectedSkill={selectedSkill}
      />
    );
  };

  const renderBuildNodeCaption = (node: TreeTemplateNode) => {
    const active = isNodeActive(node.columnId, node.level);

    if (node.nodeType === "minorStat") {
      return (
        <BranchNodeCaption
          active={active}
          meta={`+${node.value}${node.unit === "%" ? "%" : ""}`}
          testID={`branch-node-caption-${node.columnId}-${node.level}`}
          title={node.label}
          tone={getBranchTreeToneForColumn(node.columnId)}
        />
      );
    }

    const selectedSkillId =
      selectedMajorSkills[
        getMajorSkillKey(node.columnId, node.level)
      ] ?? null;
    const selectedSkill =
      skillCatalog.find((skill) => skill.id === selectedSkillId) ?? null;
    const branchId = selectedBranches[node.columnId];
    const availableSkills = branchId
      ? filterSkillsForSlot(skills, branchId, node.tier)
      : [];
    const pickerOpen =
      !readOnly &&
      activeMajorSlot?.columnId === node.columnId &&
      activeMajorSlot.level === node.level;

    return (
      <View style={styles.majorCaptionStack}>
        <BranchNodeCaption
          active={active}
          testID={`branch-node-caption-${node.columnId}-${node.level}`}
          title={selectedSkill?.name ?? "Большой талант"}
          tone={getBranchTreeToneForColumn(node.columnId)}
        />
        {pickerOpen ? (
          <MajorSkillPicker
            node={node}
            onSelect={(skillId) =>
              onSelectMajorSkill?.(node.columnId, node.level, skillId)
            }
            skills={availableSkills}
            tone={getBranchTreeToneForColumn(node.columnId)}
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.levelHeader]}>lv.</Text>
        {columns.map((column) => {
          const selectedBranch =
            branches.find((branch) => branch.id === selectedBranches[column.id]) ??
            null;
          const availableBranches = getAvailableBranchesForColumn(
            branches,
            selectedBranches,
            column.id,
          );
          const selectBranch = (branchId: DivinityBranchId) => {
            onSelectBranch?.(column.id, branchId);
            setActiveBranchColumn(null);
          };

          if (readOnly) {
            return (
              <View key={column.id} style={styles.headerBranchCell}>
                <View
                  style={[
                    styles.headerButton,
                    !selectedBranch && styles.headerButtonEmpty,
                  ]}
                >
                  {selectedBranch ? (
                    <>
                      <IconPreview
                        label={selectedBranch.title}
                        source={selectedBranch.icon}
                        size={24}
                      />
                      <Text style={styles.headerButtonText}>
                        {selectedBranch.title}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            );
          }

          if (Platform.OS === "web") {
            return (
              <WebBranchHeaderPicker
                branches={availableBranches}
                column={column}
                key={column.id}
                onSelectBranch={selectBranch}
                selectedBranch={selectedBranch}
              />
            );
          }

          const menuOpen = activeBranchColumn === column.id;

          return (
            <View key={column.id} style={styles.headerBranchCell}>
              <Pressable
                accessibilityLabel={`Choose branch for ${column.label}`}
                accessibilityRole="button"
                onPress={() =>
                  setActiveBranchColumn((current) =>
                    current === column.id ? null : column.id,
                  )
                }
                style={[
                  styles.headerButton,
                  !selectedBranch && styles.headerButtonEmpty,
                  menuOpen && styles.headerButtonOpen,
                ]}
              >
                {selectedBranch ? (
                  <>
                    <IconPreview
                      label={selectedBranch.title}
                      source={selectedBranch.icon}
                      size={24}
                    />
                    <Text style={styles.headerButtonText}>
                      {selectedBranch.title}
                    </Text>
                  </>
                ) : null}
              </Pressable>
              {menuOpen ? (
                <View style={styles.branchMenu}>
                  {availableBranches.map((branch) => (
                    <Pressable
                      accessibilityLabel={`Select ${branch.title} for ${column.label}`}
                      accessibilityRole="button"
                      key={branch.id}
                      onPress={() => selectBranch(branch.id)}
                      style={styles.branchOption}
                    >
                      <IconPreview label={branch.title} source={branch.icon} size={24} />
                      <Text style={styles.branchOptionText}>{branch.title}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <BranchTreeGrid
        branchPointConnector={divinityBranchPointConnector}
        columns={columns.map((column) => ({
          ...column,
          tone: getBranchTreeToneForColumn(column.id),
        }))}
        isBranchPoint={(node) => node.nodeType === "majorSkill"}
        isLevelActive={isNodeActive}
        levels={levels}
        nodes={template}
        renderNode={renderBuildNode}
        renderNodeCaption={renderBuildNodeCaption}
      />
    </View>
  );
}

type WebBranchHeaderPickerProps = {
  branches: readonly DivinityBranch[];
  column: BranchColumn;
  selectedBranch: DivinityBranch | null;
  onSelectBranch: (branchId: DivinityBranchId) => void;
};

function WebBranchHeaderPicker({
  branches,
  column,
  selectedBranch,
  onSelectBranch,
}: WebBranchHeaderPickerProps) {
  // Открыто ли меню — для подсветки рамки и поворота шеврона
  const [open, setOpen] = useState(false);

  const summaryStyle = {
    ...webStyles.summary,
    ...(selectedBranch ? null : webStyles.summaryEmpty),
    ...(open ? webStyles.summaryOpen : null),
  };

  return React.createElement(
    "details",
    {
      key: column.id,
      style: webStyles.details,
      onToggle: (event: React.SyntheticEvent<HTMLDetailsElement>) =>
        setOpen(event.currentTarget.open),
    },
    React.createElement(
      "summary",
      {
        "aria-label": `Choose branch for ${column.label}`,
        role: "button",
        style: summaryStyle,
      },
      React.createElement(
        "div",
        { style: webStyles.summaryContent },
        selectedBranch
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(AppImage, {
                accessible: false,
                accessibilityLabel: `${selectedBranch.title} icon`,
                borderRadius: 6,
                height: 24,
                source: selectedBranch.icon,
                testID: `branch-header-icon-${column.id}`,
                width: 24,
              }),
              React.createElement(
                "span",
                { style: webStyles.summaryText },
                selectedBranch.title,
              ),
            )
          : null,
      ),
      selectedBranch
        ? React.createElement(
            "span",
            {
              "aria-hidden": true,
              style: {
                ...webStyles.chevron,
                transform: open ? "rotate(-90deg)" : "rotate(90deg)",
              },
            },
            "›",
          )
        : null,
    ),
    React.createElement(
      "div",
      { style: webStyles.menu },
      branches.map((branch) =>
        React.createElement(
          "button",
          {
            "aria-label": `Select ${branch.title} for ${column.label}`,
            key: branch.id,
            onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
              onSelectBranch(branch.id);
              event.currentTarget.closest("details")?.removeAttribute("open");
            },
            style: webStyles.option,
            type: "button",
          },
          React.createElement(AppImage, {
            accessible: false,
            accessibilityLabel: `${branch.title} icon`,
            borderRadius: 6,
            height: 24,
            source: branch.icon,
            testID: `branch-option-icon-${column.id}-${branch.id}`,
            width: 24,
          }),
          React.createElement("span", { style: webStyles.optionText }, branch.title),
        ),
      ),
    ),
  );
}

function getMajorSkillKey(columnId: BranchColumnId, level: number): string {
  return `${columnId}:${level}`;
}

function getAvailableBranchesForColumn(
  branches: readonly DivinityBranch[],
  selectedBranches: DraftBranchColumns,
  columnId: BranchColumnId,
): DivinityBranch[] {
  const selectedInOtherColumns = new Set(
    Object.entries(selectedBranches)
      .filter(([selectedColumnId]) => selectedColumnId !== columnId)
      .map(([, branchId]) => branchId)
      .filter((branchId): branchId is DivinityBranchId => branchId !== null),
  );

  return branches.filter((branch) => !selectedInOtherColumns.has(branch.id));
}

const webStyles = {
  details: {
    flex: 1,
    height: BRANCH_HEADER_HEIGHT,
    position: "relative",
    zIndex: 100,
  },
  summary: {
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#f7dfac",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
    height: "100%",
    justifyContent: "space-between",
    listStyle: "none",
    padding: "8px",
    textAlign: "center",
  },
  // Пустое состояние: пунктир + приглушённый текст подсказывают «нажми и выбери»
  summaryEmpty: {
    borderStyle: "dashed",
    borderColor: "#6b4d34",
  },
  // Открытое меню — подсветка рамки и фона
  summaryOpen: {
    borderColor: "#f0c36a",
    backgroundColor: "#241610",
  },
  summaryContent: {
    alignItems: "center",
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 4,
    justifyContent: "center",
    minWidth: 0,
    overflow: "hidden",
  },
  summaryText: {
    display: "-webkit-box",
    minWidth: 0,
    overflow: "hidden",
    textAlign: "center",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    width: "100%",
  },
  // Шеврон-индикатор выпадающего списка, вращается при открытии
  chevron: {
    color: "#caa877",
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 1,
    transition: "transform 150ms ease",
  },
  menu: {
    backgroundColor: "#241610",
    border: "1px solid #62462f",
    borderRadius: 8,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    left: 0,
    padding: 8,
    position: "absolute",
    right: 0,
    top: BRANCH_HEADER_HEIGHT + 8,
    zIndex: 100,
  },
  option: {
    alignItems: "center",
    backgroundColor: "#1a100c",
    border: "1px solid #4d3524",
    borderRadius: 7,
    color: "#f3dfbc",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    fontWeight: 800,
    gap: 4,
    justifyContent: "center",
    minHeight: 38,
    padding: "7px 8px",
    textAlign: "center",
  },
  optionText: {
    display: "-webkit-box",
    overflow: "hidden",
    textAlign: "center",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    width: "100%",
  },
} as const;

const styles = StyleSheet.create({
  wrapper: {
    gap: ROW_GAP,
  },
  headerRow: {
    flexDirection: "row",
    gap: COLUMN_GAP,
    alignItems: "stretch",
    zIndex: 100,
  },
  headerCell: {
    flex: 1,
    color: "#f7dfac",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  levelHeader: {
    flex: 0,
    flexBasis: LEVEL_COLUMN_WIDTH,
    width: LEVEL_COLUMN_WIDTH,
    minWidth: LEVEL_COLUMN_WIDTH,
    maxWidth: LEVEL_COLUMN_WIDTH,
    height: BRANCH_HEADER_HEIGHT,
    lineHeight: BRANCH_HEADER_HEIGHT,
    textAlignVertical: "center",
  },
  headerBranchCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 8,
    height: BRANCH_HEADER_HEIGHT,
  },
  headerButton: {
    height: BRANCH_HEADER_HEIGHT,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerButtonOpen: {
    borderColor: "#f0c36a",
    backgroundColor: "#241610",
  },
  headerButtonEmpty: {
    borderStyle: "dashed",
    borderColor: "#6b4d34",
  },
  headerButtonText: {
    color: "#f7dfac",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    width: "100%",
  },
  branchMenu: {
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#62462f",
    backgroundColor: "#241610",
    padding: 8,
  },
  branchOption: {
    minHeight: 38,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#4d3524",
    backgroundColor: "#1a100c",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  branchOptionText: {
    color: "#f3dfbc",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  },
  majorCaptionStack: {
    width: "100%",
    alignItems: "center",
  },
});
