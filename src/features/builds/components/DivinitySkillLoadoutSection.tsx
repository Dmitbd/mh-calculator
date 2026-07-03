import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  DIVINITY_SKILL_AWAKENED_NODE_BUDGET,
  DIVINITY_SKILL_BASE_NODE_BUDGET,
  DIVINITY_SKILL_LOADOUT_MAX_SLOTS,
  getDivinitySkillLoadoutCost,
  getDivinitySkillNodeCost,
} from "@/features/game-data/divinity";
import type {
  DivinityBranch,
  DivinityMajorSkill,
} from "@/features/game-data/divinity";
import { IconPreview } from "@/shared/ui/IconPreview";

type LoadoutRowId = "base" | "awakened";

type ActiveSlot = {
  rowId: LoadoutRowId;
  index: number;
} | null;

type DivinitySkillLoadoutSectionProps = {
  branches: readonly DivinityBranch[];
  skills: readonly DivinityMajorSkill[];
  availableSkillBranchIds?: readonly string[];
  baseSkillIds: readonly (string | null)[];
  awakenedSkillIds?: readonly (string | null)[];
  awakenedEnabled?: boolean;
  onSelectSkill?: (
    rowId: LoadoutRowId,
    slotIndex: number,
    skillId: string | null,
  ) => void;
  onShowAwakened?: () => void;
  readOnly?: boolean;
  requiredSkillBranchCount?: number;
};

