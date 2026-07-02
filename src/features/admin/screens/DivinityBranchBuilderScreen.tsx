import { useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSupabaseClient } from "@/shared/lib/supabaseClient";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import {
  deleteHeroBuildSet,
  DivinitySkillLoadoutSection,
  loadPublishedHeroBuildSet,
  saveHeroBuildSet,
  type HeroBuildSetStatus,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import { getHeroBuildSet } from "@/features/game-data/heroes";
import { resolveWeaponAwakeningBonuses } from "@/features/game-data/weapon-awakening";
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

import { AdminAuthPanel } from "../components/AdminAuthPanel";
import { BranchGridSection } from "../components/branch-builder/BranchGridSection";
import { BuildTargetSection } from "../components/branch-builder/BuildTargetSection";
import { DownloadSection } from "../components/branch-builder/DownloadSection";
import { EquipmentBuilderSection } from "../components/branch-builder/EquipmentBuilderSection";
import { HeroBuilderSection } from "../components/branch-builder/HeroBuilderSection";
import { WeaponAwakeningSection } from "../components/branch-builder/WeaponAwakeningSection";
import { ValidationErrorMessages } from "../components/ValidationErrorMessages";
import { useDivinityBranchBuilder } from "../hooks/useDivinityBranchBuilder";
import { getBranchBuilderTargetTabs } from "../model/branchBuilderTabs";
import type {
  BranchBuildValidationError,
  BranchColumnId,
} from "../types/admin.types";
import { downloadJson } from "../utils/downloadJson";
import {
  MIN_BRANCH_PROGRESS_LEVEL,
  validateBranchBuild,
} from "../utils/validateBranchBuild";
import {
  getCurrentAdminSession,
  signInAdmin,
  signOutAdmin,
  type AdminSession,
} from "../api/adminAuthRepository";

const SCREEN_PADDING = 20;
type PendingScrollTarget = "errors" | "top";

type DivinityBranchBuilderScreenProps = {
  initialAdminSession?: AdminSession | null;
};

export function DivinityBranchBuilderScreen({
  initialAdminSession,
}: DivinityBranchBuilderScreenProps = {}) {
  const { top, bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const downloadSectionY = useRef(0);
  const errorsBlockY = useRef(0);
  const pendingScrollTarget = useRef<PendingScrollTarget | null>(null);
  const {
    addArtifact,
    addRune,
    buildValidationDraft,
    buildFullExport,
    clearSelectedHero,
    cycleWeaponAwakeningSlot,
    heroQuery,
    loadBuildSetForEditing,
    progressLevels,
    removeArtifact,
    removeRune,
    rollbackColumnProgress,
    saveCurrentTargetBuild,
    selectHero,
    selectedArtifactIds,
    selectedBranches,
    selectedDivinitySkills,
    selectedHero,
    selectedHeroId,
    selectedMajorSkills,
    selectedRuneIds,
    setColumnBranch,
    setColumnProgress,
    setHeroQuery,
    setDivinitySkill,
    setMajorSkill,
    setTargetChildTab,
    setTargetTopTab,
    showAwakenedDivinitySkills,
    targetTabPath,
    toggleColumnProgress,
    validateFullExport,
    weaponAwakeningSelections,
  } = useDivinityBranchBuilder(branchBuilderWeaponAwakeningCatalog);
  const [activeMajorSlot, setActiveMajorSlot] = useState<{
    columnId: BranchColumnId;
    level: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    BranchBuildValidationError[]
  >([]);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(
    initialAdminSession ?? null,
  );
  const [isAuthChecked, setIsAuthChecked] = useState(
    initialAdminSession !== undefined,
  );

  useEffect(() => {
    if (initialAdminSession !== undefined) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setIsAuthChecked(true);
      return;
    }

    let isMounted = true;

    void getCurrentAdminSession(client)
      .then((session) => {
        if (isMounted) {
          setAdminSession(session);
          setIsAuthChecked(true);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setIsAuthChecked(true);
          setBackendStatus(
            error instanceof Error
              ? `Ошибка Supabase: ${error.message}`
              : "Ошибка Supabase.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialAdminSession]);

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
  const targetTabErrors = getErrorMessages(validationErrors, (path, error) =>
    error.code.startsWith("multiBuild.") || isTargetTabErrorPath(path),
  );
  const heroErrors = getErrorMessages(validationErrors, (path) =>
    path === "heroId" || path === "heroName",
  );
  const artifactErrors = getErrorMessages(validationErrors, (path) =>
    path.startsWith("equipment.artifactIds"),
  );
  const runeErrors = getErrorMessages(validationErrors, (path) =>
    path.startsWith("equipment.runeIds"),
  );
  const weaponAwakeningErrors = getErrorMessages(validationErrors, (path) =>
    path.startsWith("weaponAwakening."),
  );
  const divinitySkillErrors = getErrorMessages(validationErrors, (path) =>
    path.startsWith("divinitySkills."),
  );
  const branchGridErrors = getErrorMessages(validationErrors, (path) =>
    path.startsWith("columns.") ||
    path.startsWith("progress.") ||
    path.startsWith("majorNodes."),
  );

  const scrollToPendingTarget = () => {
    const target = pendingScrollTarget.current;

    if (!target) {
      return;
    }

    pendingScrollTarget.current = null;
    scrollRef.current?.scrollTo({
      animated: true,
      y:
        target === "top"
          ? 0
          : Math.max(0, downloadSectionY.current + errorsBlockY.current - 12),
    });
  };

  const handleDownloadSectionLayout = (event: LayoutChangeEvent) => {
    downloadSectionY.current = event.nativeEvent.layout.y;
    scrollToPendingTarget();
  };

  const handleErrorsLayout = (event: LayoutChangeEvent) => {
    errorsBlockY.current = event.nativeEvent.layout.y;
    scrollToPendingTarget();
  };

  const showValidationErrors = (
    errors: readonly BranchBuildValidationError[],
  ) => {
    setValidationErrors([...errors]);

    if (errors.length > 0) {
      const target = hasTargetTabErrors(errors) ? "top" : "errors";
      pendingScrollTarget.current = target;

      if (target === "top" || validationErrors.length > 0) {
        requestAnimationFrame(() => {
          scrollToPendingTarget();
        });
      }
    }
  };

  const clearValidationErrors = (
    matches: (path: string, error: BranchBuildValidationError) => boolean,
  ) => {
    setValidationErrors((current) =>
      current.filter((error) => !error.path || !matches(error.path, error)),
    );
  };

  const clearTargetTabErrors = () => {
    clearValidationErrors((path, error) =>
      error.code.startsWith("multiBuild.") || isTargetTabErrorPath(path),
    );
  };

  const handleSaveCurrentTargetBuild = () => {
    const result = validateBranchBuild(
      buildValidationDraft(),
      branchBuilderValidationCatalog,
    );

    showValidationErrors(result.errors);

    if (result.isValid) {
      saveCurrentTargetBuild();
    }
  };

  const handleDownloadFullJson = () => {
    const result = validateFullExport();

    showValidationErrors(result.errors);

    if (!result.isValid) {
      return;
    }

    const buildSet = buildFullExport();

    if (buildSet) {
      const firstBuildTab = buildSet.tabs[0];
      const heroId = firstBuildTab
        ? firstBuildTab.build?.heroId
        : selectedHeroId ?? "hero-builds";

      downloadJson(buildSet, `${heroId ?? "hero-builds"}-build-set.json`);
    }
  };

  const saveFullBuildSetToBackend = async (status: HeroBuildSetStatus) => {
    const result = validateFullExport();

    showValidationErrors(result.errors);

    if (!result.isValid) {
      setBackendStatus("Сначала исправьте ошибки полного экспорта.");
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setBackendStatus("Supabase не настроен.");
      return;
    }

    const buildSet = buildFullExport();

    if (!buildSet) {
      setBackendStatus("Не удалось собрать полный билд.");
      return;
    }

    const firstBuildTab = buildSet.tabs[0];
    const heroId = firstBuildTab?.build?.heroId ?? selectedHeroId;

    if (!heroId) {
      setBackendStatus("Не удалось определить героя для сохранения.");
      return;
    }

    try {
      await saveHeroBuildSet(client as unknown as HeroBuildSetSupabaseClient, {
        buildSet,
        heroId,
        status,
      });
      setBackendStatus(
        status === "published" ? "Билд опубликован." : "Черновик сохранён.",
      );
    } catch (error) {
      setBackendStatus(
        error instanceof Error
          ? `Ошибка Supabase: ${error.message}`
          : "Ошибка Supabase.",
      );
    }
  };

  const handleLoadFullBuildSet = async () => {
    if (!selectedHeroId) {
      setBackendStatus("Сначала выберите героя.");
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      const fallbackBuildSet = getHeroBuildSet(selectedHeroId);

      if (fallbackBuildSet && loadBuildSetForEditing(fallbackBuildSet)) {
        setBackendStatus("Локальный билд загружен для редактирования.");
        return;
      }

      setBackendStatus("Supabase не настроен.");
      return;
    }

    try {
      const buildSet = await loadPublishedHeroBuildSet({
        client: client as unknown as HeroBuildSetSupabaseClient,
        fallbackBuildSet: getHeroBuildSet(selectedHeroId),
        heroId: selectedHeroId,
      });

      if (!buildSet || !loadBuildSetForEditing(buildSet)) {
        setBackendStatus("Билд для выбранного героя не найден.");
        return;
      }

      setBackendStatus("Билд загружен для редактирования.");
    } catch (error) {
      setBackendStatus(
        error instanceof Error
          ? `Ошибка Supabase: ${error.message}`
          : "Ошибка Supabase.",
      );
    }
  };

  const handleDeleteFullBuildSet = async () => {
    if (!selectedHeroId) {
      setBackendStatus("Сначала выберите героя.");
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setBackendStatus("Supabase не настроен.");
      return;
    }

    try {
      await deleteHeroBuildSet(
        client as unknown as HeroBuildSetSupabaseClient,
        selectedHeroId,
      );
      setBackendStatus("Билд удалён.");
    } catch (error) {
      setBackendStatus(
        error instanceof Error
          ? `Ошибка Supabase: ${error.message}`
          : "Ошибка Supabase.",
      );
    }
  };

  const handleAdminSignIn = async (credentials: {
    email: string;
    password: string;
  }) => {
    const client = getSupabaseClient();

    if (!client) {
      setBackendStatus("Supabase не настроен.");
      return;
    }

    try {
      const session = await signInAdmin(client, credentials);
      setAdminSession(session);
      setBackendStatus("Админ вошёл.");
    } catch (error) {
      setBackendStatus(
        error instanceof Error
          ? `Ошибка входа: ${error.message}`
          : "Ошибка входа.",
      );
    }
  };

  const handleAdminSignOut = async () => {
    const client = getSupabaseClient();

    if (!client) {
      setAdminSession(null);
      return;
    }

    try {
      await signOutAdmin(client);
      setAdminSession(null);
      setBackendStatus("Админ вышел.");
    } catch (error) {
      setBackendStatus(
        error instanceof Error
          ? `Ошибка выхода: ${error.message}`
          : "Ошибка выхода.",
      );
    }
  };

  const handleSelectTopTab = (tabId: string) => {
    clearTargetTabErrors();
    setTargetTopTab(tabId);
  };

  const handleSelectChildTab = (tabId: string) => {
    clearTargetTabErrors();
    setTargetChildTab(tabId);
  };

  const handleSelectHero = (heroId: string) => {
    selectHero(heroId);
    clearValidationErrors(isHeroErrorPath);
  };

  const handleAddArtifact = (id: string) => {
    addArtifact(id);
    clearValidationErrors(isArtifactErrorPath);
  };

  const handleRemoveArtifact = (id: string) => {
    removeArtifact(id);
    clearValidationErrors(isArtifactErrorPath);
  };

  const handleAddRune = (id: string) => {
    addRune(id);
    clearValidationErrors(isRuneErrorPath);
  };

  const handleRemoveRune = (id: string) => {
    removeRune(id);
    clearValidationErrors(isRuneErrorPath);
  };

  const handleCycleWeaponAwakeningSlot = (slot: number) => {
    cycleWeaponAwakeningSlot(slot);
    clearValidationErrors((path) => path === `weaponAwakening.${slot}`);
  };

  const handleSetDivinitySkill = (
    rowId: "base" | "awakened",
    slotIndex: number,
    skillId: string | null,
  ) => {
    setDivinitySkill(rowId, slotIndex, skillId);
    clearValidationErrors((path) =>
      path === `divinitySkills.${rowId}` ||
      path.startsWith(`divinitySkills.${rowId}.`),
    );
  };

  const handleSetColumnBranch = (
    columnId: BranchColumnId,
    branchId: Parameters<typeof setColumnBranch>[1],
  ) => {
    setColumnBranch(columnId, branchId);
    clearValidationErrors((path) => path === `columns.${columnId}`);
  };

  const handleSetMajorSkill = (
    columnId: BranchColumnId,
    level: number,
    skillId: string,
  ) => {
    setMajorSkill(columnId, level, skillId);
    setColumnProgress(columnId, level);
    clearValidationErrors((path) =>
      path === getMajorNodePath(columnId, level) ||
      (level >= MIN_BRANCH_PROGRESS_LEVEL && path === `progress.${columnId}`),
    );
    setActiveMajorSlot(null);
  };

  const handleToggleProgress = (columnId: BranchColumnId, level: number) => {
    toggleColumnProgress(columnId, level);

    if (level >= MIN_BRANCH_PROGRESS_LEVEL) {
      clearValidationErrors((path) => path === `progress.${columnId}`);
    }
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
        <AdminAuthPanel
          adminEmail={adminSession?.email}
          onSignIn={(credentials) => {
            void handleAdminSignIn(credentials);
          }}
          onSignOut={() => {
            void handleAdminSignOut();
          }}
        />
      </View>

      {backendStatus ? (
        <View style={styles.section}>
          <Text style={styles.backendStatus}>{backendStatus}</Text>
        </View>
      ) : null}

      {isAuthChecked && adminSession ? (
        <>
      <View style={styles.section}>
        <BuildTargetSection
          childTabs={buildTargetChildTabs}
          errors={targetTabErrors}
          onSelectChildTab={handleSelectChildTab}
          onSelectTab={handleSelectTopTab}
          selectedChildTabId={selectedChildTabId}
          selectedTabId={selectedTopTabId}
          tabs={buildTargetTopTabs}
        />
      </View>

      <View style={styles.section}>
        <HeroBuilderSection
          errors={heroErrors}
          heroQuery={heroQuery}
          heroes={branchBuilderHeroes}
          onClearHero={clearSelectedHero}
          onQueryChange={setHeroQuery}
          onSelectHero={handleSelectHero}
          selectedHeroId={selectedHeroId}
        />
      </View>

      <View style={styles.section}>
        <EquipmentBuilderSection
          artifactErrors={artifactErrors}
          artifacts={branchBuilderArtifacts}
          onAddArtifact={handleAddArtifact}
          onAddRune={handleAddRune}
          onRemoveArtifact={handleRemoveArtifact}
          onRemoveRune={handleRemoveRune}
          runeErrors={runeErrors}
          runes={branchBuilderRunes}
          selectedArtifactIds={selectedArtifactIds}
          selectedRuneIds={selectedRuneIds}
        />
      </View>

      <View style={styles.section}>
        <WeaponAwakeningSection
          bonuses={weaponAwakeningBonuses}
          colors={branchBuilderWeaponAwakeningColors}
          errors={weaponAwakeningErrors}
          onCycleSlot={handleCycleWeaponAwakeningSlot}
          selectedHero={selectedHero}
          selections={weaponAwakeningSelections}
          slots={branchBuilderWeaponAwakeningSlots}
        />
      </View>

      <View style={styles.section}>
        <DivinitySkillLoadoutSection
          awakenedEnabled={selectedDivinitySkills.awakenedEnabled}
          awakenedSkillIds={selectedDivinitySkills.awakened}
          baseSkillIds={selectedDivinitySkills.base}
          branches={branchBuilderBranches}
          onSelectSkill={handleSetDivinitySkill}
          onShowAwakened={showAwakenedDivinitySkills}
          skills={branchBuilderSkills}
        />
        <ValidationErrorMessages messages={divinitySkillErrors} />
      </View>

      <View style={styles.section}>
        <BranchGridSection
          activeMajorSlot={activeMajorSlot}
          branches={branchBuilderBranches}
          columns={branchBuilderColumns}
          errors={branchGridErrors}
          onClearMajorSkill={(columnId, level) => {
            setMajorSkill(columnId, level, null);
            rollbackColumnProgress(columnId, level);
            setActiveMajorSlot(null);
          }}
          onOpenMajorSlot={(columnId, level) =>
            setActiveMajorSlot({ columnId, level })
          }
          onSelectMajorSkill={(columnId, level, skillId) => {
            handleSetMajorSkill(columnId, level, skillId);
          }}
          onSelectBranch={handleSetColumnBranch}
          onToggleProgress={handleToggleProgress}
          progressLevels={progressLevels}
          selectedBranches={selectedBranches}
          selectedMajorSkills={selectedMajorSkills}
          skills={branchBuilderSkills}
          template={branchBuilderTemplate}
        />
      </View>

      <View style={styles.section}>
        <DownloadSection
          backendStatus={backendStatus}
          errors={validationErrors}
          onErrorsLayout={handleErrorsLayout}
          onDeleteFull={() => {
            void handleDeleteFullBuildSet();
          }}
          onDownloadFull={handleDownloadFullJson}
          onLoadFull={() => {
            void handleLoadFullBuildSet();
          }}
          onLayout={handleDownloadSectionLayout}
          onPublishFull={() => {
            void saveFullBuildSetToBackend("published");
          }}
          onSaveCurrent={handleSaveCurrentTargetBuild}
          onSaveDraft={() => {
            void saveFullBuildSetToBackend("draft");
          }}
        />
      </View>
        </>
      ) : null}
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
  backendStatus: {
    color: "#e8d7b5",
    fontSize: 13,
    fontWeight: "700",
  },
});

function getErrorMessages(
  errors: readonly BranchBuildValidationError[],
  matches: (path: string, error: BranchBuildValidationError) => boolean,
): string[] {
  return errors
    .filter((error) => error.path && matches(error.path, error))
    .map((error) => error.message);
}

function isTargetTabErrorPath(path: string): boolean {
  return (
    !path.includes(".") &&
    (path.includes("/") || path === "pvp" || path === "pve")
  );
}

function hasTargetTabErrors(
  errors: readonly BranchBuildValidationError[],
): boolean {
  return errors.some(
    (error) =>
      error.code.startsWith("multiBuild.") ||
      (error.path ? isTargetTabErrorPath(error.path) : false),
  );
}

function isHeroErrorPath(path: string): boolean {
  return path === "heroId" || path === "heroName";
}

function isArtifactErrorPath(path: string): boolean {
  return path.startsWith("equipment.artifactIds");
}

function isRuneErrorPath(path: string): boolean {
  return path.startsWith("equipment.runeIds");
}

function getMajorNodePath(columnId: BranchColumnId, level: number): string {
  return `majorNodes.${columnId}.${level}`;
}
