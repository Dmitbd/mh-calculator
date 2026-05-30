import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  BranchColumn,
  BranchColumnId,
  DivinityBranch,
  DivinityBranchId,
  DivinityMajorSkill,
  DraftBranchColumns,
  TreeTemplateNode,
} from "../types/admin.types";
import { BranchNodeCard } from "./BranchNodeCard";
import { IconPreview } from "./IconPreview";

// Отступы сетки: по X (между колонками) и по Y (между уровнями)
const COLUMN_GAP = 16;
const ROW_GAP = 24;
// Цвет вертикальной линии-«ветки», соединяющей ноды в столбце
const BRANCH_LINE_COLOR = "#4d3524";

type ActiveMajorSlot = {
  columnId: BranchColumnId;
  level: number;
} | null;

type BranchBuilderGridProps = {
  branches: readonly DivinityBranch[];
  columns: readonly BranchColumn[];
  selectedBranches: DraftBranchColumns;
  selectedMajorSkills: Partial<Record<string, string>>;
  skills: readonly DivinityMajorSkill[];
  template: readonly TreeTemplateNode[];
  activeMajorSlot: ActiveMajorSlot;
  onSelectBranch: (columnId: BranchColumnId, branchId: DivinityBranchId) => void;
  onOpenMajorSlot: (columnId: BranchColumnId, level: number) => void;
  onSelectMajorSkill: (
    columnId: BranchColumnId,
    level: number,
    skillId: string,
  ) => void;
  onClearMajorSkill: (columnId: BranchColumnId, level: number) => void;
};

