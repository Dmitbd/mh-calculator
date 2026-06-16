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

import artifactsData from "@/features/game-data/equipment/artifacts.json";
import runesData from "@/features/game-data/equipment/runes.json";
import branchesData from "@/features/game-data/divinity/divinity-branches.json";
import skillsData from "@/features/game-data/divinity/divinity-skills.json";
import templateData from "@/features/game-data/divinity/tree-template.json";
import weaponAwakeningColorsData from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningSlotsData from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";
import { BuildFolderTabs } from "@/shared/ui/BuildFolderTabs";
import { buildTargetTabs } from "@/features/admin/data/buildTargetTabs";
import { getTabByPath, sortBuildTabs } from "@/features/heroes/utils/heroBuildTabs";

import { BranchBuilderGrid } from "../components/BranchBuilderGrid";
import { DownloadJsonButton } from "../components/DownloadJsonButton";
import { EquipmentSelect } from "../components/EquipmentSelect";
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

  const selectedTopTabId = builder.targetTabPath[0] ?? "";
  const selectedChildTabId = builder.targetTabPath[1];
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
          onSelectChildTab={builder.setTargetChildTab}
          onSelectTab={builder.setTargetTopTab}
          selectedChildTabId={selectedChildTabId}
          selectedTabId={selectedTopTabId}
          tabs={buildTargetTopTabs}
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
          label="руны"
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
      </View>

      <View onLayout={handleDownloadSectionLayout} style={styles.section}>
        <DownloadJsonButton
          errors={validationErrors}
          onErrorsLayout={handleErrorsLayout}
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

            if (result.errors.length > 0) {
              pendingScrollToErrors.current = true;

              if (validationErrors.length > 0) {
                requestAnimationFrame(() => {
                  scrollToErrors();
                });
              }
            }

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
