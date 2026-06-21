import { useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { resolveWeaponAwakeningBonuses } from "@/features/game-data/weapon-awakening/resolveWeaponAwakeningBonuses";
import {
  branchBuilderArtifacts,
  branchBuilderBranches,
  branchBuilderColumns,
  branchBuilderHeroes,
  branchBuilderRunes,
  branchBuilderSkills,
  branchBuilderTemplate,
  branchBuilderValidationCatalog,
  branchBuilderWeaponAwakeningCatalog,
  branchBuilderWeaponAwakeningColors,
  branchBuilderWeaponAwakeningCombos,
  branchBuilderWeaponAwakeningSlots,
} from "@/features/admin/data/branchBuilderCatalogs";

import { BranchGridSection } from "../components/branch-builder/BranchGridSection";
import { BuildTargetSection } from "../components/branch-builder/BuildTargetSection";
import { DownloadSection } from "../components/branch-builder/DownloadSection";
import { EquipmentBuilderSection } from "../components/branch-builder/EquipmentBuilderSection";
import { HeroBuilderSection } from "../components/branch-builder/HeroBuilderSection";
import { WeaponAwakeningSection } from "../components/branch-builder/WeaponAwakeningSection";
import { useDivinityBranchBuilder } from "../hooks/useDivinityBranchBuilder";
import { getBranchBuilderTargetTabs } from "../model/branchBuilderTabs";
import type {
  BranchBuildValidationError,
  BranchColumnId,
} from "../types/admin.types";
import { downloadJson } from "../utils/downloadJson";
import { validateBranchBuild } from "../utils/validateBranchBuild";

const SCREEN_PADDING = 20;

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
  } = useDivinityBranchBuilder(branchBuilderWeaponAwakeningCatalog);
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
    combosData: branchBuilderWeaponAwakeningCombos,
  });

  const {
    childTabs: buildTargetChildTabs,
    selectedChildTabId,
    selectedTopTabId,
    topTabs: buildTargetTopTabs,
  } = useMemo(() => getBranchBuilderTargetTabs(targetTabPath), [targetTabPath]);

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
        <BuildTargetSection
          childTabs={buildTargetChildTabs}
          onSelectChildTab={setTargetChildTab}
          onSelectTab={setTargetTopTab}
          selectedChildTabId={selectedChildTabId}
          selectedTabId={selectedTopTabId}
          tabs={buildTargetTopTabs}
        />
      </View>

      <View style={styles.section}>
        <HeroBuilderSection
          heroQuery={heroQuery}
          heroes={branchBuilderHeroes}
          onClearHero={clearSelectedHero}
          onQueryChange={setHeroQuery}
          onSelectHero={selectHero}
          selectedHeroId={selectedHeroId}
        />
      </View>

      <View style={styles.section}>
        <EquipmentBuilderSection
          artifacts={branchBuilderArtifacts}
          onAddArtifact={addArtifact}
          onAddRune={addRune}
          onRemoveArtifact={removeArtifact}
          onRemoveRune={removeRune}
          runes={branchBuilderRunes}
          selectedArtifactIds={selectedArtifactIds}
          selectedRuneIds={selectedRuneIds}
        />
      </View>

      <View style={styles.section}>
        <WeaponAwakeningSection
          bonuses={weaponAwakeningBonuses}
          colors={branchBuilderWeaponAwakeningColors}
          onCycleSlot={cycleWeaponAwakeningSlot}
          selectedHero={selectedHero}
          selections={weaponAwakeningSelections}
          slots={branchBuilderWeaponAwakeningSlots}
        />
      </View>

      <View style={styles.section}>
        <BranchGridSection
          activeMajorSlot={activeMajorSlot}
          branches={branchBuilderBranches}
          columns={branchBuilderColumns}
          onClearMajorSkill={(columnId, level) => {
            setMajorSkill(columnId, level, null);
            rollbackColumnProgress(columnId, level);
            setActiveMajorSlot(null);
          }}
          onOpenMajorSlot={(columnId, level) =>
            setActiveMajorSlot({ columnId, level })
          }
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
          skills={branchBuilderSkills}
          template={branchBuilderTemplate}
        />
      </View>

      <View style={styles.section}>
        <DownloadSection
          errors={validationErrors}
          onErrorsLayout={handleErrorsLayout}
          onLayout={handleDownloadSectionLayout}
          onPress={() => {
            const result = validateBranchBuild(
              buildValidationDraft(),
              branchBuilderValidationCatalog,
            );

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
});
