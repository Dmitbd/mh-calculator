import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import artifactsData from "@/features/game-data/equipment/artifacts.json";
import runesData from "@/features/game-data/equipment/runes.json";
import branchesData from "@/features/game-data/divinity/divinity-branches.json";
import skillsData from "@/features/game-data/divinity/divinity-skills.json";
import templateData from "@/features/game-data/divinity/tree-template.json";
import weaponAwakeningColorsData from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningSlotsData from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";

import { BranchBuilderGrid } from "../components/BranchBuilderGrid";
import { DownloadJsonButton } from "../components/DownloadJsonButton";
import { EquipmentSelect } from "../components/EquipmentSelect";
import { GameModeRadio } from "../components/GameModeRadio";
import { HeroNameInput } from "../components/HeroNameInput";
import { WeaponAwakeningPicker } from "../components/WeaponAwakeningPicker";
import { useDivinityBranchBuilder } from "../hooks/useDivinityBranchBuilder";
import type {
  Artifact,
  BranchBuildValidationError,
  BranchColumn,
  BranchColumnId,
  DivinityBranch,
  DivinityMajorSkill,
  Rune,
  TreeTemplateNode,
  WeaponAwakeningColor,
  WeaponAwakeningSlot,
} from "../types/admin.types";
import { downloadJson } from "../utils/downloadJson";
import { slugifyFileName } from "../utils/slugifyFileName";
import { validateBranchBuild } from "../utils/validateBranchBuild";

const columns: BranchColumn[] = [
  { id: "left", label: "Left branch", isMain: false },
  { id: "center", label: "Center main branch", isMain: true },
  { id: "right", label: "Right branch", isMain: false },
];

const branches = [...(branchesData as DivinityBranch[])].sort(
  (first, second) => first.order - second.order,
);
const skills = skillsData as DivinityMajorSkill[];
const template = templateData as TreeTemplateNode[];
const weaponAwakeningColors = weaponAwakeningColorsData as WeaponAwakeningColor[];
const weaponAwakeningSlots = weaponAwakeningSlotsData as WeaponAwakeningSlot[];
const artifacts = artifactsData as Artifact[];
const runes = runesData as Rune[];

const weaponAwakeningCatalog = {
  colors: weaponAwakeningColors,
  slots: weaponAwakeningSlots,
};

export function DivinityBranchBuilderScreen() {
  const builder = useDivinityBranchBuilder(weaponAwakeningCatalog);
  const [activeMajorSlot, setActiveMajorSlot] = useState<{
    columnId: BranchColumnId;
    level: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    BranchBuildValidationError[]
  >([]);

  const selectedMajorSkills = useMemo(
    () => builder.selectedMajorSkills,
    [builder.selectedMajorSkills],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Divinity Branch Builder</Text>
      </View>

      <View style={styles.section}>
        <GameModeRadio
          value={builder.gameMode}
          onChange={builder.setGameMode}
        />
      </View>

      <View style={styles.section}>
        <HeroNameInput value={builder.heroName} onChange={builder.setHeroName} />
      </View>

      <View style={styles.section}>
        <EquipmentSelect
          label="Оружие"
          onClear={() => builder.setArtifact(null)}
          onSelect={builder.setArtifact}
          options={artifacts}
          placeholder="Выберите оружие"
          selectedId={builder.selectedArtifactId}
        />
      </View>

      <View style={styles.section}>
        <EquipmentSelect
          label="Руна"
          onClear={() => builder.setRune(null)}
          onSelect={builder.setRune}
          options={runes}
          placeholder="Выберите руну"
          selectedId={builder.selectedRuneId}
        />
      </View>

      <View style={styles.section}>
        <WeaponAwakeningPicker
          colors={weaponAwakeningColors}
          onCycleSlot={builder.cycleWeaponAwakeningSlot}
          selections={builder.weaponAwakeningSelections}
          slots={weaponAwakeningSlots}
        />
      </View>

      <View style={styles.section}>
        <BranchBuilderGrid
          activeMajorSlot={activeMajorSlot}
          branches={branches}
          columns={columns}
          onOpenMajorSlot={(columnId, level) =>
            setActiveMajorSlot({ columnId, level })
          }
          onClearMajorSkill={(columnId, level) => {
            builder.setMajorSkill(columnId, level, null);
            builder.rollbackColumnProgress(columnId, level);
            setActiveMajorSlot(null);
          }}
          onSelectBranch={builder.setColumnBranch}
          onSelectMajorSkill={(columnId, level, skillId) => {
            builder.setMajorSkill(columnId, level, skillId);
            builder.setColumnProgress(columnId, level);
            setActiveMajorSlot(null);
          }}
          onToggleProgress={builder.toggleColumnProgress}
          progressLevels={builder.progressLevels}
          selectedBranches={builder.selectedBranches}
          selectedMajorSkills={selectedMajorSkills}
          skillCatalog={skills}
          skills={skills}
          template={template}
        />
      </View>

      <View style={styles.section}>
        <DownloadJsonButton
          errors={validationErrors}
          onPress={() => {
            const result = validateBranchBuild(builder.buildValidationDraft(), {
              branches,
              skills,
              template,
              weaponAwakeningColors,
              weaponAwakeningSlots,
              artifacts,
              runes,
            });

            setValidationErrors(result.errors);

            if (result.isValid) {
              const build = builder.buildExport();

              if (build) {
                downloadJson(build, slugifyFileName(build.heroName));
              }
            }
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 18,
    backgroundColor: "#140d0b",
    padding: 20,
  },
  header: {
    paddingTop: 10,
  },
  title: {
    color: "#f3d38a",
    fontSize: 28,
    fontWeight: "900",
  },
  section: {
    width: "100%",
  },
});
