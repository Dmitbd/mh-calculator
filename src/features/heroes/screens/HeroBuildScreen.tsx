import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BranchBuilderGrid } from "@/features/admin/components/BranchBuilderGrid";
import { EquipmentSelect } from "@/features/admin/components/EquipmentSelect";
import { GameModeRadio } from "@/features/admin/components/GameModeRadio";
import { WeaponAwakeningPicker } from "@/features/admin/components/WeaponAwakeningPicker";
import type {
  Artifact,
  BranchColumn,
  DivinityBranch,
  DivinityGameMode,
  DivinityMajorSkill,
  Rune,
  TreeTemplateNode,
  WeaponAwakeningColor,
  WeaponAwakeningSlot,
} from "@/features/admin/types/admin.types";
import artifactsData from "@/features/game-data/equipment/artifacts.json";
import runesData from "@/features/game-data/equipment/runes.json";
import branchesData from "@/features/game-data/divinity/divinity-branches.json";
import skillsData from "@/features/game-data/divinity/divinity-skills.json";
import templateData from "@/features/game-data/divinity/tree-template.json";
import weaponAwakeningColorsData from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningSlotsData from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";
import {
  getHeroById,
  getHeroBuildSet,
} from "@/features/game-data/heroes/heroBuilds";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

import { mapBuildToView } from "../utils/mapBuildToView";
import { HeroMetadataRow } from "../components/HeroMetadataRow";

const columns: BranchColumn[] = [
  { id: "left", label: "левая", isMain: false },
  { id: "center", label: "центр", isMain: true },
  { id: "right", label: "правая", isMain: false },
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

const SCREEN_PADDING = 20;

type HeroBuildScreenProps = {
  /** Id героя из роута */
  heroId: string;
};

/** Read-only экран билда героя: вёрстка branch-builder без редактирования */
export function HeroBuildScreen({ heroId }: HeroBuildScreenProps) {
  const { top, bottom } = useSafeAreaInsets();

  const hero = getHeroById(heroId);
  const buildSet = getHeroBuildSet(heroId);
  const availableModes = useMemo(() => {
    if (!buildSet) {
      return [] as DivinityGameMode[];
    }

    const modes: DivinityGameMode[] = [];

    if (buildSet.pvp) {
      modes.push("pvp");
    }

    if (buildSet.pve) {
      modes.push("pve");
    }

    return modes;
  }, [buildSet]);
  const [gameMode, setGameMode] = useState<DivinityGameMode>(
    availableModes[0] ?? "pvp",
  );
  const effectiveGameMode = availableModes.includes(gameMode)
    ? gameMode
    : (availableModes[0] ?? "pvp");
  const build = buildSet ? buildSet[effectiveGameMode] : null;

  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(gameMode)) {
      setGameMode(availableModes[0]);
    }
  }, [availableModes, gameMode]);

  const view = useMemo(() => (build ? mapBuildToView(build) : null), [build]);

  const contentPadding = {
    paddingTop: SCREEN_HEADER_HEIGHT + top + 10,
    paddingBottom: SCREEN_PADDING + bottom,
  };

  if (!hero) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Герой" fallbackHref="/heroes" />
        <View style={[styles.placeholderWrapper, contentPadding]}>
          <Text style={styles.placeholderText}>Герой не найден.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={hero.name.ru} fallbackHref="/heroes" />
      <ScrollView
        contentContainerStyle={[styles.container, contentPadding]}
      >
        <View style={styles.section}>
          <HeroMetadataRow hero={hero} />
        </View>

        {availableModes.length > 0 ? (
          <View style={styles.section}>
            <GameModeRadio
              modes={availableModes}
              onChange={setGameMode}
              value={effectiveGameMode}
            />
          </View>
        ) : null}

        {view ? (
          <>
            <View style={styles.section}>
              <EquipmentSelect
                label="Оружие"
                options={artifacts}
                placeholder="Оружие не выбрано"
                readOnly
                selectedId={view.artifactId}
              />
            </View>

            <View style={styles.section}>
              <EquipmentSelect
                label="руны"
                options={runes}
                placeholder="Руна не выбрана"
                readOnly
                selectedId={view.runeId}
              />
            </View>

            <View style={styles.section}>
              <WeaponAwakeningPicker
                colors={weaponAwakeningColors}
                readOnly
                selections={view.weaponAwakeningSelections}
                slots={weaponAwakeningSlots}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.branchSection}>
                <Text style={styles.sectionLabel}>Ветка</Text>
                <BranchBuilderGrid
                  branches={branches}
                  columns={columns}
                  progressLevels={view.progressLevels}
                  readOnly
                  selectedBranches={view.selectedBranches}
                  selectedMajorSkills={view.selectedMajorSkills}
                  skillCatalog={skills}
                  skills={skills}
                  template={template}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              Билд для этого режима ещё не готов.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#140d0b",
  },
  container: {
    flexGrow: 1,
    gap: 32,
    paddingHorizontal: SCREEN_PADDING,
  },
  section: {
    width: "100%",
  },
  branchSection: {
    gap: 8,
  },
  sectionLabel: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  placeholderWrapper: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a2a1d",
    backgroundColor: "#1d130f",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  placeholderText: {
    color: "#d7c19a",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});
