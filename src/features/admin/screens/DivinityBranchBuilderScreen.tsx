import { useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { BranchBuilderGrid } from "@/features/builds/components/BranchBuilderGrid";
import { WeaponAwakeningPicker } from "@/features/builds/components/WeaponAwakeningPicker";

import artifactsData from "@/features/game-data/equipment/artifacts.json";
import runesData from "@/features/game-data/equipment/runes.json";
import branchesData from "@/features/game-data/divinity/divinity-branches.json";
import skillsData from "@/features/game-data/divinity/divinity-skills.json";
import templateData from "@/features/game-data/divinity/tree-template.json";
import { heroes } from "@/features/game-data/heroes/heroBuilds";
import weaponAwakeningColorsData from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningCombosData from "@/features/game-data/weapon-awakening/weapon-awakening-combos.json";
import weaponAwakeningSlotsData from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";
import type { WeaponAwakeningCombosData } from "@/features/game-data/weapon-awakening/types";
import { resolveWeaponAwakeningBonuses } from "@/features/game-data/weapon-awakening/resolveWeaponAwakeningBonuses";
import { WeaponAwakeningBonusList } from "@/features/heroes/components/WeaponAwakeningBonusList";
import { BuildFolderTabs } from "@/shared/ui/BuildFolderTabs";
import { buildTargetTabs } from "@/features/admin/data/buildTargetTabs";
import { getTabByPath, sortBuildTabs } from "@/features/heroes/utils/heroBuildTabs";

import { DownloadJsonButton } from "../components/DownloadJsonButton";
import { EquipmentVariantBuilder } from "../components/EquipmentVariantBuilder";
import { HeroSelectInput } from "../components/HeroSelectInput";
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
import { validateBranchBuild } from "../utils/validateBranchBuild";

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
const weaponAwakeningCombos = weaponAwakeningCombosData as WeaponAwakeningCombosData;
const weaponAwakeningSlots = weaponAwakeningSlotsData as WeaponAwakeningSlot[];
const artifacts = artifactsData as Artifact[];
const runes = runesData as Rune[];

const weaponAwakeningCatalog = {
  colors: weaponAwakeningColors,
  slots: weaponAwakeningSlots,
};

const SCREEN_PADDING = 20;

function toFolderTabItems(tabs: ReturnType<typeof sortBuildTabs>) {
  return tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    accessibilityLabel: `Select ${tab.label} build tab`,
  }));
}