export function DivinitySkillLoadoutSection({
  awakenedEnabled = false,
  awakenedSkillIds = [],
  availableSkillBranchIds,
  baseSkillIds,
  branches,
  onSelectSkill,
  onShowAwakened,
  readOnly = false,
  requiredSkillBranchCount = 3,
  skills,
}: DivinitySkillLoadoutSectionProps) {
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);
  const skillsById = useMemo(
    () => new Map(skills.map((skill) => [skill.id, skill])),
    [skills],
  );
  const branchTitleById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.title])),
    [branches],
  );
  const sortedSkills = useMemo(
    () =>
      [...skills].sort((first, second) => {
        if (first.branchId !== second.branchId) {
          return first.branchId.localeCompare(second.branchId);
        }

        if (first.tier !== second.tier) {
          return first.tier - second.tier;
        }

        return first.name.localeCompare(second.name);
      }),
    [skills],
  );
  const selectedSkillBranchIds = useMemo(
    () => [...new Set((availableSkillBranchIds ?? []).filter(Boolean))],
    [availableSkillBranchIds],
  );
  const filteredSkills = useMemo(() => {
    if (availableSkillBranchIds === undefined) {
      return sortedSkills;
    }

    const branchIds = new Set(selectedSkillBranchIds);

    return sortedSkills.filter((skill) => branchIds.has(skill.branchId));
  }, [availableSkillBranchIds, selectedSkillBranchIds, sortedSkills]);
  const branchSelectionMessage =
    !readOnly && activeSlot && availableSkillBranchIds !== undefined
      ? getBranchSelectionMessage(
          selectedSkillBranchIds.length,
          requiredSkillBranchCount,
        )
      : null;

  const selectSkill = (
    rowId: LoadoutRowId,
    index: number,
    skillId: string | null,
  ) => {
    onSelectSkill?.(rowId, index, skillId);
    setActiveSlot(null);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Навыки божественности</Text>
      </View>

      <LoadoutRow
        activeSlot={activeSlot}
        branchTitleById={branchTitleById}
        maxNodes={DIVINITY_SKILL_BASE_NODE_BUDGET}
        readOnly={readOnly}
        rowId="base"
        rowLabel="6 узлов"
        selectedSkillIds={baseSkillIds}
        setActiveSlot={setActiveSlot}
        skillsById={skillsById}
      />
      {!readOnly && activeSlot?.rowId === "base" ? (
        branchSelectionMessage ? (
          <Text style={styles.pickerError}>{branchSelectionMessage}</Text>
        ) : (
          <SkillPicker
            branchTitleById={branchTitleById}
            onClear={() => selectSkill("base", activeSlot.index, null)}
            onSelect={(skillId) => selectSkill("base", activeSlot.index, skillId)}
            skills={filteredSkills}
          />
        )
      ) : null}

      {awakenedEnabled ? (
        <>
          <LoadoutRow
            activeSlot={activeSlot}
            branchTitleById={branchTitleById}
            maxNodes={DIVINITY_SKILL_AWAKENED_NODE_BUDGET}
            readOnly={readOnly}
            rowId="awakened"
            rowLabel="7 узлов"
            selectedSkillIds={awakenedSkillIds}
            setActiveSlot={setActiveSlot}
            skillsById={skillsById}
          />
          {!readOnly && activeSlot?.rowId === "awakened" ? (
            branchSelectionMessage ? (
              <Text style={styles.pickerError}>{branchSelectionMessage}</Text>
            ) : (
              <SkillPicker
                branchTitleById={branchTitleById}
                onClear={() => selectSkill("awakened", activeSlot.index, null)}
                onSelect={(skillId) =>
                  selectSkill("awakened", activeSlot.index, skillId)
                }
                skills={filteredSkills}
              />
            )
          ) : null}
        </>
      ) : !readOnly ? (
        <Pressable
          accessibilityLabel="Добавить навыки для 7 божественных узлов"
          accessibilityRole="button"
          onPress={onShowAwakened}
          style={styles.addAwakenedButton}
        >
          <Text style={styles.addAwakenedText}>
            Добавить навыки для 7 божественных узлов
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getBranchSelectionMessage(
  selectedBranchCount: number,
  requiredBranchCount: number,
): string | null {
  if (selectedBranchCount === 0) {
    return "Сначала выберите ветки дерева.";
  }

  if (selectedBranchCount < requiredBranchCount) {
    return `Выберите все ${requiredBranchCount} ветки дерева, чтобы открыть список навыков божественности.`;
  }

  return null;
}

type LoadoutRowProps = {
  activeSlot: ActiveSlot;
  branchTitleById: ReadonlyMap<string, string>;
  maxNodes: number;
  readOnly: boolean;
  rowId: LoadoutRowId;
  rowLabel: string;
  selectedSkillIds: readonly (string | null)[];
  setActiveSlot: (slot: ActiveSlot) => void;
  skillsById: ReadonlyMap<string, DivinityMajorSkill>;
};

function LoadoutRow({
  activeSlot,
  branchTitleById,
  maxNodes,
  readOnly,
  rowId,
  rowLabel,
  selectedSkillIds,
  setActiveSlot,
  skillsById,
}: LoadoutRowProps) {
  const skillIds = selectedSkillIds.filter(
    (skillId): skillId is string => Boolean(skillId),
  );
  const totalCost = getDivinitySkillLoadoutCost(skillIds, skillsById);

  return (
    <View style={styles.rowBlock}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{rowLabel}</Text>
        <Text
          style={[
            styles.rowBudget,
            totalCost > maxNodes && styles.rowBudgetExceeded,
          ]}
        >
          {totalCost}/{maxNodes}
        </Text>
      </View>
      <View style={styles.slotRow}>
        {Array.from({ length: DIVINITY_SKILL_LOADOUT_MAX_SLOTS }, (_, index) => {
          const skillId = selectedSkillIds[index] ?? null;
          const skill = skillId ? skillsById.get(skillId) ?? null : null;
          const selected =
            activeSlot?.rowId === rowId && activeSlot.index === index;
          const branchTitle = skill
            ? branchTitleById.get(skill.branchId) ?? skill.branchId
            : "";
          const content = (
            <>
              <IconPreview
                label={skill?.name ?? "Divinity skill"}
                source={skill?.icon ?? null}
                size={30}
              />
              <View style={styles.slotTextBlock}>
                <Text style={styles.slotTitle}>{skill?.name ?? "—"}</Text>
                {skill ? (
                  <Text style={styles.slotMeta}>
                    {branchTitle} · {getDivinitySkillNodeCost(skill)} уз.
                  </Text>
                ) : null}
              </View>
            </>
          );

          if (readOnly) {
            return (
              <View key={`${rowId}:${index}`} style={styles.slot}>
                {content}
              </View>
            );
          }

          return (
            <Pressable
              accessibilityLabel={`Выбрать навык божественности ${rowLabel}, слот ${index + 1}`}
              accessibilityRole="button"
              key={`${rowId}:${index}`}
              onPress={() =>
                setActiveSlot(selected ? null : { rowId, index })
              }
              style={[styles.slot, selected && styles.slotSelected]}
            >
              {content}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type SkillPickerProps = {
  branchTitleById: ReadonlyMap<string, string>;
  onClear: () => void;
  onSelect: (skillId: string) => void;
  skills: readonly DivinityMajorSkill[];
};

function SkillPicker({
  branchTitleById,
  onClear,
  onSelect,
  skills,
}: SkillPickerProps) {
  return (
    <View style={styles.picker}>
      <Pressable
        accessibilityLabel="Очистить навык божественности"
        accessibilityRole="button"
        onPress={onClear}
        style={[styles.pickerOption, styles.clearOption]}
      >
        <Text style={styles.clearOptionText}>Очистить</Text>
      </Pressable>
      {skills.map((skill) => (
        <Pressable
          accessibilityLabel={`Выбрать навык божественности ${skill.name}`}
          accessibilityRole="button"
          key={skill.id}
          onPress={() => onSelect(skill.id)}
          style={styles.pickerOption}
        >
          <IconPreview label={skill.name} source={skill.icon} size={24} />
          <View style={styles.pickerTextBlock}>
            <Text style={styles.pickerTitle}>{skill.name}</Text>
            <Text style={styles.pickerMeta}>
              {branchTitleById.get(skill.branchId) ?? skill.branchId} ·{" "}
              {getDivinitySkillNodeCost(skill)} уз.
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#fff4d7",
    fontSize: 18,
    fontWeight: "900",
  },
  rowBlock: {
    gap: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    color: "#d9bb87",
    fontSize: 13,
    fontWeight: "800",
  },
  rowBudget: {
    color: "#f0c36a",
    fontSize: 13,
    fontWeight: "900",
  },
  rowBudgetExceeded: {
    color: "#ff8f70",
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
  },
  slot: {
    minHeight: 94,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#241610",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  slotSelected: {
    borderColor: "#f0c36a",
    backgroundColor: "#3a2810",
  },
  slotTextBlock: {
    minHeight: 34,
    justifyContent: "center",
    gap: 2,
    width: "100%",
  },
  slotTitle: {
    color: "#fff4d7",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  slotMeta: {
    color: "#bea17b",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  addAwakenedButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6d4f2d",
    backgroundColor: "#2b1b11",
    paddingHorizontal: 12,
  },
  addAwakenedText: {
    color: "#f0c36a",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  picker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a2a1d",
    backgroundColor: "#1d130f",
    padding: 8,
  },
  pickerError: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#79403a",
    backgroundColor: "#261311",
    color: "#ffb8a8",
    fontSize: 13,
    fontWeight: "800",
    padding: 12,
  },
  pickerOption: {
    width: 136,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 6,
    backgroundColor: "#281a12",
    padding: 6,
  },
  clearOption: {
    justifyContent: "center",
  },
  clearOptionText: {
    color: "#f3d9b3",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    width: "100%",
  },
  pickerTextBlock: {
    flex: 1,
    gap: 2,
  },
  pickerTitle: {
    color: "#f7dfac",
    fontSize: 12,
    fontWeight: "800",
  },
  pickerMeta: {
    color: "#b9956d",
    fontSize: 10,
    fontWeight: "700",
  },
});