export function BranchBuilderGrid({
  branches,
  columns,
  selectedBranches,
  selectedMajorSkills,
  skills,
  template,
  activeMajorSlot,
  onSelectBranch,
  onOpenMajorSlot,
  onSelectMajorSkill,
  onClearMajorSkill,
}: BranchBuilderGridProps) {
  const levels = Array.from({ length: 30 }, (_, index) => index + 1);
  const [activeBranchColumn, setActiveBranchColumn] =
    useState<BranchColumnId | null>(null);

  // Диапазон уровней с нодами в каждом столбце — линия идёт только от первой до последней ноды
  const columnNodeRanges = useMemo(() => {
    const ranges = {} as Record<
      BranchColumnId,
      { first: number; last: number } | null
    >;

    columns.forEach((column) => {
      const nodeLevels = template
        .filter((node) => node.columnId === column.id)
        .map((node) => node.level);

      ranges[column.id] = nodeLevels.length
        ? { first: Math.min(...nodeLevels), last: Math.max(...nodeLevels) }
        : null;
    });

    return ranges;
  }, [columns, template]);

  // Линия-«ветка» для ячейки: null до первой и после последней ноды,
  // обрезается у первой (идёт вниз) и последней (идёт вверх) ноды столбца
  const renderBranchLine = (columnId: BranchColumnId, level: number) => {
    const range = columnNodeRanges[columnId];

    if (!range || level < range.first || level > range.last) {
      return null;
    }

    return (
      <View
        style={[
          styles.branchLine,
          level === range.first && styles.branchLineStart,
          level === range.last && styles.branchLineEnd,
        ]}
      />
    );
  };

  // Ключи всех нод вида "уровень:колонка" — для быстрой проверки соседей
  const nodeKeys = useMemo(() => {
    const keys = new Set<string>();
    template.forEach((node) => keys.add(`${node.level}:${node.columnId}`));
    return keys;
  }, [template]);

  // Уровни, где у основной (центральной) колонки стоит мажорная нода —
  // только на них ствол ветвится горизонтально в боковые колонки
  const trunkMajorLevels = useMemo(() => {
    const mainColumnId = columns.find((column) => column.isMain)?.id;
    const levelsWithTrunkMajor = new Set<number>();

    if (mainColumnId) {
      template.forEach((node) => {
        if (node.columnId === mainColumnId && node.nodeType === "majorSkill") {
          levelsWithTrunkMajor.add(node.level);
        }
      });
    }

    return levelsWithTrunkMajor;
  }, [columns, template]);

  // Горизонтальные соединители: только на уровнях ветвления ствола и к соседям с нодой
  const renderHorizontalConnectors = (columnIndex: number, level: number) => {
    if (!trunkMajorLevels.has(level)) {
      return null;
    }

    const leftId = columns[columnIndex - 1]?.id;
    const rightId = columns[columnIndex + 1]?.id;
    const hasLeft = leftId ? nodeKeys.has(`${level}:${leftId}`) : false;
    const hasRight = rightId ? nodeKeys.has(`${level}:${rightId}`) : false;

    if (!hasLeft && !hasRight) {
      return null;
    }

    return (
      <>
        {hasLeft ? (
          <View style={[styles.branchLineH, styles.branchLineHLeft]} />
        ) : null}
        {hasRight ? (
          <View style={[styles.branchLineH, styles.branchLineHRight]} />
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.levelHeader]}>Level</Text>
        {columns.map((column) => {
          const selectedBranch =
            branches.find((branch) => branch.id === selectedBranches[column.id]) ??
            null;
          const selectBranch = (branchId: DivinityBranchId) => {
            onSelectBranch(column.id, branchId);
            setActiveBranchColumn(null);
          };

          if (Platform.OS === "web") {
            return (
              <WebBranchHeaderPicker
                branches={branches}
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
                style={[styles.headerButton, menuOpen && styles.headerButtonOpen]}
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
                ) : (
                  <Text style={styles.headerButtonText}>{column.label}</Text>
                )}
              </Pressable>
              {menuOpen ? (
                <View style={styles.branchMenu}>
                  {branches.map((branch) => (
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
      {levels.map((level) => (
        <View key={level} style={styles.row}>
          <Text style={styles.levelCell}>Lv. {level}</Text>
          {columns.map((column, columnIndex) => {
            const node =
              template.find(
                (item) => item.level === level && item.columnId === column.id,
              ) ?? null;

            if (!node) {
              return (
                <View key={column.id} style={styles.emptyCell}>
                  {renderBranchLine(column.id, level)}
                </View>
              );
            }

            const selectedSkillId =
              selectedMajorSkills[getMajorSkillKey(column.id, level)] ?? null;
            const selectedSkill =
              skills.find((skill) => skill.id === selectedSkillId) ?? null;
            const branchId = selectedBranches[column.id];
            const availableSkills = branchId
              ? skills.filter((skill) => skill.branchId === branchId)
              : [];
            const pickerOpen =
              activeMajorSlot?.columnId === column.id &&
              activeMajorSlot.level === level;

            if (node.nodeType === "minorStat") {
              return (
                <View key={column.id} style={styles.nodeCell}>
                  {renderBranchLine(column.id, level)}
                  {renderHorizontalConnectors(columnIndex, level)}
                  <View style={styles.nodeCellContent}>
                    <BranchNodeCard
                      availableSkills={[]}
                      node={node}
                      onOpenPicker={() => onOpenMajorSlot(column.id, level)}
                      onSelectSkill={(skillId) =>
                        onSelectMajorSkill(column.id, level, skillId)
                      }
                      pickerOpen={false}
                      selectedSkill={null}
                    />
                  </View>
                </View>
              );
            }

            return (
              <View key={column.id} style={styles.nodeCell}>
                {renderBranchLine(column.id, level)}
                {renderHorizontalConnectors(columnIndex, level)}
                <View style={styles.nodeCellContent}>
                  <BranchNodeCard
                    availableSkills={availableSkills}
                    node={node}
                    onClearSkill={() => onClearMajorSkill(column.id, level)}
                    onOpenPicker={() => onOpenMajorSlot(column.id, level)}
                    onSelectSkill={(skillId) =>
                      onSelectMajorSkill(column.id, level, skillId)
                    }
                    pickerOpen={pickerOpen}
                    selectedSkill={selectedSkill}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}
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
        "span",
        { style: webStyles.summaryContent },
        selectedBranch
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement("img", {
                "aria-label": `${selectedBranch.title} icon`,
                alt: "",
                src: selectedBranch.icon,
                style: webStyles.icon,
              }),
              React.createElement(
                "span",
                { style: webStyles.summaryText },
                selectedBranch.title,
              ),
            )
          : React.createElement(
              "span",
              { style: webStyles.placeholderText },
              column.label,
            ),
      ),
      React.createElement(
        "span",
        {
          "aria-hidden": true,
          style: {
            ...webStyles.chevron,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          },
        },
        "▾",
      ),
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
          React.createElement("img", {
            alt: "",
            src: branch.icon,
            style: webStyles.icon,
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

const webStyles = {
  details: {
    flex: 1,
    minHeight: 44,
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
    justifyContent: "space-between",
    listStyle: "none",
    minHeight: 44,
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
    gap: 8,
    minWidth: 0,
    overflow: "hidden",
  },
  summaryText: {
    minWidth: 0,
  },
  placeholderText: {
    color: "#caa877",
    minWidth: 0,
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
    top: 52,
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
    fontSize: 12,
    fontWeight: 800,
    gap: 8,
    minHeight: 38,
    padding: "7px 8px",
    textAlign: "left",
  },
  optionText: {
    flex: 1,
  },
  icon: {
    backgroundColor: "#271610",
    borderRadius: 6,
    height: 24,
    objectFit: "cover",
    width: 24,
  },
} as const;

const styles = StyleSheet.create({
  wrapper: {
    gap: ROW_GAP,
  },
  headerRow: {
    flexDirection: "row",
    gap: COLUMN_GAP,
    alignItems: "flex-start",
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
    flex: 0.45,
    minHeight: 44,
    paddingTop: 12,
  },
  headerBranchCell: {
    flex: 1,
    gap: 8,
  },
  headerButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  headerButtonText: {
    flexShrink: 1,
    color: "#f7dfac",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#4d3524",
    backgroundColor: "#1a100c",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  branchOptionText: {
    flex: 1,
    color: "#f3dfbc",
    fontSize: 12,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: COLUMN_GAP,
    alignItems: "stretch",
    zIndex: 1,
  },
  levelCell: {
    flex: 0.45,
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: "#1b110d",
    color: "#d8c2a1",
    fontSize: 12,
    fontWeight: "900",
    paddingTop: 12,
    textAlign: "center",
  },
  nodeCell: {
    flex: 1,
    justifyContent: "center",
  },
  nodeCellContent: {
    position: "relative",
    zIndex: 1,
  },
  emptyCell: {
    flex: 1,
    minHeight: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  // Вертикальная линия-«ветка»: за карточкой, выходит в отступы сверху и снизу,
  // поэтому соседние ячейки столбца визуально соединяются в непрерывную линию
  branchLine: {
    position: "absolute",
    top: -ROW_GAP,
    bottom: -ROW_GAP,
    left: "50%",
    width: 2,
    marginLeft: -1,
    backgroundColor: BRANCH_LINE_COLOR,
    zIndex: 0,
    pointerEvents: "none",
  },
  // Первая нода столбца — линия начинается от её центра и идёт вниз
  branchLineStart: {
    top: "50%",
  },
  // Последняя нода столбца — линия заканчивается у её центра
  branchLineEnd: {
    bottom: "50%",
  },
  // Горизонтальный соединитель: идёт из центра ноды (за карточкой) к соседней колонке
  branchLineH: {
    position: "absolute",
    top: "50%",
    marginTop: -1,
    height: 2,
    backgroundColor: BRANCH_LINE_COLOR,
    zIndex: 0,
    pointerEvents: "none",
  },
  branchLineHLeft: {
    left: -COLUMN_GAP,
    right: "50%",
  },
  branchLineHRight: {
    left: "50%",
    right: -COLUMN_GAP,
  },
});
