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

import { resolveWeaponAwakeningBonuses } from "@/features/game-data/weapon-awakening/resolveWeaponAwakeningBonuses";
import { WeaponAwakeningBonusList } from "@/features/builds/components/WeaponAwakeningBonusList";
import { BuildFolderTabs } from "@/shared/ui/BuildFolderTabs";
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
import { buildTargetTabs } from "@/features/admin/data/buildTargetTabs";
import { getTabByPath, sortBuildTabs } from "@/features/game-data/heroes/heroBuildTabs";

import { DownloadJsonButton } from "../components/DownloadJsonButton";
import { EquipmentVariantBuilder } from "../components/EquipmentVariantBuilder";
import { HeroSelectInput } from "../components/HeroSelectInput";
import { useDivinityBranchBuilder } from "../hooks/useDivinityBranchBuilder";
import type {
  BranchBuildValidationError,
  BranchColumnId,
} from "../types/admin.types";
import { downloadJson } from "../utils/downloadJson";
import { validateBranchBuild } from "../utils/validateBranchBuild";

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
          heroes={branchBuilderHeroes}
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
          options={branchBuilderArtifacts}
          selectedIds={selectedArtifactIds}
        />
      </View>

      <View style={styles.section}>
        <EquipmentVariantBuilder
          addLabel="Добавить руну"
          label="Руны"
          onAdd={addRune}
          onRemove={removeRune}
          options={branchBuilderRunes}
          selectedIds={selectedRuneIds}
        />
      </View>

      <View style={styles.weaponAwakeningSection}>
        <WeaponAwakeningPicker
          colors={branchBuilderWeaponAwakeningColors}
          onCycleSlot={cycleWeaponAwakeningSlot}
          selections={weaponAwakeningSelections}
          slots={branchBuilderWeaponAwakeningSlots}
        />
        <WeaponAwakeningBonusList
          bonuses={weaponAwakeningBonuses}
          colors={branchBuilderWeaponAwakeningColors}
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
            branches={branchBuilderBranches}
            columns={branchBuilderColumns}
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
            skillCatalog={branchBuilderSkills}
            skills={branchBuilderSkills}
            template={branchBuilderTemplate}
          />
        </View>
      </View>

      <View onLayout={handleDownloadSectionLayout} style={styles.section}>
        <DownloadJsonButton
          errors={validationErrors}
          onErrorsLayout={handleErrorsLayout}
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
