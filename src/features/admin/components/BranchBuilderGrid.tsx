import React, { useState } from "react";
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
}: BranchBuilderGridProps) {
  const levels = Array.from({ length: 30 }, (_, index) => index + 1);
  const [activeBranchColumn, setActiveBranchColumn] =
    useState<BranchColumnId | null>(null);

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
          {columns.map((column) => {
            const node =
              template.find(
                (item) => item.level === level && item.columnId === column.id,
              ) ?? null;

            if (!node) {
              return <View key={column.id} style={styles.emptyCell} />;
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
              );
            }

            return (
              <View key={column.id} style={styles.nodeCell}>
                <BranchNodeCard
                  availableSkills={availableSkills}
                  node={node}
                  onOpenPicker={() => onOpenMajorSlot(column.id, level)}
                  onSelectSkill={(skillId) =>
                    onSelectMajorSkill(column.id, level, skillId)
                  }
                  pickerOpen={pickerOpen}
                  selectedSkill={selectedSkill}
                />
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
  return React.createElement(
    "details",
    { key: column.id, style: webStyles.details },
    React.createElement(
      "summary",
      {
        "aria-label": `Choose branch for ${column.label}`,
        role: "button",
        style: webStyles.summary,
      },
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
        : React.createElement("span", { style: webStyles.summaryText }, column.label),
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
    border: "1px solid transparent",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#f7dfac",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    listStyle: "none",
    minHeight: 44,
    padding: "8px",
    textAlign: "center",
  },
  summaryText: {
    minWidth: 0,
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
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    gap: 8,
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
    gap: 8,
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
  },
  emptyCell: {
    flex: 1,
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2b1c15",
    backgroundColor: "#17100d",
  },
});