export function DivinityBranchBuilderScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const downloadSectionY = useRef(0);
  const errorsBlockY = useRef(0);
  const pendingScrollToErrors = useRef(false);
  const {
    addArtifact,
    addRune,
    buildExport,
    buildValidationDraft,
    clearSelectedHero,
    cycleWeaponAwakeningSlot,
    heroQuery,
    progressLevels,
    removeArtifact,
    removeRune,
    rollbackColumnProgress,
    selectHero,
    selectedArtifactIds,
    selectedBranches,
    selectedHero,
    selectedHeroId,
    selectedMajorSkills,
    selectedRuneIds,
    setColumnBranch,
    setColumnProgress,
    setHeroQuery,
    setMajorSkill,
    setTargetChildTab,
    setTargetTopTab,
    targetTabPath,
    toggleColumnProgress,
    weaponAwakeningSelections,
  } = useDivinityBranchBuilder(weaponAwakeningCatalog);
  const [activeMajorSlot, setActiveMajorSlot] = useState<{
    columnId: BranchColumnId;
    level: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    BranchBuildValidationError[]
  >([]);

  const weaponAwakeningBonuses = resolveWeaponAwakeningBonuses({
    hero: selectedHero,
    selections: weaponAwakeningSelections,
    combosData: weaponAwakeningCombos,
  });
  const hasWeaponAwakeningSelections = Object.keys(weaponAwakeningSelections).length > 0;

  const selectedTopTabId = targetTabPath[0] ?? "";
  const selectedChildTabId = targetTabPath[1];
  const selectedTopTab = getTabByPath(buildTargetTabs, [selectedTopTabId]);
  const buildTargetTopTabs = useMemo(
    () => toFolderTabItems(sortBuildTabs(buildTargetTabs)),
    [],
  );
  const buildTargetChildTabs = useMemo(() => {
    if (!selectedTopTab?.children || selectedTopTab.children.length === 0) {
      return undefined;
    }

    return toFolderTabItems(sortBuildTabs(selectedTopTab.children));
  }, [selectedTopTab]);

  const scrollToErrors = () => {
    if (!pendingScrollToErrors.current) {
      return;
    }

    pendingScrollToErrors.current = false;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, downloadSectionY.current + errorsBlockY.current - 12),
      });
    });
  };

  const handleDownloadSectionLayout = (event: LayoutChangeEvent) => {
    downloadSectionY.current = event.nativeEvent.layout.y;
    scrollToErrors();
  };

  const handleErrorsLayout = (event: LayoutChangeEvent) => {
    errorsBlockY.current = event.nativeEvent.layout.y;
    scrollToErrors();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Builder" fallbackHref="/" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + top + 10,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
      <View style={styles.section}>
        <BuildFolderTabs
          childTabs={buildTargetChildTabs}
          onSelectChildTab={setTargetChildTab}
          onSelectTab={setTargetTopTab}
          selectedChildTabId={selectedChildTabId}
          selectedTabId={selectedTopTabId}
          tabs={buildTargetTopTabs}
        />
      </View>

      <View style={styles.section}>
        <HeroSelectInput
          heroQuery={heroQuery}
          heroes={heroes}
          onClearHero={clearSelectedHero}
          onQueryChange={setHeroQuery}
          onSelectHero={selectHero}
          selectedHeroId={selectedHeroId}
        />
      </View>

      <View style={styles.section}>
        <EquipmentVariantBuilder
          addLabel="Добавить оружие"
          label="Оружие"
          onAdd={addArtifact}
          onRemove={removeArtifact}
          options={artifacts}
          selectedIds={selectedArtifactIds}
        />
      </View>

      <View style={styles.section}>
        <EquipmentVariantBuilder
          addLabel="Добавить руну"
          label="Руны"
          onAdd={addRune}
          onRemove={removeRune}
          options={runes}
          selectedIds={selectedRuneIds}
        />
      </View>

      <View style={styles.weaponAwakeningSection}>
        <WeaponAwakeningPicker
          colors={weaponAwakeningColors}
          onCycleSlot={cycleWeaponAwakeningSlot}
          selections={weaponAwakeningSelections}
          slots={weaponAwakeningSlots}
        />
        <WeaponAwakeningBonusList
          bonuses={weaponAwakeningBonuses}
          colors={weaponAwakeningColors}
        />
        {!selectedHero && hasWeaponAwakeningSelections ? (
          <Text style={styles.weaponAwakeningHint}>
            Выберите героя из списка, чтобы увидеть бонусы цветов.
          </Text>
        ) : null}
        {selectedHero && hasWeaponAwakeningSelections && weaponAwakeningBonuses.length === 0 ? (
          <Text style={styles.weaponAwakeningHint}>
            Бонусы появятся, когда минимум 2 ноды будут одного цвета.
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.branchSection}>
          <Text style={styles.sectionLabel}>Ветка</Text>
          <BranchBuilderGrid
            activeMajorSlot={activeMajorSlot}
            branches={branches}
            columns={columns}
            onOpenMajorSlot={(columnId, level) =>
              setActiveMajorSlot({ columnId, level })
            }
            onClearMajorSkill={(columnId, level) => {
              setMajorSkill(columnId, level, null);
              rollbackColumnProgress(columnId, level);
              setActiveMajorSlot(null);
            }}
            onSelectBranch={setColumnBranch}
            onSelectMajorSkill={(columnId, level, skillId) => {
              setMajorSkill(columnId, level, skillId);
              setColumnProgress(columnId, level);
              setActiveMajorSlot(null);
            }}
            onToggleProgress={toggleColumnProgress}
            progressLevels={progressLevels}
            selectedBranches={selectedBranches}
            selectedMajorSkills={selectedMajorSkills}
            skillCatalog={skills}
            skills={skills}
            template={template}
          />
        </View>
      </View>

      <View onLayout={handleDownloadSectionLayout} style={styles.section}>
        <DownloadJsonButton
          errors={validationErrors}
          onErrorsLayout={handleErrorsLayout}
          onPress={() => {
            const result = validateBranchBuild(buildValidationDraft(), {
              heroes,
              branches,
              skills,
              template,
              weaponAwakeningColors,
              weaponAwakeningSlots,
              artifacts,
              runes,
            });

            setValidationErrors(result.errors);

            if (result.errors.length > 0) {
              pendingScrollToErrors.current = true;

              if (validationErrors.length > 0) {
                requestAnimationFrame(() => {
                  scrollToErrors();
                });
              }
            }

            if (result.isValid) {
              const build = buildExport();

              if (build) {
                downloadJson(build, `${build.heroId}.json`);
              }
            }
          }}
        />
      </View>
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
    backgroundColor: "#140d0b",
    paddingHorizontal: SCREEN_PADDING,
  },
  section: {
    width: "100%",
  },
  weaponAwakeningSection: {
    width: "100%",
    gap: 12,
  },
  weaponAwakeningHint: {
    color: "#917968",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
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
});
