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
  createOrUpdateDraftHeroBuildSet,
  DivinitySkillLoadoutSection,
  fetchDraftHeroBuildSetRecord,
  fetchHeroBuildSetStatusIds,
  fetchPublishedHeroBuildSet,
  fetchPublishedHeroBuildSetRecord,
  HeroBuildSetRepositoryError,
  updatePublishedHeroBuildSet,
  type HeroBuildSetStatusIds,
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
  publishAdminHeroBuildSet,
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
  const initialEditLoadInFlight = useRef(false);
  const draftLoadInFlight = useRef(false);
  const entityLoadRequestId = useRef(0);
  const heroListRequestId = useRef(0);
  const tabSaveInFlight = useRef(false);
  const tabSaveRequestId = useRef(0);
  const publishInFlight = useRef(false);
  const publishRequestId = useRef(0);
  const authTransitionInFlight = useRef(false);
  const activeHeroId = useRef<string | null>(null);
  const serverRevisionsByHero = useRef<Record<string, number>>({});
  const authRequestId = useRef(0);
  const isScreenMounted = useRef(true);
  const {
    addArtifact,
    addRune,
    buildValidationDraft,
    buildFullExport,
    commitPreparedTargetBuild,
    cycleWeaponAwakeningSlot,
    isPreparedTargetBuildCurrent,
    loadBuildSetForEditing,
    progressLevels,
    prepareCurrentTargetBuild,
    removeArtifact,
    removeRune,
    rollbackColumnProgress,
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
    editorTargetTabs,
  } = useDivinityBranchBuilder(branchBuilderWeaponAwakeningCatalog, {
    mode: initialMode,
  });
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
  const [initialEditLoadRetryId, setInitialEditLoadRetryId] = useState(0);
  const [isPublishPending, setIsPublishPending] = useState(false);
  const [isTabSavePending, setIsTabSavePending] = useState(false);
  const [toast, setToast] = useState<StatusToastState>(null);
  const [heroStatusIds, setHeroStatusIds] = useState<HeroBuildSetStatusIds>({
    draftHeroIds: [],
    publishedHeroIds: [],
  });
  const [isDraftLoadPending, setIsDraftLoadPending] = useState(false);
  const [isHeroListLoading, setIsHeroListLoading] = useState(true);
  const [heroListError, setHeroListError] = useState<string | null>(null);
  const isBuilderTransitionPending =
    isEditBuildLoading || isDraftLoadPending || isAuthPending;
  const isBuilderActionBlocked = useCallback(
    () =>
      isEditBuildLoading ||
      isDraftLoadPending ||
      isAuthPending ||
      initialEditLoadInFlight.current ||
      draftLoadInFlight.current ||
      authTransitionInFlight.current,
    [isAuthPending, isDraftLoadPending, isEditBuildLoading],
  );
  const isHeroSelectionBlocked = useCallback(
    () =>
      isDraftLoadPending ||
      isAuthPending ||
      draftLoadInFlight.current ||
      authTransitionInFlight.current,
    [isAuthPending, isDraftLoadPending],
  );

  const resetTabSave = useCallback(() => {
    tabSaveRequestId.current += 1;
    tabSaveInFlight.current = false;
    setIsTabSavePending(false);
  }, []);

  const resetPublish = useCallback(() => {
    publishRequestId.current += 1;
    publishInFlight.current = false;
    setIsPublishPending(false);
  }, []);

  useEffect(() => {
    isScreenMounted.current = true;

    return () => {
      isScreenMounted.current = false;
      entityLoadRequestId.current += 1;
      initialEditLoadInFlight.current = false;
      draftLoadInFlight.current = false;
      tabSaveRequestId.current += 1;
      tabSaveInFlight.current = false;
      publishRequestId.current += 1;
      publishInFlight.current = false;
      authRequestId.current += 1;
      authTransitionInFlight.current = false;
    };
  }, []);

  const resetDraftLoad = useCallback(() => {
    entityLoadRequestId.current += 1;
    initialEditLoadInFlight.current = false;
    draftLoadInFlight.current = false;
    setIsDraftLoadPending(false);
    setIsEditBuildLoading(false);
    serverRevisionsByHero.current = {};
  }, []);

  const resetHeroStatusList = useCallback(() => {
    heroListRequestId.current += 1;
    setHeroStatusIds({ draftHeroIds: [], publishedHeroIds: [] });
    setHeroListError(null);
    setIsHeroListLoading(true);
  }, []);

  const loadHeroStatusIds = useCallback(async (options?: {
    preserveCurrentIdsOnError?: boolean;
  }): Promise<boolean> => {
    if (!isScreenMounted.current) {
      return false;
    }

    const requestId = heroListRequestId.current + 1;
    heroListRequestId.current = requestId;
    const client = getSupabaseClient();

    if (!client) {
      if (!options?.preserveCurrentIdsOnError) {
        setHeroStatusIds({ draftHeroIds: [], publishedHeroIds: [] });
      }
      setHeroListError("Supabase не настроен.");
      setIsHeroListLoading(false);
      return false;
    }

    setIsHeroListLoading(true);
    setHeroListError(null);

    try {
      const ids = await fetchHeroBuildSetStatusIds(
        client,
      );

      if (requestId !== heroListRequestId.current) {
        return false;
      }

      setHeroStatusIds(ids);
      return true;
    } catch (error) {
      if (requestId !== heroListRequestId.current) {
        return false;
      }

      if (!options?.preserveCurrentIdsOnError) {
        setHeroStatusIds({ draftHeroIds: [], publishedHeroIds: [] });
      }
      setHeroListError(
        error instanceof Error ? error.message : "Неизвестная ошибка Supabase.",
      );
      return false;
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
    const requestId = entityLoadRequestId.current + 1;
    entityLoadRequestId.current = requestId;
    const isCurrentRequest = () =>
      isScreenMounted.current && requestId === entityLoadRequestId.current;

    loadedEditHeroId.current = initialHeroId;
    resetTabSave();
    resetPublish();
    initialEditLoadInFlight.current = true;
    setIsEditBuildLoading(true);

    const fallbackBuildSet = getHeroBuildSet(initialHeroId);

    if (!client) {
      if (!isCurrentRequest()) {
        return;
      }

      if (fallbackBuildSet && loadBuildSetForEditing(fallbackBuildSet)) {
        activeHeroId.current = initialHeroId;
        showBackendMessage("success", "Локальный билд загружен для редактирования.");
      } else {
        showBackendMessage("error", "Supabase не настроен.");
      }

      initialEditLoadInFlight.current = false;
      setIsEditBuildLoading(false);
      return;
    }

    void fetchPublishedHeroBuildSetRecord(client, initialHeroId)
      .then((record) => {
        if (!isCurrentRequest()) {
          return;
        }

        const buildSet = record?.buildSet ?? fallbackBuildSet;
        if (!buildSet || !loadBuildSetForEditing(buildSet)) {
          showBackendMessage("error", "Билд для редактирования не найден.");
          return;
        }

        activeHeroId.current = initialHeroId;
        setServerRevision(initialHeroId, record?.revision ?? null);
        showBackendMessage("success", "Билд загружен для редактирования.");
      })
      .catch((error) => {
        if (!isCurrentRequest()) {
          return;
        }

        showBackendMessage(
          "error",
          error instanceof Error
            ? `Ошибка Supabase: ${error.message}`
            : "Ошибка Supabase.",
        );
      })
      .finally(() => {
        if (isCurrentRequest()) {
          initialEditLoadInFlight.current = false;
          setIsEditBuildLoading(false);
        }
      });
  }, [
    adminSession,
    initialHeroId,
    initialMode,
    initialEditLoadRetryId,
    isAuthChecked,
    loadBuildSetForEditing,
    resetPublish,
    resetTabSave,
  ]);

  function showBackendMessage(kind: "success" | "error", message: string) {
    setBackendStatus(message);
    setToast({ kind, message });
  }

  function showRepositoryError(error: unknown) {
    if (
      error instanceof HeroBuildSetRepositoryError &&
      error.kind === "conflict"
    ) {
      showBackendMessage(
        "error",
        "Билд изменён в другой сессии. Ваши правки сохранены в форме; загрузите актуальную версию.",
      );
      return;
    }

    showBackendMessage(
      "error",
      error instanceof Error
        ? `Ошибка Supabase: ${error.message}`
        : "Ошибка Supabase.",
    );
  }

  function getServerRevision(heroId: string): number | null {
    return serverRevisionsByHero.current[heroId] ?? null;
  }

  function setServerRevision(heroId: string, revision: number | null) {
    if (revision === null) {
      delete serverRevisionsByHero.current[heroId];
      return;
    }

    serverRevisionsByHero.current[heroId] = revision;
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
  } = useMemo(
    () => getBranchBuilderTargetTabs(targetTabPath, editorTargetTabs),
    [editorTargetTabs, targetTabPath],
  );
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

  const handleSaveCurrentTargetBuild = async () => {
    if (
      isBuilderActionBlocked() ||
      tabSaveInFlight.current ||
      publishInFlight.current
    ) {
      return;
    }

    const result =
      initialMode === "edit"
        ? validateFullExport()
        : validateBranchBuild(
            buildValidationDraft(),
            branchBuilderValidationCatalog,
          );

    showValidationErrors(result.errors);

    if (!result.isValid) {
      showValidationErrorToast(result.errors, "Сначала исправьте ошибки вкладки.");
      return;
    }

    const client = getSupabaseClient();
    const prepared = prepareCurrentTargetBuild();

    if (!client || !prepared || !selectedHeroId) {
      showBackendMessage(
        "error",
        client ? "Не удалось собрать вкладку." : "Supabase не настроен.",
      );
      return;
    }

    tabSaveInFlight.current = true;
    const requestId = tabSaveRequestId.current + 1;
    tabSaveRequestId.current = requestId;
    setIsTabSavePending(true);
    const isCurrentRequest = () =>
      isScreenMounted.current &&
      requestId === tabSaveRequestId.current &&
      activeHeroId.current === selectedHeroId;
    const isCurrentEntity = () =>
      isScreenMounted.current && activeHeroId.current === selectedHeroId;

    try {
      let resultingRevision: number;
      const expectedRevision = getServerRevision(selectedHeroId);

      if (initialMode === "edit") {
        if (expectedRevision === null) {
          showBackendMessage("error", "Загрузите актуальный серверный билд перед сохранением.");
          return;
        }
        const record = await updatePublishedHeroBuildSet(
          client,
          {
            buildSet: prepared.buildSet,
            expectedRevision,
            heroId: selectedHeroId,
          },
        );
        resultingRevision =
          record?.revision ?? expectedRevision + 1;
      } else {
        const record = await createOrUpdateDraftHeroBuildSet(
          client,
          {
            buildSet: prepared.buildSet,
            expectedRevision,
            heroId: selectedHeroId,
          },
        );
        resultingRevision =
          record?.revision ?? (expectedRevision ?? 0) + 1;
      }

      if (isCurrentEntity()) {
        setServerRevision(selectedHeroId, resultingRevision);
      }
      if (!isCurrentRequest()) {
        return;
      }

      const committed = commitPreparedTargetBuild(prepared);
      await loadHeroStatusIds();

      if (!isCurrentRequest()) {
        return;
      }

      const isCurrent =
        committed && isPreparedTargetBuildCurrent(prepared);
      showBackendMessage(
        isCurrent ? "success" : "error",
        isCurrent
          ? initialMode === "edit"
            ? "Билд обновлён."
            : "Вкладка сохранена."
          : initialMode === "edit"
            ? "Билд обновлён на сервере, но форма уже изменилась."
            : "Вкладка сохранена на сервере, но форма уже изменилась.",
      );
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      showRepositoryError(error);
    } finally {
      if (isCurrentRequest()) {
        tabSaveInFlight.current = false;
        setIsTabSavePending(false);
      }
    }
  };

  const handleDownloadFullJson = () => {
    if (isBuilderActionBlocked()) {
      return;
    }

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

  const saveFullBuildSetToBackend = async (status: "draft" | "published") => {
    if (
      isBuilderActionBlocked() ||
      tabSaveInFlight.current ||
      publishInFlight.current
    ) {
      return;
    }

    const editValidationResult =
      initialMode === "edit"
        ? validateBranchBuild(
            buildValidationDraft(),
            branchBuilderValidationCatalog,
          )
        : null;

    if (editValidationResult) {
      showValidationErrors(editValidationResult.errors);

      if (!editValidationResult.isValid) {
        showValidationErrorToast(
          editValidationResult.errors,
          "Сначала исправьте ошибки вкладки.",
        );
        return;
      }
    }

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

    const preparedEditBuild =
      initialMode === "edit" ? prepareCurrentTargetBuild() : null;
    const buildSet = preparedEditBuild?.buildSet ?? buildFullExport();

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

    if (status === "draft") {
      try {
        const expectedRevision = getServerRevision(heroId);
        const record = await createOrUpdateDraftHeroBuildSet(
          client,
          {
            buildSet,
            expectedRevision,
            heroId,
          },
        );
        setServerRevision(
          heroId,
          record?.revision ?? (expectedRevision ?? 0) + 1,
        );
        showBackendMessage("success", "Черновик сохранён.");
      } catch (error) {
        showRepositoryError(error);
      }
      return;
    }

    publishInFlight.current = true;
    const requestId = publishRequestId.current + 1;
    publishRequestId.current = requestId;
    setIsPublishPending(true);
    const isCurrentRequest = () =>
      isScreenMounted.current &&
      requestId === publishRequestId.current &&
      activeHeroId.current === heroId;
    const isCurrentEntity = () =>
      isScreenMounted.current && activeHeroId.current === heroId;

    try {
      let resultingRevision: number;
      const expectedRevision = getServerRevision(heroId);

      if (initialMode === "edit") {
        if (expectedRevision === null) {
          showBackendMessage("error", "Загрузите актуальный серверный билд перед сохранением.");
          return;
        }
        const record = await updatePublishedHeroBuildSet(
          client,
          {
            buildSet,
            expectedRevision,
            heroId,
          },
        );
        resultingRevision =
          record?.revision ?? expectedRevision + 1;
      } else {
        const remoteBuildSet = await fetchPublishedHeroBuildSet(
          client,
          heroId,
        );

        if (!isCurrentRequest()) {
          return;
        }

        if (hasCreatePublicationConflict(remoteBuildSet)) {
          showBackendMessage(
            "error",
            "У героя уже есть билд. Откройте экран героя и нажмите «Редактировать».",
          );
          return;
        }
        if (expectedRevision === null) {
          showBackendMessage("error", "Сначала сохраните черновик на сервере.");
          return;
        }
        const record = await publishAdminHeroBuildSet({
          buildSet,
          client,
          expectedRevision,
          heroId,
        });
        resultingRevision =
          record?.revision ?? expectedRevision + 1;
      }

      if (isCurrentEntity()) {
        setServerRevision(heroId, resultingRevision);
      }
      if (!isCurrentRequest()) {
        return;
      }

      setHeroStatusIds((current) => ({
        draftHeroIds: current.draftHeroIds.filter((id) => id !== heroId),
        publishedHeroIds: current.publishedHeroIds.includes(heroId)
          ? current.publishedHeroIds
          : [...current.publishedHeroIds, heroId],
      }));

      if (initialMode === "edit" && preparedEditBuild) {
        commitPreparedTargetBuild(preparedEditBuild);
      }

      const didRefreshHeroStatusIds = await loadHeroStatusIds({
        preserveCurrentIdsOnError: true,
      });

      if (!isCurrentRequest()) {
        return;
      }

      if (!didRefreshHeroStatusIds) {
        showBackendMessage(
          "error",
          initialMode === "edit"
            ? "Билд обновлён, но список героев обновить не удалось."
            : "Билд опубликован, но список героев обновить не удалось.",
        );
        return;
      }

      showBackendMessage(
        "success",
        initialMode === "edit" ? "Билд обновлён." : "Билд опубликован.",
      );
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      showRepositoryError(error);
    } finally {
      if (isCurrentRequest()) {
        publishInFlight.current = false;
        setIsPublishPending(false);
      }
    }
  };

  const handleLoadFullBuildSet = async () => {
    if (isBuilderActionBlocked()) {
      return;
    }

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
      const record = await fetchPublishedHeroBuildSetRecord(
        client,
        selectedHeroId,
      );
      const buildSet = record?.buildSet ?? getHeroBuildSet(selectedHeroId);

      if (!buildSet || !loadBuildSetForEditing(buildSet)) {
        setBackendStatus("Билд для выбранного героя не найден.");
        return;
      }

      setServerRevision(selectedHeroId, record?.revision ?? null);
      setBackendStatus("Билд загружен для редактирования.");
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
    if (authTransitionInFlight.current) {
      return;
    }

    authTransitionInFlight.current = true;
    const requestId = authRequestId.current + 1;
    authRequestId.current = requestId;
    setIsAuthPending(true);
    setToast(null);
    const isCurrentRequest = () =>
      isScreenMounted.current && requestId === authRequestId.current;

    const client = getSupabaseClient();

    if (!client) {
      if (isCurrentRequest()) {
        setToast({ kind: "error", message: "Supabase не настроен." });
        authTransitionInFlight.current = false;
        setIsAuthPending(false);
      }
      return;
    }

    try {
      const session = await signInAdmin(client, credentials);

      if (!isCurrentRequest()) {
        return;
      }

      setAdminSession(session);
      setToast({ kind: "success", message: "Вход выполнен." });
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      setToast({
        kind: "error",
        message:
          error instanceof Error
            ? `Ошибка входа: ${error.message}`
            : "Ошибка входа.",
      });
    } finally {
      if (isCurrentRequest()) {
        authTransitionInFlight.current = false;
        setIsAuthPending(false);
      }
    }
  };

  const handleAdminSignOut = async () => {
    if (authTransitionInFlight.current) {
      return;
    }

    authTransitionInFlight.current = true;
    const requestId = authRequestId.current + 1;
    authRequestId.current = requestId;
    const shouldRetryInitialEditLoad = initialEditLoadInFlight.current;
    setIsAuthPending(true);
    setToast(null);
    resetDraftLoad();
    resetTabSave();
    resetPublish();
    heroListRequestId.current += 1;
    const isCurrentRequest = () =>
      isScreenMounted.current && requestId === authRequestId.current;

    const client = getSupabaseClient();

    if (!client) {
      if (isCurrentRequest()) {
        if (shouldRetryInitialEditLoad) {
          loadedEditHeroId.current = null;
        }
        resetHeroStatusList();
        setAdminSession(null);
        setToast({ kind: "success", message: "Выход выполнен." });
        authTransitionInFlight.current = false;
        setIsAuthPending(false);
      }
      return;
    }

    try {
      await signOutAdmin(client);

      if (!isCurrentRequest()) {
        return;
      }

      if (shouldRetryInitialEditLoad) {
        loadedEditHeroId.current = null;
      }
      resetHeroStatusList();
      setAdminSession(null);
      setToast({ kind: "success", message: "Выход выполнен." });
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      setToast({
        kind: "error",
        message:
          error instanceof Error
            ? `Ошибка выхода: ${error.message}`
            : "Ошибка выхода.",
      });

      if (shouldRetryInitialEditLoad) {
        loadedEditHeroId.current = null;
        setInitialEditLoadRetryId((current) => current + 1);
      }

      void loadHeroStatusIds({ preserveCurrentIdsOnError: true });
    } finally {
      if (isCurrentRequest()) {
        authTransitionInFlight.current = false;
        setIsAuthPending(false);
      }
    }
  };

  const handleSelectTopTab = (tabId: string) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    clearTargetTabErrors();
    setTargetTopTab(tabId);
  };

  const handleSelectChildTab = (tabId: string) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    clearTargetTabErrors();
    setTargetChildTab(tabId);
  };

  const handleSelectHero = async (heroId: string) => {
    if (isHeroSelectionBlocked()) {
      return;
    }

    resetTabSave();
    resetPublish();
    const requestId = entityLoadRequestId.current + 1;
    entityLoadRequestId.current = requestId;
    initialEditLoadInFlight.current = false;
    setIsEditBuildLoading(false);
    clearValidationErrors(isHeroErrorPath);

    if (!heroStatusIds.draftHeroIds.includes(heroId)) {
      setServerRevision(heroId, null);
      selectHero(heroId);
      activeHeroId.current = heroId;
      return;
    }

    const client = getSupabaseClient();

    if (!client || draftLoadInFlight.current) {
      return;
    }

    draftLoadInFlight.current = true;
    setIsDraftLoadPending(true);

    const isCurrentRequest = () =>
      isScreenMounted.current && requestId === entityLoadRequestId.current;

    try {
      const draftRecord = await fetchDraftHeroBuildSetRecord(
        client,
        heroId,
      );

      if (!isCurrentRequest()) {
        return;
      }

      if (!draftRecord || !loadBuildSetForEditing(draftRecord.buildSet)) {
        await loadHeroStatusIds();

        if (!isCurrentRequest()) {
          return;
        }

        showBackendMessage("error", "Черновик для выбранного героя не найден.");
        return;
      }

      activeHeroId.current = heroId;
      setServerRevision(heroId, draftRecord.revision);
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
    if (isBuilderActionBlocked()) {
      return;
    }

    addArtifact(id);
    clearValidationErrors(isArtifactErrorPath);
  };

  const handleRemoveArtifact = (id: string) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    removeArtifact(id);
    clearValidationErrors(isArtifactErrorPath);
  };

  const handleAddRune = (id: string) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    addRune(id);
    clearValidationErrors(isRuneErrorPath);
  };

  const handleRemoveRune = (id: string) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    removeRune(id);
    clearValidationErrors(isRuneErrorPath);
  };

  const handleCycleWeaponAwakeningSlot = (slot: number) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    cycleWeaponAwakeningSlot(slot);
    clearValidationErrors((path) => path === `weaponAwakening.${slot}`);
  };

  const handleSetDivinitySkill = (
    rowId: "base" | "awakened",
    slotIndex: number,
    skillId: string | null,
  ) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    setDivinitySkill(rowId, slotIndex, skillId);
    clearValidationErrors((path) =>
      path === `divinitySkills.${rowId}` ||
      path.startsWith(`divinitySkills.${rowId}.`),
    );
  };

  const handleShowAwakenedDivinitySkills = () => {
    if (isBuilderActionBlocked()) {
      return;
    }

    showAwakenedDivinitySkills();
  };

  const handleSetColumnBranch = (
    columnId: BranchColumnId,
    branchId: Parameters<typeof setColumnBranch>[1],
  ) => {
    if (isBuilderActionBlocked()) {
      return;
    }

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
    if (isBuilderActionBlocked()) {
      return;
    }

    setMajorSkill(columnId, level, skillId);
    setColumnProgress(columnId, level);
    clearValidationErrors((path) =>
      path === getMajorNodePath(columnId, level) ||
      (level >= MIN_BRANCH_PROGRESS_LEVEL && path === `progress.${columnId}`),
    );
    setActiveMajorSlot(null);
  };

  const handleClearMajorSkill = (columnId: BranchColumnId, level: number) => {
    if (isBuilderActionBlocked()) {
      return;
    }

    setMajorSkill(columnId, level, null);
    rollbackColumnProgress(columnId, level);
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
    if (isBuilderActionBlocked()) {
      return false;
    }

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

      {isAuthChecked && adminSession ? (
        <>
          {!isBuilderTransitionPending ? (
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
          ) : null}

          {!isAuthPending ? (
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
                onRetryHeroList={() => {
                  if (!isBuilderActionBlocked()) {
                    void loadHeroStatusIds();
                  }
                }}
                onSelectHero={(heroId) => void handleSelectHero(heroId)}
                selectedHero={selectedHero}
                selectedHeroId={selectedHeroId}
              />
            </View>
          ) : null}

          {isBuilderTransitionPending ? (
            <View
              accessibilityRole="progressbar"
              style={styles.loadingCard}
              testID="branch-builder-transition-loading"
            >
              <Text style={styles.loadingText}>
                {isEditBuildLoading
                  ? "Загружаем билд..."
                  : isDraftLoadPending
                  ? "Загружаем черновик..."
                  : "Завершаем авторизацию..."}
              </Text>
            </View>
          ) : (
            <>
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
                  onShowAwakened={handleShowAwakenedDivinitySkills}
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
                  onClearMajorSkill={handleClearMajorSkill}
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

              <View
                style={styles.section}
                testID="branch-builder-download-section"
              >
                <DownloadSection
                  backendStatus={backendStatus}
                  errors={validationErrors}
                  isPublishPending={isPublishPending}
                  isTabSavePending={isTabSavePending}
                  onErrorsLayout={handleSectionLayout("download")}
                  onDownloadFull={handleDownloadFullJson}
                  onLoadFull={() => {
                    void handleLoadFullBuildSet();
                  }}
                  onLayout={handleSectionLayout("download")}
                  onPublishFull={() => {
                    void saveFullBuildSetToBackend("published");
                  }}
                  onSaveCurrent={() => {
                    void handleSaveCurrentTargetBuild();
                  }}
                  onSaveDraft={() => {
                    void saveFullBuildSetToBackend("draft");
                  }}
                />
              </View>
            </>
          )}
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
