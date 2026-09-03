import { useCallback, useEffect, useRef } from "react";
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DivinitySkillLoadoutSection } from "@/features/builds";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { ScreenLoader } from "@/shared/ui/ScreenLoader";
import { StatusToast } from "@/shared/ui/StatusToast";

import { AdminAuthPanel } from "../components/AdminAuthPanel";
import { BranchGridSection } from "../components/branch-builder/BranchGridSection";
import { BuildTargetSection } from "../components/branch-builder/BuildTargetSection";
import { EquipmentBuilderSection } from "../components/branch-builder/EquipmentBuilderSection";
import { HeroBuilderSection } from "../components/branch-builder/HeroBuilderSection";
import { WeaponAwakeningSection } from "../components/branch-builder/WeaponAwakeningSection";
import { BuilderActions } from "../components/BuilderActions";
import { ValidationErrorMessages } from "../components/ValidationErrorMessages";
import {
  useDivinityBranchBuilderController,
  type UseDivinityBranchBuilderControllerOptions,
} from "../hooks/useDivinityBranchBuilderController";
import type { ValidationScrollSection } from "../model/validationNavigation";

const SCREEN_PADDING = 20;
const SCROLL_TARGET_TOP_GAP = 14;

export type DivinityBranchBuilderScreenProps = Omit<
  UseDivinityBranchBuilderControllerOptions,
  "initialMode"
> & {
  initialMode?: UseDivinityBranchBuilderControllerOptions["initialMode"];
};

