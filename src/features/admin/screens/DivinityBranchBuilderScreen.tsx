import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSupabaseClient } from "@/shared/lib/supabaseClient";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { ScreenLoader } from "@/shared/ui/ScreenLoader";
import { StatusToast } from "@/shared/ui/StatusToast";
import {
  DivinitySkillLoadoutSection,
  fetchDraftHeroBuildSetRecord,
  fetchHeroBuildSetStatusIds,
  fetchPublishedHeroBuildSet,
  fetchPublishedHeroBuildSetRecord,
  HeroBuildSetRepositoryError,
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
import { useHeroBuildStatusQuery } from "../hooks/useHeroBuildStatusQuery";
import { useAdminSessionGate } from "../hooks/useAdminSessionGate";
import { getBranchBuilderTargetTabs } from "../model/branchBuilderTabs";
import { getBuilderHeroLists } from "../model/heroGuideSelector";
import {
  areTabPathsEqual,
  formatValidationToastMessage,
  getErrorMessages,
  getRelativeValidationErrors,
  getValidationScrollTarget,
  hasTargetTabErrors,
  isTargetTabErrorPath,
  type PendingValidationScrollTarget,
  type ValidationScrollSection,
} from "../model/validationNavigation";
import { RequestIdentityRegistry } from "../model/asyncRequestIdentity";
import type {
  BranchBuildValidationError,
  BranchColumnId,
  DivinityBranchId,
  HeroBuildTargetTabPath,
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
} from "../api/saveAdminHeroBuildSet";
import {
  BuilderRevisionStore,
  runBuilderDraftCommand,
  runBuilderPublishCommand,
  runBuilderUpdateCommand,
} from "../api/builderServerCommands";

const SCREEN_PADDING = 20;
const SCROLL_TARGET_TOP_GAP = 14;
const MISSING_PREVIOUS_BRANCH_SKILL_MESSAGE =
  "Сначала выберите навык выше в этой ветке.";
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
  const pendingScrollTarget = useRef<PendingValidationScrollTarget | null>(null);
  const loadedEditHeroId = useRef<string | null>(null);
  const initialEditLoadInFlight = useRef(false);
  const draftLoadInFlight = useRef(false);
  const entityLoadRequestId = useRef(0);
  const writeRequests = useRef(
    new RequestIdentityRegistry<"tabSave" | "publish">(),
  );
  const authTransitionInFlight = useRef(false);
  const discardTransitionInFlight = useRef(false);
  const discardTransitionRequestId = useRef(0);
  const activeHeroId = useRef<string | null>(null);
  const serverRevisions = useRef(new BuilderRevisionStore());
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
    isDirty,
    getFirstInvalidFullExport,
    loadBuildSetForEditing,
    progressLevels,
    prepareCurrentTargetBuild,
    removeArtifact,
    removeRune,
    rollbackColumnProgress,
    resetBuilderSession,
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
    selectTargetTabPath,
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
  const [validationErrorTabPath, setValidationErrorTabPath] =
    useState<HeroBuildTargetTabPath | null>(null);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const {
    isChecked: isAuthChecked,
    restoreError: adminRestoreError,
    session: adminSession,
    setSession: setAdminSession,
  } = useAdminSessionGate({
    getClient: getSupabaseClient,
    initialSession: initialAdminSession,
    restore: getCurrentAdminSession,
  });
  const [isAuthPending, setIsAuthPending] = useState(false);
  const [isEditBuildLoading, setIsEditBuildLoading] = useState(false);
  const [initialEditLoadRetryId, setInitialEditLoadRetryId] = useState(0);
  const [isPublishPending, setIsPublishPending] = useState(false);
  const [isTabSavePending, setIsTabSavePending] = useState(false);
  const [toast, setToast] = useState<StatusToastState>(null);
  const [isDraftLoadPending, setIsDraftLoadPending] = useState(false);
  const {
    error: heroListError,
    ids: heroStatusIds,
    invalidate: invalidateHeroStatusList,
    isLoading: isHeroListLoading,
    load: loadHeroStatusIds,
    reset: resetHeroStatusList,
    setIds: setHeroStatusIds,
  } = useHeroBuildStatusQuery({
    enabled: isAuthChecked && Boolean(adminSession),
    fetchIds: fetchHeroBuildSetStatusIds,
    getClient: getSupabaseClient,
  });
  const hasUnsavedPublishedEdits = initialMode === "edit" && isDirty;
  const isValidInitialEditHero = Boolean(
    initialMode === "edit" &&
      initialHeroId &&
      branchBuilderHeroes.some((hero) => hero.id === initialHeroId),
  );
  const isInitialEditTransitionPending = Boolean(
    isValidInitialEditHero &&
      isAuthChecked &&
      adminSession &&
      activeHeroId.current !== initialHeroId &&
      (loadedEditHeroId.current !== initialHeroId || isEditBuildLoading),
  );
  const shouldHideHeroDuringRestoredEdit = Boolean(
    initialAdminSession === undefined &&
      isInitialEditTransitionPending &&
      activeHeroId.current === null,
  );
  const isBuilderTransitionPending =
    isInitialEditTransitionPending ||
    isEditBuildLoading ||
    isDraftLoadPending ||
    isAuthPending;
  const isBuilderActionBlocked = useCallback(
    () =>
      isInitialEditTransitionPending ||
      isEditBuildLoading ||
      isDraftLoadPending ||
      isAuthPending ||
      initialEditLoadInFlight.current ||
      draftLoadInFlight.current ||
      authTransitionInFlight.current,
    [
      isAuthPending,
      isDraftLoadPending,
      isEditBuildLoading,
      isInitialEditTransitionPending,
    ],
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
    writeRequests.current.invalidate("tabSave");
    setIsTabSavePending(false);
  }, []);

  const resetPublish = useCallback(() => {
    writeRequests.current.invalidate("publish");
    setIsPublishPending(false);
  }, []);

  const confirmDiscardChanges = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedPublishedEdits) {
      return true;
    }

    if (Platform.OS === "web") {
      return typeof window !== "undefined"
        ? window.confirm(
            "Есть несохранённые изменения. Выйти без сохранения?",
          )
        : false;
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Несохранённые изменения",
        "Выйти без сохранения?",
        [
          {
            style: "cancel",
            text: "Остаться",
            onPress: () => resolve(false),
          },
          {
            style: "destructive",
            text: "Выйти",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false },
      );
    });
  }, [hasUnsavedPublishedEdits]);

  const confirmDiscardTransition = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedPublishedEdits) {
      return isScreenMounted.current;
    }

    if (discardTransitionInFlight.current || !isScreenMounted.current) {
      return false;
    }

    discardTransitionInFlight.current = true;
    const requestId = discardTransitionRequestId.current + 1;
    discardTransitionRequestId.current = requestId;

    try {
      const isConfirmed = await confirmDiscardChanges();

      return (
        isConfirmed &&
        isScreenMounted.current &&
        requestId === discardTransitionRequestId.current
      );
    } catch {
      return false;
    } finally {
      if (
        isScreenMounted.current &&
        requestId === discardTransitionRequestId.current
      ) {
        discardTransitionInFlight.current = false;
      }
    }
  }, [confirmDiscardChanges, hasUnsavedPublishedEdits]);

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !hasUnsavedPublishedEdits ||
      typeof window === "undefined"
    ) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedPublishedEdits]);

  useEffect(() => {
    isScreenMounted.current = true;

    return () => {
      isScreenMounted.current = false;
      entityLoadRequestId.current += 1;
      initialEditLoadInFlight.current = false;
      draftLoadInFlight.current = false;
      writeRequests.current.invalidate("tabSave");
      writeRequests.current.invalidate("publish");
      authRequestId.current += 1;
      authTransitionInFlight.current = false;
      discardTransitionRequestId.current += 1;
    };
  }, []);

  const cancelEntityLoads = useCallback(() => {
    entityLoadRequestId.current += 1;
    initialEditLoadInFlight.current = false;
    draftLoadInFlight.current = false;
    setIsDraftLoadPending(false);
    setIsEditBuildLoading(false);
  }, []);

  const resetDraftLoad = useCallback(() => {
    cancelEntityLoads();
    serverRevisions.current.clear();
  }, [cancelEntityLoads]);

  useEffect(() => {
    if (isAuthChecked && !adminSession) resetDraftLoad();
  }, [adminSession, isAuthChecked, resetDraftLoad]);

  useEffect(() => {
    if (adminRestoreError) setBackendStatus(adminRestoreError);
  }, [adminRestoreError]);

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
        serverRevisions.current.set(initialHeroId, record?.revision ?? null);
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
  const visibleValidationErrors =
    validationErrorTabPath &&
    !areTabPathsEqual(validationErrorTabPath, targetTabPath)
      ? []
      : validationErrors;
  const targetTabErrors = getErrorMessages(
    visibleValidationErrors,
    (path, error) =>
      error.code.startsWith("multiBuild.") || isTargetTabErrorPath(path),
  );
  const heroErrors = getErrorMessages(visibleValidationErrors, (path) =>
    path === "heroId" || path === "heroName",
  );
  const artifactErrors = getErrorMessages(visibleValidationErrors, (path) =>
    path.startsWith("equipment.artifactIds"),
  );
  const runeErrors = getErrorMessages(visibleValidationErrors, (path) =>
    path.startsWith("equipment.runeIds"),
  );
  const weaponAwakeningErrors = getErrorMessages(
    visibleValidationErrors,
    (path) => path.startsWith("weaponAwakening."),
  );
  const divinitySkillErrors = getErrorMessages(visibleValidationErrors, (path) =>
    path.startsWith("divinitySkills."),
  );
  const branchGridErrors = getErrorMessages(visibleValidationErrors, (path) =>
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
    setValidationErrorTabPath(null);
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

  const showPublishedEditValidationErrors = (
    errors: readonly BranchBuildValidationError[],
  ) => {
    const firstInvalid = getFirstInvalidFullExport(errors);

    if (!firstInvalid) {
      showValidationErrors(errors);
      return;
    }

    setValidationErrors(
      getRelativeValidationErrors(errors, firstInvalid.tabPath),
    );
    setValidationErrorTabPath([...firstInvalid.tabPath]);
    pendingScrollTarget.current = firstInvalid.section;
    selectTargetTabPath(firstInvalid.tabPath);
  };

  useEffect(() => {
    if (
      validationErrorTabPath &&
      !areTabPathsEqual(validationErrorTabPath, targetTabPath)
    ) {
      pendingScrollTarget.current = null;
      setValidationErrors([]);
      setValidationErrorTabPath(null);
      return;
    }

    scrollToPendingTarget();
  }, [targetTabPath, validationErrorTabPath]);

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
      writeRequests.current.isInFlight("tabSave") ||
      writeRequests.current.isInFlight("publish")
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

    if (!result.isValid) {
      if (initialMode === "edit") {
        showPublishedEditValidationErrors(result.errors);
      } else {
        showValidationErrors(result.errors);
      }
      showValidationErrorToast(result.errors, "Сначала исправьте ошибки вкладки.");
      return;
    }

    showValidationErrors([]);

    const client = getSupabaseClient();
    const prepared = prepareCurrentTargetBuild();

    if (!client || !prepared || !selectedHeroId) {
      showBackendMessage(
        "error",
        client ? "Не удалось собрать вкладку." : "Supabase не настроен.",
      );
      return;
    }

    const requestId = writeRequests.current.begin("tabSave");
    setIsTabSavePending(true);
    const isCurrentRequest = () =>
      isScreenMounted.current &&
      writeRequests.current.isCurrent("tabSave", requestId) &&
      activeHeroId.current === selectedHeroId;

    try {
      let resultingRevision: number;
      const expectedRevision = serverRevisions.current.get(selectedHeroId);

      if (initialMode === "edit") {
        if (expectedRevision === null) {
          showBackendMessage("error", "Загрузите актуальный серверный билд перед сохранением.");
          return;
        }
        const outcome = await runBuilderUpdateCommand({
          buildSet: prepared.buildSet,
          client,
          expectedRevision,
          heroId: selectedHeroId,
        });
        if (outcome.kind !== "success") throw outcome.error;
        resultingRevision = outcome.revision;
      } else {
        const outcome = await runBuilderDraftCommand({
          buildSet: prepared.buildSet,
          client,
          expectedRevision,
          heroId: selectedHeroId,
        });
        if (outcome.kind !== "success") throw outcome.error;
        resultingRevision = outcome.revision;
      }

      if (isCurrentRequest()) {
        serverRevisions.current.set(selectedHeroId, resultingRevision);
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
        writeRequests.current.finish("tabSave", requestId);
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
      writeRequests.current.isInFlight("tabSave") ||
      writeRequests.current.isInFlight("publish")
    ) {
      return;
    }

    const result = validateFullExport();

    if (!result.isValid) {
      if (initialMode === "edit") {
        showPublishedEditValidationErrors(result.errors);
      } else {
        showValidationErrors(result.errors);
      }
      showValidationErrorToast(
        result.errors,
        "Сначала исправьте ошибки полного экспорта.",
      );
      return;
    }

    showValidationErrors([]);

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
        const expectedRevision = serverRevisions.current.get(heroId);
        const outcome = await runBuilderDraftCommand({
          buildSet,
          client,
          expectedRevision,
          heroId,
        });
        if (outcome.kind !== "success") throw outcome.error;
        serverRevisions.current.set(heroId, outcome.revision);
        showBackendMessage("success", "Черновик сохранён.");
      } catch (error) {
        showRepositoryError(error);
      }
      return;
    }

    const requestId = writeRequests.current.begin("publish");
    setIsPublishPending(true);
    const isCurrentRequest = () =>
      isScreenMounted.current &&
      writeRequests.current.isCurrent("publish", requestId) &&
      activeHeroId.current === heroId;

    try {
      let resultingRevision: number;
      const expectedRevision = serverRevisions.current.get(heroId);

      if (initialMode === "edit") {
        if (expectedRevision === null) {
          showBackendMessage("error", "Загрузите актуальный серверный билд перед сохранением.");
          return;
        }
        const outcome = await runBuilderUpdateCommand({
          buildSet,
          client,
          expectedRevision,
          heroId,
        });
        if (outcome.kind !== "success") throw outcome.error;
        resultingRevision = outcome.revision;
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
        const outcome = await runBuilderPublishCommand({
          buildSet,
          client,
          expectedRevision,
          heroId,
        });
        if (outcome.kind !== "success") throw outcome.error;
        resultingRevision = outcome.revision;
      }

      if (isCurrentRequest()) {
        serverRevisions.current.set(heroId, resultingRevision);
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

      const didCommitEditSnapshot =
        initialMode === "edit" && preparedEditBuild
          ? commitPreparedTargetBuild(preparedEditBuild)
          : true;

      const didRefreshHeroStatusIds = await loadHeroStatusIds({
        preserveCurrentIdsOnError: true,
      });

      if (!isCurrentRequest()) {
        return;
      }

      const isCurrentEditSnapshot =
        didCommitEditSnapshot &&
        (!preparedEditBuild || isPreparedTargetBuildCurrent(preparedEditBuild));

      if (!isCurrentEditSnapshot) {
        showBackendMessage(
          "error",
          "Билд обновлён на сервере, но форма уже изменилась.",
        );
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
        writeRequests.current.finish("publish", requestId);
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

      serverRevisions.current.set(selectedHeroId, record?.revision ?? null);
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

    if (
      hasUnsavedPublishedEdits &&
      !(await confirmDiscardTransition())
    ) {
      return;
    }

    if (!isScreenMounted.current || authTransitionInFlight.current) {
      return;
    }

    authTransitionInFlight.current = true;
    const requestId = authRequestId.current + 1;
    authRequestId.current = requestId;
    const shouldRetryInitialEditLoad = initialEditLoadInFlight.current;
    setIsAuthPending(true);
    setToast(null);
    cancelEntityLoads();
    resetTabSave();
    resetPublish();
    invalidateHeroStatusList();
    const isCurrentRequest = () =>
      isScreenMounted.current && requestId === authRequestId.current;

    const client = getSupabaseClient();

    const resetSuccessfulEditSession = () => {
      if (initialMode !== "edit") {
        return;
      }

      loadedEditHeroId.current = null;
      activeHeroId.current = null;
      serverRevisions.current.clear();
      resetBuilderSession();
    };

    if (!client) {
      if (isCurrentRequest()) {
        resetSuccessfulEditSession();
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

      resetSuccessfulEditSession();
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

    if (
      hasUnsavedPublishedEdits &&
      !(await confirmDiscardTransition())
    ) {
      return;
    }

    if (!isScreenMounted.current || isHeroSelectionBlocked()) {
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
      serverRevisions.current.set(heroId, null);
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
      serverRevisions.current.set(heroId, draftRecord.revision);
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

  if (!isAuthChecked) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Builder" fallbackHref="/" />
        <View
          style={[
            styles.initialLoader,
            { paddingTop: SCREEN_HEADER_HEIGHT + top + 10 },
          ]}
        >
          <ScreenLoader label="Проверяем доступ" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Builder"
        fallbackHref="/"
        onBeforeBack={confirmDiscardChanges}
      />
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

          {!isAuthPending && !shouldHideHeroDuringRestoredEdit ? (
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
            <ScreenLoader
              label={
                isEditBuildLoading || isInitialEditTransitionPending
                  ? "Загружаем билд..."
                  : isDraftLoadPending
                  ? "Загружаем черновик..."
                  : "Завершаем авторизацию..."
              }
              mode="inline"
            />
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
                  errors={visibleValidationErrors}
                  isDirty={isDirty}
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
                  mode={initialMode}
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
  initialLoader: {
    flex: 1,
  },
  divinitySkillErrors: {
    width: "100%",
    marginTop: 8,
  },
});

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
