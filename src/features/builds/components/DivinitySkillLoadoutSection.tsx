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
import { builderTheme } from "@/shared/ui/builderTheme";
import { IconPreview } from "@/shared/ui/IconPreview";

type LoadoutRowId = "base" | "awakened";

type ActiveSlot = {
  rowId: LoadoutRowId;
  index: number;
} | null;

type PickerNotice = {
  rowId: LoadoutRowId;
  message: string;
} | null;

type DivinitySkillLoadoutSectionProps = {
  branches: readonly DivinityBranch[];
  skills: readonly DivinityMajorSkill[];
  availableSkillIds?: readonly string[];
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
};

export function DivinitySkillLoadoutSection({
  awakenedEnabled = false,
  awakenedSkillIds = [],
  availableSkillIds,
  baseSkillIds,
  onSelectSkill,
  onShowAwakened,
  readOnly = false,
  skills,
}: DivinitySkillLoadoutSectionProps) {
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);
  const [pickerNotice, setPickerNotice] = useState<PickerNotice>(null);
  const skillsById = useMemo(
    () => new Map(skills.map((skill) => [skill.id, skill])),
    [skills],
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
  const selectedAvailableSkillIds = useMemo(
    () => [...new Set((availableSkillIds ?? []).filter(Boolean))],
    [availableSkillIds],
  );
  const filteredSkills = useMemo(() => {
    if (availableSkillIds === undefined) {
      return sortedSkills;
    }

    return selectedAvailableSkillIds
      .map((skillId) => skillsById.get(skillId))
      .filter((skill): skill is DivinityMajorSkill => Boolean(skill));
  }, [availableSkillIds, selectedAvailableSkillIds, skillsById, sortedSkills]);
  const hasNoAvailableSkills =
    !readOnly && availableSkillIds !== undefined && filteredSkills.length === 0;
  const emptyPickerMessage = "Выберите хотя бы один талант в дереве ниже.";
  const exhaustedPickerMessage = "Выберите еще таланты в дереве ниже.";
  const getBudgetMessage = (maxNodes: number) =>
    `Навык не помещается в лимит ${maxNodes} узлов.`;

  const getMaxNodesForRow = (rowId: LoadoutRowId) =>
    rowId === "base"
      ? DIVINITY_SKILL_BASE_NODE_BUDGET
      : DIVINITY_SKILL_AWAKENED_NODE_BUDGET;

  const getSkillIdsForRow = (rowId: LoadoutRowId) =>
    rowId === "base" ? baseSkillIds : awakenedSkillIds;

  const getAvailableSkillsForRow = (
    selectedSkillIds: readonly (string | null)[],
  ) => {
    const selectedInRow = new Set(
      selectedSkillIds.filter((skillId): skillId is string => Boolean(skillId)),
    );

    return filteredSkills.filter((skill) => !selectedInRow.has(skill.id));
  };

  const openSkillSlot = (slot: ActiveSlot) => {
    if (!slot) {
      setActiveSlot(null);
      setPickerNotice(null);
      return;
    }

    if (hasNoAvailableSkills) {
      setActiveSlot(null);
      setPickerNotice({ rowId: slot.rowId, message: emptyPickerMessage });
      return;
    }

    const rowSkillIds =
      slot.rowId === "base" ? baseSkillIds : awakenedSkillIds;

    if (getAvailableSkillsForRow(rowSkillIds).length === 0) {
      setActiveSlot(null);
      setPickerNotice({ rowId: slot.rowId, message: exhaustedPickerMessage });
      return;
    }

    setPickerNotice(null);
    setActiveSlot(slot);
  };

  const selectSkill = (
    rowId: LoadoutRowId,
    index: number,
    skillId: string | null,
  ) => {
    if (skillId) {
      const nextSkillIds = [...getSkillIdsForRow(rowId)];
      const maxNodes = getMaxNodesForRow(rowId);

      nextSkillIds[index] = skillId;

      const nextCost = getDivinitySkillLoadoutCost(
        nextSkillIds.filter((id): id is string => Boolean(id)),
        skillsById,
      );

      if (nextCost > maxNodes) {
        setPickerNotice({ rowId, message: getBudgetMessage(maxNodes) });
        setActiveSlot(null);
        return;
      }
    }

    onSelectSkill?.(rowId, index, skillId);
    setPickerNotice(null);
    setActiveSlot(null);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Навыки божественности</Text>
        <Text style={styles.description}>
          Таланты берутся из выбранных в дереве ниже.
        </Text>
      </View>

      <LoadoutRow
        activeSlot={activeSlot}
        maxNodes={DIVINITY_SKILL_BASE_NODE_BUDGET}
        readOnly={readOnly}
        rowId="base"
        rowLabel="6 узлов"
        selectedSkillIds={baseSkillIds}
        onClearSkill={(index) => selectSkill("base", index, null)}
        setActiveSlot={openSkillSlot}
        skillsById={skillsById}
      />
      {!readOnly ? (
        pickerNotice?.rowId === "base" ? (
          <Text style={styles.pickerError}>{pickerNotice.message}</Text>
        ) : activeSlot?.rowId === "base" ? (
          <SkillPicker
            onSelect={(skillId) => selectSkill("base", activeSlot.index, skillId)}
            skills={getAvailableSkillsForRow(baseSkillIds)}
          />
        ) : (
          null
        )
      ) : null}

      {awakenedEnabled ? (
        <>
          <LoadoutRow
            activeSlot={activeSlot}
            maxNodes={DIVINITY_SKILL_AWAKENED_NODE_BUDGET}
            readOnly={readOnly}
            rowId="awakened"
            rowLabel="7 узлов"
            selectedSkillIds={awakenedSkillIds}
            onClearSkill={(index) => selectSkill("awakened", index, null)}
            setActiveSlot={openSkillSlot}
            skillsById={skillsById}
          />
          {!readOnly ? (
            pickerNotice?.rowId === "awakened" ? (
              <Text style={styles.pickerError}>{pickerNotice.message}</Text>
            ) : activeSlot?.rowId === "awakened" ? (
              <SkillPicker
                onSelect={(skillId) =>
                  selectSkill("awakened", activeSlot.index, skillId)
                }
                skills={getAvailableSkillsForRow(awakenedSkillIds)}
              />
            ) : (
              null
            )
          ) : null}
        </>
      ) : !readOnly ? (
        <View style={styles.addAwakenedBlock}>
          <Text style={styles.rowLabel}>7 узлов</Text>
          <Pressable
            accessibilityLabel="Добавить навыки для 7 божественных узлов"
            accessibilityRole="button"
            onPress={onShowAwakened}
            style={styles.addAwakenedButton}
          >
            <View style={styles.addAwakenedButtonInner}>
              <View style={styles.addAwakenedIcon}>
                <View style={styles.addAwakenedIconHorizontal} />
                <View style={styles.addAwakenedIconVertical} />
              </View>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type LoadoutRowProps = {
  activeSlot: ActiveSlot;
  maxNodes: number;
  readOnly: boolean;
  rowId: LoadoutRowId;
  rowLabel: string;
  selectedSkillIds: readonly (string | null)[];
  onClearSkill: (index: number) => void;
  setActiveSlot: (slot: ActiveSlot) => void;
  skillsById: ReadonlyMap<string, DivinityMajorSkill>;
};

function LoadoutRow({
  activeSlot,
  maxNodes,
  readOnly,
  rowId,
  rowLabel,
  selectedSkillIds,
  onClearSkill,
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
        <NodeBudgetIndicator
          filledNodes={Math.min(totalCost, maxNodes)}
          label={rowLabel}
          maxNodes={maxNodes}
        />
      </View>
      <View style={styles.slotRow}>
        {Array.from({ length: DIVINITY_SKILL_LOADOUT_MAX_SLOTS }, (_, index) => {
          const skillId = selectedSkillIds[index] ?? null;
          const skill = skillId ? skillsById.get(skillId) ?? null : null;
          const selected =
            activeSlot?.rowId === rowId && activeSlot.index === index;
          const content = (
            <>
              <IconPreview
                label={skill?.name ?? "Divinity skill"}
                source={skill?.icon ?? null}
                size={30}
              />
              {skill ? (
                <View style={styles.slotTextBlock}>
                  <Text style={styles.slotTitle}>{skill.name}</Text>
                  <SkillCostIndicator
                    cost={getDivinitySkillNodeCost(skill)}
                    skillName={skill.name}
                  />
                </View>
              ) : null}
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
            <View
              key={`${rowId}:${index}`}
              style={[styles.slot, selected && styles.slotSelected]}
            >
              <Pressable
                accessibilityLabel={`Выбрать навык божественности ${rowLabel}, слот ${index + 1}`}
                accessibilityRole="button"
                onPress={() =>
                  setActiveSlot(selected ? null : { rowId, index })
                }
                style={styles.slotButtonArea}
              >
                {content}
              </Pressable>
              {skill ? (
                <Pressable
                  accessibilityLabel={`Очистить навык божественности ${rowLabel}, слот ${index + 1}`}
                  accessibilityRole="button"
                  onPress={() => onClearSkill(index)}
                  style={styles.slotClearButton}
                >
                  <Text style={styles.slotClearButtonText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

type NodeBudgetIndicatorProps = {
  filledNodes: number;
  label: string;
  maxNodes: number;
};

function NodeBudgetIndicator({
  filledNodes,
  label,
  maxNodes,
}: NodeBudgetIndicatorProps) {
  return (
    <View style={styles.nodeBudget}>
      {Array.from({ length: maxNodes }, (_, index) => {
        const filled = index < filledNodes;

        return (
          <View
            accessibilityLabel={`${label}: узел ${index + 1} ${
              filled ? "заполнен" : "пустой"
            }`}
            key={`${label}:${index}`}
            style={[styles.nodeDiamond, filled && styles.nodeDiamondFilled]}
          />
        );
      })}
    </View>
  );
}

type SkillPickerProps = {
  onSelect: (skillId: string) => void;
  skills: readonly DivinityMajorSkill[];
};

function SkillPicker({
  onSelect,
  skills,
}: SkillPickerProps) {
  return (
    <View style={styles.picker}>
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
            <SkillCostIndicator
              cost={getDivinitySkillNodeCost(skill)}
              skillName={skill.name}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

type SkillCostIndicatorProps = {
  cost: number;
  skillName: string;
};

function SkillCostIndicator({ cost, skillName }: SkillCostIndicatorProps) {
  return (
    <View style={styles.skillCost}>
      {Array.from({ length: cost }, (_, index) => (
        <View
          accessibilityLabel={`${skillName}: узел стоимости ${index + 1}`}
          key={`${skillName}:cost:${index}`}
          style={[styles.costDiamond, styles.nodeDiamondFilled]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: builderTheme.spacing.sectionContentGap,
  },
  header: {
    gap: builderTheme.spacing.titleDescriptionGap,
  },
  title: {
    ...builderTheme.text.sectionTitle,
  },
  description: {
    ...builderTheme.text.sectionDescription,
  },
  rowBlock: {
    gap: 8,
  },
  rowHeader: {
    alignItems: "flex-start",
    gap: 6,
  },
  rowLabel: {
    ...builderTheme.text.fieldLabel,
  },
  nodeBudget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  nodeDiamond: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#5d4937",
    backgroundColor: "#3a3029",
    transform: [{ rotate: "45deg" }],
  },
  nodeDiamondFilled: {
    borderColor: builderTheme.colors.accent,
    backgroundColor: builderTheme.colors.accent,
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
  },
  slot: {
    minHeight: 94,
    flex: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#241610",
    overflow: "hidden",
  },
  slotButtonArea: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  slotSelected: {
    borderColor: builderTheme.colors.accent,
    backgroundColor: "#3a2810",
  },
  slotClearButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  slotClearButtonText: {
    color: "#f3d9b3",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  slotTextBlock: {
    minHeight: 34,
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  slotTitle: {
    color: "#fff4d7",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  addAwakenedBlock: {
    gap: 8,
  },
  addAwakenedButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6d4f2d",
    backgroundColor: "#1a100c",
    alignSelf: "flex-start",
  },
  addAwakenedButtonInner: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addAwakenedIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addAwakenedIconHorizontal: {
    position: "absolute",
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: builderTheme.colors.accent,
  },
  addAwakenedIconVertical: {
    position: "absolute",
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: builderTheme.colors.accent,
  },
  picker: {
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
    width: "100%",
    minHeight: 58,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 6,
    backgroundColor: "#281a12",
    padding: 6,
  },
  pickerTextBlock: {
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  pickerTitle: {
    color: "#f7dfac",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  skillCost: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
  },
  costDiamond: {
    width: 9,
    height: 9,
    borderWidth: 1,
    transform: [{ rotate: "45deg" }],
  },
});