export function DivinityBranchBuilderScreen(
  props: DivinityBranchBuilderScreenProps = {},
) {
  const initialMode = props.initialMode ?? "create";
  const controller = useDivinityBranchBuilderController({
    ...props,
    initialMode,
  });
  const { top, bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionYByKey = useRef<Partial<Record<ValidationScrollSection, number>>>(
    {},
  );
  const { actions, auth, catalogs, editor, heroLists, status } = controller;

  const scrollToPendingTarget = useCallback(() => {
    const target = status.pendingValidationTarget;

    if (!target) {
      return;
    }

    if (target === "top") {
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
      actions.acknowledgeValidationTarget();
      return;
    }

    const sectionY = sectionYByKey.current[target];

    if (typeof sectionY !== "number") {
      return;
    }

    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(
        0,
        sectionY - SCREEN_HEADER_HEIGHT - top - SCROLL_TARGET_TOP_GAP,
      ),
    });
    actions.acknowledgeValidationTarget();
  }, [actions, status.pendingValidationTarget, top]);

  useEffect(() => {
    scrollToPendingTarget();
  }, [scrollToPendingTarget]);

  const handleSectionLayout =
    (section: ValidationScrollSection) => (event: LayoutChangeEvent) => {
      sectionYByKey.current[section] = event.nativeEvent.layout.y;
      scrollToPendingTarget();
    };

  if (!auth.isChecked) {
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
        onBeforeBack={controller.confirmDiscardTransition}
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
            adminEmail={auth.session?.email}
            isPending={auth.isPending}
            onSignIn={(credentials) => {
              void auth.signIn(credentials);
            }}
            onSignOut={() => {
              void auth.signOut();
            }}
          />
        </View>

        {status.backendStatus ? (
          <View style={styles.section}>
            <Text style={styles.backendStatus}>{status.backendStatus}</Text>
          </View>
        ) : null}

        {auth.session ? (
          <>
            {!status.isTransitionPending ? (
              <View
                onLayout={handleSectionLayout("targetTabs")}
                style={styles.section}
                testID="branch-builder-target-tabs-section"
              >
                <BuildTargetSection
                  childTabs={editor.buildTargetChildTabs}
                  errors={status.targetTabErrors}
                  onSelectChildTab={actions.selectChildTab}
                  onSelectTab={actions.selectTopTab}
                  selectedChildTabId={editor.selectedChildTabId}
                  selectedTabId={editor.selectedTopTabId}
                  tabs={editor.buildTargetTopTabs}
                />
              </View>
            ) : null}

            {!auth.isPending && !status.shouldHideHeroDuringRestoredEdit ? (
              <View
                onLayout={handleSectionLayout("hero")}
                style={styles.section}
                testID="branch-builder-hero-section"
              >
                <HeroBuilderSection
                  errors={status.heroErrors}
                  heroListError={status.heroListError}
                  isDraftLoadPending={status.isDraftLoadPending}
                  isHeroListLoading={status.isHeroListLoading}
                  notCreatedHeroes={heroLists.notCreatedHeroes}
                  notPublishedHeroes={heroLists.notPublishedHeroes}
                  onRetryHeroList={actions.retryHeroStatusList}
                  onSelectHero={(heroId) => void actions.selectHero(heroId)}
                  selectedHero={editor.selectedHero}
                  selectedHeroId={editor.selectedHeroId}
                />
              </View>
            ) : null}

            {status.isTransitionPending ? (
              <ScreenLoader
                label={
                  status.isEditBuildLoading ||
                  status.isInitialEditTransitionPending
                    ? "Загружаем билд..."
                    : status.isDraftLoadPending
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
                    artifactErrors={status.artifactErrors}
                    artifacts={catalogs.artifacts}
                    onAddArtifact={actions.addArtifact}
                    onAddRune={actions.addRune}
                    onRemoveArtifact={actions.removeArtifact}
                    onRemoveRune={actions.removeRune}
                    runeErrors={status.runeErrors}
                    runes={catalogs.runes}
                    selectedArtifactIds={editor.selectedArtifactIds}
                    selectedRuneIds={editor.selectedRuneIds}
                  />
                </View>

                <View
                  onLayout={handleSectionLayout("weaponAwakening")}
                  style={styles.section}
                  testID="branch-builder-weapon-awakening-section"
                >
                  <WeaponAwakeningSection
                    bonuses={editor.weaponAwakeningBonuses}
                    colors={catalogs.weaponAwakeningColors}
                    errors={status.weaponAwakeningErrors}
                    onCycleSlot={actions.cycleWeaponAwakeningSlot}
                    selectedHero={editor.selectedHero}
                    selections={editor.weaponAwakeningSelections}
                    slots={catalogs.weaponAwakeningSlots}
                  />
                </View>

                <View
                  onLayout={handleSectionLayout("divinitySkills")}
                  style={styles.section}
                  testID="branch-builder-divinity-skills-section"
                >
                  <DivinitySkillLoadoutSection
                    awakenedEnabled={
                      editor.selectedDivinitySkills.awakenedEnabled
                    }
                    awakenedSkillIds={editor.selectedDivinitySkills.awakened}
                    availableSkillIds={editor.selectedTreeSkillIds}
                    baseSkillIds={editor.selectedDivinitySkills.base}
                    branches={catalogs.branches}
                    onSelectSkill={actions.selectDivinitySkill}
                    onShowAwakened={actions.showAwakenedDivinitySkills}
                    skills={catalogs.skills}
                  />
                  <View
                    style={styles.divinitySkillErrors}
                    testID="branch-builder-divinity-skill-errors"
                  >
                    <ValidationErrorMessages
                      messages={status.divinitySkillErrors}
                    />
                  </View>
                </View>

                <View
                  onLayout={handleSectionLayout("branchGrid")}
                  style={styles.section}
                  testID="branch-builder-branch-grid-section"
                >
                  <BranchGridSection
                    activeMajorSlot={editor.activeMajorSlot}
                    branches={catalogs.branches}
                    columns={catalogs.columns}
                    errors={status.branchGridErrors}
                    onOpenMajorSlot={actions.openMajorSlot}
                    onSelectMajorSkill={actions.selectMajorSkill}
                    onSelectBranch={actions.selectBranch}
                    onToggleProgress={actions.toggleProgress}
                    progressLevels={editor.progressLevels}
                    selectedBranches={editor.selectedBranches}
                    selectedMajorSkills={editor.selectedMajorSkills}
                    skills={catalogs.skills}
                    template={catalogs.template}
                  />
                </View>

                <View
                  onLayout={handleSectionLayout("actions")}
                  style={styles.section}
                  testID="branch-builder-actions-section"
                >
                  <BuilderActions
                    backendStatus={status.backendStatus}
                    isDirty={editor.isDirty}
                    isPublishPending={status.isPublishPending}
                    isTabSavePending={status.isTabSavePending}
                    onPublish={() => {
                      void actions.publishOrUpdate();
                    }}
                    onSaveCurrentTab={() => {
                      void actions.saveCurrentTab();
                    }}
                    mode={initialMode}
                  />
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>
      {status.toast ? (
        <StatusToast
          kind={status.toast.kind}
          message={status.toast.message}
          onDismiss={actions.dismissToast}
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
