import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { StatusToast } from "@/shared/ui/StatusToast";
import {
  deleteHeroBuildSet,
  DivinitySkillLoadoutSection,
  fetchDraftHeroBuildSet,
  fetchHeroBuildSetStatusIds,
  fetchPublishedHeroBuildSet,
  loadPublishedHeroBuildSet,
  type HeroBuildSetStatus,
  type HeroBuildSetStatusIds,
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
import { getBuilderHeroLists } from "../model/heroGuideSelector";
import type {
  BranchBuildValidationError,
  BranchColumnId,
  DivinityBranchId,
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
import {
  hasCreatePublicationConflict,
  saveAdminHeroBuildSet,
} from "../api/saveAdminHeroBuildSet";

const SCREEN_PADDING = 20;
const MAX_VALIDATION_TOAST_ERRORS = 5;
const SCROLL_TARGET_TOP_GAP = 14;
const MISSING_PREVIOUS_BRANCH_SKILL_MESSAGE =
  "Сначала выберите навык выше в этой ветке.";
type ValidationScrollSection =
  | "targetTabs"
  | "hero"
  | "equipment"
  | "weaponAwakening"
  | "divinitySkills"
  | "branchGrid"
  | "download";
type PendingScrollTarget = "top" | ValidationScrollSection;
type BuilderMode = "create" | "edit";
type StatusToastState = {
  kind: "success" | "error";
  message: string;
} | null;

type DivinityBranchBuilderScreenProps = {
  initialAdminSession?: AdminSession | null;
  initialHeroId?: string | null;
  initialMode?: BuilderMode;
};

export function DivinityBranchBuilderScreen({
  initialAdminSession,
  initialHeroId = null,
  initialMode = "create",
}: DivinityBranchBuilderScreenProps = {}) {
  const { top, bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionYByKey = useRef<Partial<Record<ValidationScrollSection, number>>>(
    {},
  );
  const pendingScrollTarget = useRef<PendingScrollTarget | null>(null);
  const loadedEditHeroId = useRef<string | null>(null);
  const draftLoadInFlight = useRef(false);
  const draftLoadRequestId = useRef(0);
  const heroListRequestId = useRef(0);
  const isScreenMounted = useRef(true);
  const {
    addArtifact,
    addRune,
    buildValidationDraft,
    buildFullExport,
    cycleWeaponAwakeningSlot,
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
  const [isAuthPending, setIsAuthPending] = useState(false);
  const [isEditBuildLoading, setIsEditBuildLoading] = useState(false);
  const [isPublishPending, setIsPublishPending] = useState(false);
  const [toast, setToast] = useState<StatusToastState>(null);
  const [heroStatusIds, setHeroStatusIds] = useState<HeroBuildSetStatusIds>({
    draftHeroIds: [],
    publishedHeroIds: [],
  });
  const [isDraftLoadPending, setIsDraftLoadPending] = useState(false);
  const [isHeroListLoading, setIsHeroListLoading] = useState(true);
  const [heroListError, setHeroListError] = useState<string | null>(null);

  useEffect(() => {
    isScreenMounted.current = true;

    return () => {
      isScreenMounted.current = false;
      draftLoadRequestId.current += 1;
      draftLoadInFlight.current = false;
    };
  }, []);

  const resetDraftLoad = useCallback(() => {
    draftLoadRequestId.current += 1;
    draftLoadInFlight.current = false;
    setIsDraftLoadPending(false);
  }, []);

  const resetHeroStatusList = useCallback(() => {
    heroListRequestId.current += 1;
    setHeroStatusIds({ draftHeroIds: [], publishedHeroIds: [] });
    setHeroListError(null);
    setIsHeroListLoading(true);
  }, []);

  const loadHeroStatusIds = useCallback(async () => {
    if (!isScreenMounted.current) {
      return;
    }

    const requestId = heroListRequestId.current + 1;
    heroListRequestId.current = requestId;
    const client = getSupabaseClient();

    if (!client) {
      setHeroStatusIds({ draftHeroIds: [], publishedHeroIds: [] });
      setHeroListError("Supabase не настроен.");
      setIsHeroListLoading(false);
      return;
    }

    setIsHeroListLoading(true);
    setHeroListError(null);

    try {
      const ids = await fetchHeroBuildSetStatusIds(
        client as unknown as HeroBuildSetSupabaseClient,
      );

      if (requestId !== heroListRequestId.current) {
        return;
      }

      setHeroStatusIds(ids);
    } catch (error) {
      if (requestId !== heroListRequestId.current) {
        return;
      }

      setHeroStatusIds({ draftHeroIds: [], publishedHeroIds: [] });
      setHeroListError(
        error instanceof Error ? error.message : "Неизвестная ошибка Supabase.",
      );
    } finally {
      if (requestId === heroListRequestId.current) {
        setIsHeroListLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthChecked) {
      if (!adminSession) {
        resetDraftLoad();
        resetHeroStatusList();
      } else {
        void loadHeroStatusIds();
      }
    }

    return () => {
      heroListRequestId.current += 1;
    };
  }, [
    adminSession,
    isAuthChecked,
    loadHeroStatusIds,
    resetDraftLoad,
    resetHeroStatusList,
  ]);

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

  useEffect(() => {
    if (toast?.kind !== "success") {
      return;
    }

    const timeoutId = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toast]);

  useEffect(() => {
    if (
      initialMode !== "edit" ||
      !initialHeroId ||
      !isAuthChecked ||
      !adminSession ||
      loadedEditHeroId.current === initialHeroId
    ) {
      return;
    }

    const client = getSupabaseClient();
    let isMounted = true;

    loadedEditHeroId.current = initialHeroId;
    setIsEditBuildLoading(true);

    const fallbackBuildSet = getHeroBuildSet(initialHeroId);

    if (!client) {
      if (fallbackBuildSet && loadBuildSetForEditing(fallbackBuildSet)) {
        showBackendMessage("success", "Локальный билд загружен для редактирования.");
      } else {
        showBackendMessage("error", "Supabase не настроен.");
      }

      setIsEditBuildLoading(false);
      return () => {
        isMounted = false;
      };
    }

    void loadPublishedHeroBuildSet({
      client: client as unknown as HeroBuildSetSupabaseClient,
      fallbackBuildSet,
      heroId: initialHeroId,
    })
      .then((buildSet) => {
        if (!isMounted) {
          return;
        }

        if (!buildSet || !loadBuildSetForEditing(buildSet)) {
          showBackendMessage("error", "Билд для редактирования не найден.");
          return;
        }

        showBackendMessage("success", "Билд загружен для редактирования.");
      })
      .catch((error) => {
        if (isMounted) {
          showBackendMessage(
            "error",
            error instanceof Error
              ? `Ошибка Supabase: ${error.message}`
              : "Ошибка Supabase.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsEditBuildLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    adminSession,
    initialHeroId,
    initialMode,
    isAuthChecked,
    loadBuildSetForEditing,
  ]);

  function showBackendMessage(kind: "success" | "error", message: string) {
    setBackendStatus(message);
    setToast({ kind, message });
  }

  function showValidationErrorToast(
    errors: readonly BranchBuildValidationError[],
    fallbackMessage: string,
  ) {
    setBackendStatus(null);
    setToast({
      kind: "error",
      message: formatValidationToastMessage(errors, fallbackMessage),
    });
  }

  const weaponAwakeningBonuses = resolveWeaponAwakeningBonuses({
    hero: selectedHero,
    selections: weaponAwakeningSelections,
    combosData: branchBuilderWeaponAwakeningCombos,
  });
  const heroLists = useMemo(
    () => getBuilderHeroLists({ heroes: branchBuilderHeroes, ...heroStatusIds }),
    [heroStatusIds],
  );

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
  const selectedTreeSkillIds = useMemo(
    () =>
      branchBuilderTemplate
        .filter((node) => node.nodeType === "majorSkill")
        .map((node) => selectedMajorSkills[`${node.columnId}:${node.level}`])
        .filter((skillId): skillId is string => Boolean(skillId)),
    [selectedMajorSkills],
  );

  const scrollToPendingTarget = () => {
    const target = pendingScrollTarget.current;

    if (!target) {
      return;
    }

    if (target === "top") {
      pendingScrollTarget.current = null;
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
      return;
    }

    const sectionY = sectionYByKey.current[target];

    if (typeof sectionY !== "number") {
      return;
    }

    pendingScrollTarget.current = null;
    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(
        0,
        sectionY - SCREEN_HEADER_HEIGHT - top - SCROLL_TARGET_TOP_GAP,
      ),
    });
  };

  const handleSectionLayout =
    (section: ValidationScrollSection) => (event: LayoutChangeEvent) => {
      sectionYByKey.current[section] = event.nativeEvent.layout.y;
      scrollToPendingTarget();
    };

  const showValidationErrors = (
    errors: readonly BranchBuildValidationError[],
  ) => {
    setValidationErrors([...errors]);

    if (errors.length > 0) {
      const target = getValidationScrollTarget(errors);
      pendingScrollTarget.current = target;

      if (
        target === "top" ||
        sectionYByKey.current[target] !== undefined ||
        validationErrors.length > 0
      ) {
        scrollToPendingTarget();
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
      const saved = saveCurrentTargetBuild();
      showBackendMessage(
        saved ? "success" : "error",
        saved ? "Вкладка сохранена." : "Не удалось сохранить вкладку.",
      );
      return;
    }

    showValidationErrorToast(result.errors, "Сначала исправьте ошибки вкладки.");
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
      showValidationErrorToast(
        result.errors,
        "Сначала исправьте ошибки полного экспорта.",
      );
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      showBackendMessage("error", "Supabase не настроен.");
      return;
    }

    const buildSet = buildFullExport();

    if (!buildSet) {
      showBackendMessage("error", "Не удалось собрать полный билд.");
      return;
    }

    const firstBuildTab = buildSet.tabs[0];
    const heroId = firstBuildTab?.build?.heroId ?? selectedHeroId;

    if (!heroId) {
      showBackendMessage("error", "Не удалось определить героя для сохранения.");
      return;
    }

    setIsPublishPending(status === "published");

    try {
      if (status === "published" && initialMode !== "edit") {
        const remoteBuildSet = await fetchPublishedHeroBuildSet(
          client as unknown as HeroBuildSetSupabaseClient,
          heroId,
        );

        if (hasCreatePublicationConflict(remoteBuildSet)) {
          showBackendMessage(
            "error",
            "У героя уже есть билд. Откройте экран героя и нажмите «Редактировать».",
          );
          return;
        }
      }

      await saveAdminHeroBuildSet({
        buildSet,
        client: client as unknown as HeroBuildSetSupabaseClient,
        heroId,
        refreshPublishedHeroIds: loadHeroStatusIds,
        status,
      });
      showBackendMessage(
        "success",
        status === "published" ? "Билд опубликован." : "Черновик сохранён.",
      );
    } catch (error) {
      showBackendMessage(
        "error",
        error instanceof Error
          ? `Ошибка Supabase: ${error.message}`
          : "Ошибка Supabase.",
      );
    } finally {
      if (status === "published") {
        setIsPublishPending(false);
      }
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
    setIsAuthPending(true);
    setToast(null);

    const client = getSupabaseClient();

    if (!client) {
      setToast({ kind: "error", message: "Supabase не настроен." });
      setIsAuthPending(false);
      return;
    }

    try {
      const session = await signInAdmin(client, credentials);
      setAdminSession(session);
      setToast({ kind: "success", message: "Вход выполнен." });
    } catch (error) {
      setToast({
        kind: "error",
        message:
          error instanceof Error
            ? `Ошибка входа: ${error.message}`
            : "Ошибка входа.",
      });
    } finally {
      setIsAuthPending(false);
    }
  };

  const handleAdminSignOut = async () => {
    setIsAuthPending(true);
    setToast(null);
    resetDraftLoad();

    const client = getSupabaseClient();

    if (!client) {
      resetHeroStatusList();
      setAdminSession(null);
      setToast({ kind: "success", message: "Выход выполнен." });
      setIsAuthPending(false);
      return;
    }

    try {
      await signOutAdmin(client);
      resetHeroStatusList();
      setAdminSession(null);
      setToast({ kind: "success", message: "Выход выполнен." });
    } catch (error) {
      setToast({
        kind: "error",
        message:
          error instanceof Error
            ? `Ошибка выхода: ${error.message}`
            : "Ошибка выхода.",
      });
    } finally {
      setIsAuthPending(false);
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

  const handleSelectHero = async (heroId: string) => {
    clearValidationErrors(isHeroErrorPath);

    if (!heroStatusIds.draftHeroIds.includes(heroId)) {
      selectHero(heroId);
      return;
    }

    const client = getSupabaseClient();

    if (!client || draftLoadInFlight.current) {
      return;
    }

    const requestId = draftLoadRequestId.current + 1;
    draftLoadRequestId.current = requestId;
    draftLoadInFlight.current = true;
    setIsDraftLoadPending(true);

    const isCurrentRequest = () =>
      isScreenMounted.current && requestId === draftLoadRequestId.current;

    try {
      const draft = await fetchDraftHeroBuildSet(
        client as unknown as HeroBuildSetSupabaseClient,
        heroId,
      );

      if (!isCurrentRequest()) {
        return;
      }

      if (!draft || !loadBuildSetForEditing(draft)) {
        await loadHeroStatusIds();

        if (!isCurrentRequest()) {
          return;
        }

        showBackendMessage("error", "Черновик для выбранного героя не найден.");
        return;
      }

      showBackendMessage("success", "Черновик загружен.");
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      showBackendMessage(
        "error",
        error instanceof Error
          ? `Ошибка Supabase: ${error.message}`
          : "Ошибка Supabase.",
      );
    } finally {
      if (isCurrentRequest()) {
        draftLoadInFlight.current = false;
        setIsDraftLoadPending(false);
      }
    }
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
    const shouldNotifyDivinityReset =
      selectedBranches[columnId] !== branchId &&
      hasDivinitySkillSelection(selectedDivinitySkills);

    setColumnBranch(columnId, branchId);
    clearValidationErrors((path) => path === `columns.${columnId}`);

    if (shouldNotifyDivinityReset) {
      clearValidationErrors((path) => path.startsWith("divinitySkills."));
      showBackendMessage(
        "success",
        "\"Навыки божественности\" были сброшены",
      );
    }
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

  const getMissingPreviousMajorSkillLevel = (
    columnId: BranchColumnId,
    level: number,
  ) =>
    branchBuilderTemplate
      .filter(
        (node) =>
          node.columnId === columnId &&
          node.nodeType === "majorSkill" &&
          node.level < level,
      )
      .map((node) => node.level)
      .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
      .find(
        (previousLevel) =>
          !selectedMajorSkills[getMajorSkillSelectionKey(columnId, previousLevel)],
      ) ?? null;

  const canUseBranchLevel = (columnId: BranchColumnId, level: number) => {
    if (getMissingPreviousMajorSkillLevel(columnId, level) === null) {
      return true;
    }

    setActiveMajorSlot(null);
    setToast({
      kind: "error",
      message: MISSING_PREVIOUS_BRANCH_SKILL_MESSAGE,
    });
    return false;
  };

  const handleOpenMajorSlot = (columnId: BranchColumnId, level: number) => {
    if (!canUseBranchLevel(columnId, level)) {
      return;
    }

    setActiveMajorSlot({ columnId, level });
  };

  const handleToggleProgress = (columnId: BranchColumnId, level: number) => {
    if (!canUseBranchLevel(columnId, level)) {
      return;
    }

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
          isPending={isAuthPending}
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

      {isEditBuildLoading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Загружаем билд...</Text>
        </View>
      ) : null}

      {isAuthChecked && adminSession ? (
        <>
      <View
        onLayout={handleSectionLayout("targetTabs")}
        style={styles.section}
        testID="branch-builder-target-tabs-section"
      >
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

      <View
        onLayout={handleSectionLayout("hero")}
        style={styles.section}
        testID="branch-builder-hero-section"
      >
        <HeroBuilderSection
          errors={heroErrors}
          heroListError={heroListError}
          isDraftLoadPending={isDraftLoadPending}
          isHeroListLoading={isHeroListLoading}
          notCreatedHeroes={heroLists.notCreatedHeroes}
          notPublishedHeroes={heroLists.notPublishedHeroes}
          onRetryHeroList={() => void loadHeroStatusIds()}
          onSelectHero={(heroId) => void handleSelectHero(heroId)}
          selectedHero={selectedHero}
          selectedHeroId={selectedHeroId}
        />
      </View>

      <View
        onLayout={handleSectionLayout("equipment")}
        style={styles.section}
        testID="branch-builder-equipment-section"
      >
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

      <View
        onLayout={handleSectionLayout("weaponAwakening")}
        style={styles.section}
        testID="branch-builder-weapon-awakening-section"
      >
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

      <View
        onLayout={handleSectionLayout("divinitySkills")}
        style={styles.section}
        testID="branch-builder-divinity-skills-section"
      >
        <DivinitySkillLoadoutSection
          awakenedEnabled={selectedDivinitySkills.awakenedEnabled}
          awakenedSkillIds={selectedDivinitySkills.awakened}
          availableSkillIds={selectedTreeSkillIds}
          baseSkillIds={selectedDivinitySkills.base}
          branches={branchBuilderBranches}
          onSelectSkill={handleSetDivinitySkill}
          onShowAwakened={showAwakenedDivinitySkills}
          skills={branchBuilderSkills}
        />
        <View
          style={styles.divinitySkillErrors}
          testID="branch-builder-divinity-skill-errors"
        >
          <ValidationErrorMessages messages={divinitySkillErrors} />
        </View>
      </View>

      <View
        onLayout={handleSectionLayout("branchGrid")}
        style={styles.section}
        testID="branch-builder-branch-grid-section"
      >
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
          onOpenMajorSlot={handleOpenMajorSlot}
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

      <View style={styles.section} testID="branch-builder-download-section">
        <DownloadSection
          backendStatus={backendStatus}
          errors={validationErrors}
          isPublishPending={isPublishPending}
          onErrorsLayout={handleSectionLayout("download")}
          onDeleteFull={() => {
            void handleDeleteFullBuildSet();
          }}
          onDownloadFull={handleDownloadFullJson}
          onLoadFull={() => {
            void handleLoadFullBuildSet();
          }}
          onLayout={handleSectionLayout("download")}
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
      {toast ? (
        <StatusToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
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
  loadingCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5a412b",
    backgroundColor: "#1d130f",
    padding: 12,
  },
  loadingText: {
    color: "#f6d59a",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  divinitySkillErrors: {
    width: "100%",
    marginTop: 8,
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

function getValidationScrollTarget(
  errors: readonly BranchBuildValidationError[],
): PendingScrollTarget {
  if (hasTargetTabErrors(errors)) {
    return "top";
  }

  const firstError = errors[0];
  const path = firstError?.path;

  if (!path) {
    return "top";
  }

  if (path === "heroId" || path === "heroName") {
    return "hero";
  }

  if (path.startsWith("equipment.")) {
    return "equipment";
  }

  if (path.startsWith("weaponAwakening.")) {
    return "weaponAwakening";
  }

  if (path.startsWith("divinitySkills.")) {
    return "divinitySkills";
  }

  if (
    path.startsWith("columns.") ||
    path.startsWith("progress.") ||
    path.startsWith("majorNodes.")
  ) {
    return "branchGrid";
  }

  return "top";
}

function formatValidationToastMessage(
  errors: readonly BranchBuildValidationError[],
  fallbackMessage: string,
): string {
  const messages = [...new Set(errors.map((error) => error.message).filter(Boolean))];

  if (messages.length === 0) {
    return fallbackMessage;
  }

  const visibleMessages = messages.slice(0, MAX_VALIDATION_TOAST_ERRORS);
  const hiddenCount = messages.length - visibleMessages.length;

  return [
    ...visibleMessages,
    ...(hiddenCount > 0 ? [`И ещё ${hiddenCount} ошибок.`] : []),
  ].join("\n");
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

function hasDivinitySkillSelection(divinitySkills: {
  base: readonly (string | null)[];
  awakened: readonly (string | null)[];
  awakenedEnabled: boolean;
}): boolean {
  return (
    divinitySkills.awakenedEnabled ||
    divinitySkills.base.some(Boolean) ||
    divinitySkills.awakened.some(Boolean)
  );
}

function getMajorNodePath(columnId: BranchColumnId, level: number): string {
  return `majorNodes.${columnId}.${level}`;
}

function getMajorSkillSelectionKey(
  columnId: BranchColumnId,
  level: number,
): string {
  return `${columnId}:${level}`;
}
