import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import {
  fetchDraftHeroBuildSetRecord,
  fetchHeroBuildSetStatusIds,
  fetchPublishedHeroBuildSet,
  fetchPublishedHeroBuildSetRecord,
  getMissingPreviousMajorSkillLevel,
  HeroBuildSetRepositoryError,
  isBranchSelectionAllowed,
  getHeroBuildSupabaseClient,
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

import { useAdminSessionGate } from "./useAdminSessionGate";
import { useDivinityBranchBuilder } from "./useDivinityBranchBuilder";
import { useHeroBuildStatusQuery } from "./useHeroBuildStatusQuery";
import { getBranchBuilderTargetTabs } from "../model/branchBuilderTabs";
import { getBuilderHeroLists } from "../model/heroGuideSelector";
import {
  areTabPathsEqual,
  formatValidationToastMessage,
  getErrorMessages,
  getRelativeValidationErrors,
  getValidationScrollTarget,
  isTargetTabErrorPath,
  type PendingValidationScrollTarget,
} from "../model/validationNavigation";
import { BuilderAsyncController } from "../model/asyncRequestIdentity";
import type {
  BranchBuildValidationError,
  BranchColumnId,
  HeroBuildTargetTabPath,
} from "../types/admin.types";
import {
  MIN_BRANCH_PROGRESS_LEVEL,
  validateBranchBuild,
} from "../utils/validateBranchBuild";
import {
  getCurrentAdminSession,
  signInAdmin,
  signOutAdmin,
  type AdminSession,
} from "@/features/auth";
import { hasCreatePublicationConflict } from "../model/publicationRules";
import {
  BuilderRevisionStore,
  runBuilderDraftCommand,
  runBuilderPublishCommand,
  runBuilderUpdateCommand,
} from "../api/builderServerCommands";

const MISSING_PREVIOUS_BRANCH_SKILL_MESSAGE =
  "Сначала выберите навык выше в этой ветке.";
type BuilderMode = "create" | "edit";
type StatusToastState = {
  kind: "success" | "error";
  message: string;
} | null;

export type UseDivinityBranchBuilderControllerOptions = {
  initialAdminSession?: AdminSession | null;
  initialHeroId?: string | null;
  initialMode: BuilderMode;
};

export function useDivinityBranchBuilderController({
  initialAdminSession,
  initialHeroId = null,
  initialMode,
}: UseDivinityBranchBuilderControllerOptions) {
  const loadedEditHeroId = useRef<string | null>(null);
  const asyncController = useRef(new BuilderAsyncController());
  const activeHeroId = useRef<string | null>(null);
  const serverRevisions = useRef(new BuilderRevisionStore());
  const isControllerMounted = useRef(true);
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
    getClient: getHeroBuildSupabaseClient,
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
  const [pendingValidationTarget, setPendingValidationTarget] =
    useState<PendingValidationScrollTarget | null>(null);
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
    getClient: getHeroBuildSupabaseClient,
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
      asyncController.current.isInFlight("initialEditLoad") ||
      asyncController.current.isInFlight("draftLoad") ||
      asyncController.current.isInFlight("auth"),
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
      asyncController.current.isInFlight("draftLoad") ||
      asyncController.current.isInFlight("auth"),
    [isAuthPending, isDraftLoadPending],
  );

  const resetTabSave = useCallback(() => {
    asyncController.current.invalidate("tabSave");
    setIsTabSavePending(false);
  }, []);

  const resetPublish = useCallback(() => {
    asyncController.current.invalidate("publish");
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
      return isControllerMounted.current;
    }

    if (!isControllerMounted.current) {
      return false;
    }

    const requestId = asyncController.current.tryBegin("discard");
    if (requestId === null) return false;

    try {
      const isConfirmed = await confirmDiscardChanges();

      return (
        isConfirmed &&
        isControllerMounted.current &&
        asyncController.current.isCurrent("discard", requestId)
      );
    } catch {
      return false;
    } finally {
      if (isControllerMounted.current) {
        asyncController.current.finish("discard", requestId);
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
    isControllerMounted.current = true;

    return () => {
      isControllerMounted.current = false;
      asyncController.current.invalidateAll();
    };
  }, []);

  const cancelEntityLoads = useCallback(() => {
    asyncController.current.invalidate(
      "entity",
      "initialEditLoad",
      "draftLoad",
    );
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

    const initialLoadRequestId = asyncController.current.tryBegin(
      "initialEditLoad",
    );
    if (initialLoadRequestId === null) return;
    const entityRequestId = asyncController.current.begin("entity");
    const client = getHeroBuildSupabaseClient();
    const isCurrentRequest = () =>
      isControllerMounted.current &&
      asyncController.current.isCurrent("entity", entityRequestId) &&
      asyncController.current.isCurrent(
        "initialEditLoad",
        initialLoadRequestId,
      );

    loadedEditHeroId.current = initialHeroId;
    resetTabSave();
    resetPublish();
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

      asyncController.current.finish("entity", entityRequestId);
      asyncController.current.finish("initialEditLoad", initialLoadRequestId);
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
          asyncController.current.finish("entity", entityRequestId);
          asyncController.current.finish(
            "initialEditLoad",
            initialLoadRequestId,
          );
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

  const showValidationErrors = (
    errors: readonly BranchBuildValidationError[],
  ) => {
    setValidationErrorTabPath(null);
    setValidationErrors([...errors]);

    setPendingValidationTarget(
      errors.length > 0 ? getValidationScrollTarget(errors) : null,
    );
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
    setPendingValidationTarget(firstInvalid.section);
    selectTargetTabPath(firstInvalid.tabPath);
  };

  useEffect(() => {
    if (
      validationErrorTabPath &&
      !areTabPathsEqual(validationErrorTabPath, targetTabPath)
    ) {
      setPendingValidationTarget(null);
      setValidationErrors([]);
      setValidationErrorTabPath(null);
    }
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
      asyncController.current.isInFlight("tabSave") ||
      asyncController.current.isInFlight("publish")
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

    const client = getHeroBuildSupabaseClient();
    const prepared = prepareCurrentTargetBuild();

    if (!client || !prepared || !selectedHeroId) {
      showBackendMessage(
        "error",
        client ? "Не удалось собрать вкладку." : "Supabase не настроен.",
      );
      return;
    }

    const requestId = asyncController.current.begin("tabSave");
    setIsTabSavePending(true);
    const isCurrentRequest = () =>
      isControllerMounted.current &&
      asyncController.current.isCurrent("tabSave", requestId) &&
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
        asyncController.current.finish("tabSave", requestId);
        setIsTabSavePending(false);
      }
    }
  };

  const handlePublishOrUpdateBuildSet = async () => {
    if (
      isBuilderActionBlocked() ||
      asyncController.current.isInFlight("tabSave") ||
      asyncController.current.isInFlight("publish")
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
        "Сначала исправьте ошибки полного билда.",
      );
      return;
    }

    showValidationErrors([]);

    const client = getHeroBuildSupabaseClient();

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

    const requestId = asyncController.current.begin("publish");
    setIsPublishPending(true);
    const isCurrentRequest = () =>
      isControllerMounted.current &&
      asyncController.current.isCurrent("publish", requestId) &&
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
        asyncController.current.finish("publish", requestId);
        setIsPublishPending(false);
      }
    }
  };

  const handleAdminSignIn = async (credentials: {
    email: string;
    password: string;
  }) => {
    const requestId = asyncController.current.tryBegin("auth");
    if (requestId === null) return;
    setIsAuthPending(true);
    setToast(null);
    const isCurrentRequest = () =>
      isControllerMounted.current &&
      asyncController.current.isCurrent("auth", requestId);

    const client = getHeroBuildSupabaseClient();

    if (!client) {
      if (isCurrentRequest()) {
        setToast({ kind: "error", message: "Supabase не настроен." });
        asyncController.current.finish("auth", requestId);
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
        asyncController.current.finish("auth", requestId);
        setIsAuthPending(false);
      }
    }
  };

  const handleAdminSignOut = async () => {
    if (asyncController.current.isInFlight("auth")) {
      return;
    }

    if (
      hasUnsavedPublishedEdits &&
      !(await confirmDiscardTransition())
    ) {
      return;
    }

    if (!isControllerMounted.current) {
      return;
    }

    const requestId = asyncController.current.tryBegin("auth");
    if (requestId === null) return;
    const shouldRetryInitialEditLoad =
      asyncController.current.isInFlight("initialEditLoad");
    setIsAuthPending(true);
    setToast(null);
    cancelEntityLoads();
    resetTabSave();
    resetPublish();
    invalidateHeroStatusList();
    const isCurrentRequest = () =>
      isControllerMounted.current &&
      asyncController.current.isCurrent("auth", requestId);

    const client = getHeroBuildSupabaseClient();

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
        asyncController.current.finish("auth", requestId);
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
        asyncController.current.finish("auth", requestId);
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

    if (!isControllerMounted.current || isHeroSelectionBlocked()) {
      return;
    }

    resetTabSave();
    resetPublish();
    asyncController.current.invalidate("initialEditLoad", "draftLoad");
    const entityRequestId = asyncController.current.begin("entity");
    setIsEditBuildLoading(false);
    clearValidationErrors(isHeroErrorPath);

    if (!heroStatusIds.draftHeroIds.includes(heroId)) {
      serverRevisions.current.set(heroId, null);
      selectHero(heroId);
      activeHeroId.current = heroId;
      asyncController.current.finish("entity", entityRequestId);
      return;
    }

    const client = getHeroBuildSupabaseClient();
    if (!client) {
      asyncController.current.finish("entity", entityRequestId);
      return;
    }
    const draftRequestId = asyncController.current.tryBegin("draftLoad");
    if (draftRequestId === null) {
      asyncController.current.finish("entity", entityRequestId);
      return;
    }

    setIsDraftLoadPending(true);

    const isCurrentRequest = () =>
      isControllerMounted.current &&
      asyncController.current.isCurrent("entity", entityRequestId) &&
      asyncController.current.isCurrent("draftLoad", draftRequestId);

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
        asyncController.current.finish("entity", entityRequestId);
        asyncController.current.finish("draftLoad", draftRequestId);
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

    if (selectedBranches[columnId] === branchId) {
      return;
    }

    if (
      branchId &&
      !isBranchSelectionAllowed(selectedBranches, columnId, branchId)
    ) {
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

  const canUseBranchLevel = (columnId: BranchColumnId, level: number) => {
    if (isBuilderActionBlocked()) {
      return false;
    }

    if (
      getMissingPreviousMajorSkillLevel(
        branchBuilderTemplate,
        selectedMajorSkills,
        columnId,
        level,
      ) === null
    ) {
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

  const retryHeroStatusList = () => {
    if (!isBuilderActionBlocked()) {
      void loadHeroStatusIds();
    }
  };

  return {
    auth: {
      isChecked: isAuthChecked,
      isPending: isAuthPending,
      session: adminSession,
      signIn: handleAdminSignIn,
      signOut: handleAdminSignOut,
    },
    catalogs: {
      artifacts: branchBuilderArtifacts,
      branches: branchBuilderBranches,
      columns: branchBuilderColumns,
      runes: branchBuilderRunes,
      skills: branchBuilderSkills,
      template: branchBuilderTemplate,
      weaponAwakeningColors: branchBuilderWeaponAwakeningColors,
      weaponAwakeningSlots: branchBuilderWeaponAwakeningSlots,
    },
    editor: {
      activeMajorSlot,
      buildTargetChildTabs,
      buildTargetTopTabs,
      isDirty,
      progressLevels,
      selectedArtifactIds,
      selectedBranches,
      selectedChildTabId,
      selectedDivinitySkills,
      selectedHero,
      selectedHeroId,
      selectedMajorSkills,
      selectedRuneIds,
      selectedTopTabId,
      selectedTreeSkillIds,
      weaponAwakeningBonuses,
      weaponAwakeningSelections,
    },
    status: {
      artifactErrors,
      backendStatus,
      branchGridErrors,
      divinitySkillErrors,
      heroErrors,
      heroListError,
      isDraftLoadPending,
      isEditBuildLoading,
      isHeroListLoading,
      isInitialEditTransitionPending,
      isPublishPending,
      isTabSavePending,
      isTransitionPending: isBuilderTransitionPending,
      pendingValidationTarget,
      runeErrors,
      shouldHideHeroDuringRestoredEdit,
      targetTabErrors,
      toast,
      weaponAwakeningErrors,
    },
    heroLists,
    actions: {
      acknowledgeValidationTarget: () => setPendingValidationTarget(null),
      addArtifact: handleAddArtifact,
      addRune: handleAddRune,
      cycleWeaponAwakeningSlot: handleCycleWeaponAwakeningSlot,
      dismissToast: () => setToast(null),
      openMajorSlot: handleOpenMajorSlot,
      publishOrUpdate: handlePublishOrUpdateBuildSet,
      removeArtifact: handleRemoveArtifact,
      removeRune: handleRemoveRune,
      retryHeroStatusList,
      saveCurrentTab: handleSaveCurrentTargetBuild,
      selectBranch: handleSetColumnBranch,
      selectChildTab: handleSelectChildTab,
      selectDivinitySkill: handleSetDivinitySkill,
      selectHero: handleSelectHero,
      selectMajorSkill: handleSetMajorSkill,
      selectTopTab: handleSelectTopTab,
      showAwakenedDivinitySkills: handleShowAwakenedDivinitySkills,
      toggleProgress: handleToggleProgress,
    },
    confirmDiscardTransition,
  };
}

export type DivinityBranchBuilderController = ReturnType<
  typeof useDivinityBranchBuilderController
>;

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
    divinitySkills.base.some(Boolean) ||
    divinitySkills.awakened.some(Boolean)
  );
}

function getMajorNodePath(columnId: BranchColumnId, level: number): string {
  return `majorNodes.${columnId}.${level}`;
}
