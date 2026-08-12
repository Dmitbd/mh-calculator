# Server-Saved Hero Builder Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist individually validated builder tabs as resumable Supabase drafts, show separate `Не созданы` and `Не опубликованы` hero lists, and delete the draft after successful full publication.

**Architecture:** Extend the existing `hero_build_sets` repository with status-aware reads and draft-only deletion; no database migration is needed. Keep partial-build assembly in the builder hook, list derivation in a pure admin model, and network orchestration in `DivinityBranchBuilderScreen`; the selector remains presentational. Publication continues to use the existing full-build validation and writes `published` before attempting draft cleanup.

**Tech Stack:** Expo 56, React 19, React Native 0.85, TypeScript 6, Supabase JS 2, Jest 29, Testing Library React Native.

## Global Constraints

- Use the existing `public.hero_build_sets` table and its `(hero_id, status)` primary key; do not add a migration or another table.
- A draft may contain any non-empty subset of valid target leaf tabs; missing leaf tabs remain `build: null`.
- `Сохранить вкладку` must validate only the active tab and must not send a request when it is invalid.
- Local saved-tab state changes only after the draft upsert succeeds.
- `Опубликовать` keeps the current complete multi-tab validation gate.
- Publication order is fixed: upsert `published`, delete only the matching `draft`, refresh status ids.
- A failed publication preserves the draft; a failed cleanup never makes a published hero appear in either create list.
- Do not change public hero-guide loading, authentication, RLS, branch-depth validation, or required target tabs.
- Use stable hero ids as relationship keys and preserve the established UR-first / SSR-by-faction ordering.
- Follow strict RED-GREEN-REFACTOR: every production behavior starts with a focused failing test that is observed failing for the expected reason.

---

## File Structure

- `src/features/builds/api/heroBuildSetRepository.ts`: status-aware Supabase queries and draft-only deletion.
- `src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`: repository query contracts and error propagation.
- `src/features/builds/index.ts`: public exports for the new repository functions and types.
- `src/features/admin/model/heroGuideSelector.ts`: pure derivation of `notCreatedHeroes` and `notPublishedHeroes`.
- `src/features/admin/__tests__/heroGuideSelectorModel.test.ts`: mutually exclusive list-state rules.
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`: prepare a partial server snapshot without committing local saved state, then commit it after success.
- `src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`: partial snapshot and delayed-commit behavior.
- `src/features/admin/components/HeroGuideSelector.tsx`: render the two prepared hero lists and draft-load pending state.
- `src/features/admin/components/branch-builder/HeroBuilderSection.tsx`: pass the two lists and selected catalog hero to the selector.
- `src/features/admin/__tests__/HeroGuideSelector.test.tsx`: list headings, ordering, empty states, and pending interaction.
- `src/features/admin/components/DownloadJsonButton.tsx`: save-pending label and mutual action disabling.
- `src/features/admin/components/branch-builder/DownloadSection.tsx`: forward save-pending state.
- `src/features/admin/__tests__/DownloadJsonButton.test.tsx`: pending button behavior.
- `src/features/admin/api/saveAdminHeroBuildSet.ts`: publish-first, cleanup-second operation with an explicit cleanup outcome.
- `src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts`: publication ordering and failure boundaries.
- `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`: combined catalog loading, draft resume, server tab save, publication, refresh, and user feedback.
- `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`: end-to-end admin orchestration behavior.

---

### Task 1: Add Status-Aware Draft Repository Operations

**Files:**
- Modify: `src/features/builds/api/heroBuildSetRepository.ts`
- Modify: `src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`
- Modify: `src/features/builds/index.ts`

**Interfaces:**
- Produces: `HeroBuildSetStatusIds = { draftHeroIds: string[]; publishedHeroIds: string[] }`.
- Produces: `fetchHeroBuildSetStatusIds(client): Promise<HeroBuildSetStatusIds>`.
- Produces: `fetchDraftHeroBuildSet(client, heroId): Promise<HeroBuildSet | null>`.
- Produces: `deleteDraftHeroBuildSet(client, heroId): Promise<void>`.
- Preserves: `fetchPublishedHeroBuildSet`, `fetchPublishedHeroIds`, `saveHeroBuildSet`, `deleteHeroBuildSet`, and `loadPublishedHeroBuildSet` for existing callers.

- [ ] **Step 1: Write failing repository tests for combined status ids**

Add this import and test to `heroBuildSetRepository.test.ts`:

```ts
import {
  deleteDraftHeroBuildSet,
  fetchDraftHeroBuildSet,
  fetchHeroBuildSetStatusIds,
} from "../heroBuildSetRepository";

it("fetches draft and published hero ids in one status catalog query", async () => {
  const query = createQueryResult({
    data: [
      { hero_id: "bastet", status: "draft" },
      { hero_id: "morana", status: "published" },
      { hero_id: "bastet", status: "published" },
    ],
    error: null,
  });
  const client = { from: jest.fn(() => query) };

  await expect(fetchHeroBuildSetStatusIds(client)).resolves.toEqual({
    draftHeroIds: ["bastet"],
    publishedHeroIds: ["morana", "bastet"],
  });
  expect(query.select).toHaveBeenCalledWith("hero_id,status");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`

Expected: FAIL because `fetchHeroBuildSetStatusIds` is not exported.

- [ ] **Step 3: Implement the status catalog contract**

Add the row/type and function to `heroBuildSetRepository.ts`:

```ts
type HeroBuildSetStatusRow = {
  hero_id: string;
  status: HeroBuildSetStatus;
};

export type HeroBuildSetStatusIds = {
  draftHeroIds: string[];
  publishedHeroIds: string[];
};

export async function fetchHeroBuildSetStatusIds(
  client: HeroBuildSetSupabaseClient,
): Promise<HeroBuildSetStatusIds> {
  const { data, error } = await (client
    .from("hero_build_sets")
    .select("hero_id,status") as unknown as Promise<
    QueryResult<HeroBuildSetStatusRow[]>
  >);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<HeroBuildSetStatusIds>(
    (ids, row) => {
      if (row.status === "draft") {
        ids.draftHeroIds.push(row.hero_id);
      } else {
        ids.publishedHeroIds.push(row.hero_id);
      }
      return ids;
    },
    { draftHeroIds: [], publishedHeroIds: [] },
  );
}
```

Export the function and type from `src/features/builds/index.ts`.

- [ ] **Step 4: Verify the status catalog test is GREEN**

Run: `npm test -- --runInBand src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`

Expected: PASS for the new status-catalog test and every existing repository test.

- [ ] **Step 5: Write failing tests for draft fetch and draft-only deletion**

```ts
it("fetches only the draft build set for a hero", async () => {
  const query = createQueryResult({ data: { payload: buildSet }, error: null });
  const client = { from: jest.fn(() => query) };

  await expect(fetchDraftHeroBuildSet(client, "bastet")).resolves.toEqual(buildSet);
  expect(query.select).toHaveBeenCalledWith("payload");
  expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
  expect(query.eq).toHaveBeenCalledWith("status", "draft");
  expect(query.maybeSingle).toHaveBeenCalledTimes(1);
});

it("deletes only the draft row for one hero", async () => {
  const query = createQueryResult({ data: null, error: null });
  const client = { from: jest.fn(() => query) };

  await deleteDraftHeroBuildSet(client, "bastet");
  expect(query.delete).toHaveBeenCalledTimes(1);
  expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
  expect(query.eq).toHaveBeenCalledWith("status", "draft");
});
```

- [ ] **Step 6: Run the focused test and verify RED**

Run: `npm test -- --runInBand src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`

Expected: FAIL because both draft functions are missing.

- [ ] **Step 7: Implement draft fetch and deletion**

```ts
export async function fetchDraftHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<HeroBuildSet | null> {
  const { data, error } = await client
    .from("hero_build_sets")
    .select("payload")
    .eq("hero_id", heroId)
    .eq("status", "draft")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.payload ?? null;
}

export async function deleteDraftHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<void> {
  const { error } = await (client
    .from("hero_build_sets")
    .delete()
    .eq("hero_id", heroId)
    .eq("status", "draft") as unknown as Promise<QueryResult<unknown>>);

  if (error) throw new Error(error.message);
}
```

Export both functions from `src/features/builds/index.ts`.

- [ ] **Step 8: Add error-path assertions and run GREEN**

Add:

```ts
it("throws when the status catalog cannot be loaded", async () => {
  const query = createQueryResult({ data: null, error: { message: "network down" } });
  await expect(fetchHeroBuildSetStatusIds({ from: jest.fn(() => query) })).rejects.toThrow("network down");
});

it("throws when a draft cannot be loaded", async () => {
  const query = createQueryResult({ data: null, error: { message: "network down" } });
  await expect(fetchDraftHeroBuildSet({ from: jest.fn(() => query) }, "bastet")).rejects.toThrow("network down");
});

it("throws when a draft cannot be deleted", async () => {
  const query = createQueryResult({ data: null, error: { message: "network down" } });
  await expect(deleteDraftHeroBuildSet({ from: jest.fn(() => query) }, "bastet")).rejects.toThrow("network down");
});
```

Then run:

Run: `npm test -- --runInBand src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`

Expected: PASS, including readable `network down` rejections.

- [ ] **Step 9: Commit the repository contract**

```bash
git add src/features/builds/api/heroBuildSetRepository.ts src/features/builds/api/__tests__/heroBuildSetRepository.test.ts src/features/builds/index.ts
git commit -m "feat: добавить API серверных черновиков"
```

---

### Task 2: Derive Mutually Exclusive Hero Lists

**Files:**
- Modify: `src/features/admin/model/heroGuideSelector.ts`
- Modify: `src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

**Interfaces:**
- Consumes: local `Hero[]`, `draftHeroIds`, and `publishedHeroIds`.
- Produces: `BuilderHeroLists` and `getBuilderHeroLists(params): BuilderHeroLists`.
- Preserves: `getHeroGuideSelectorSections()` for grouping either list.

- [ ] **Step 1: Replace the old availability test with failing two-list tests**

```ts
import { getBuilderHeroLists } from "../model/heroGuideSelector";

it("separates not-created and unfinished heroes", () => {
  const lists = getBuilderHeroLists({
    heroes,
    draftHeroIds: ["ssr-open"],
    publishedHeroIds: ["published"],
  });

  expect(lists.notCreatedHeroes.map(({ id }) => id)).toEqual([
    "ur-open",
    "ssr-multi",
  ]);
  expect(lists.notPublishedHeroes.map(({ id }) => id)).toEqual(["ssr-open"]);
});

it("lets published status dominate a stale draft", () => {
  const lists = getBuilderHeroLists({
    heroes,
    draftHeroIds: ["published"],
    publishedHeroIds: ["published"],
  });

  expect(lists.notCreatedHeroes).toEqual(heroes.filter(({ id }) => id !== "published"));
  expect(lists.notPublishedHeroes).toEqual([]);
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `npm test -- --runInBand src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

Expected: FAIL because `getBuilderHeroLists` does not exist.

- [ ] **Step 3: Implement list derivation**

```ts
export type BuilderHeroLists = {
  notCreatedHeroes: Hero[];
  notPublishedHeroes: Hero[];
};

export function getBuilderHeroLists(params: {
  heroes: readonly Hero[];
  draftHeroIds: readonly string[];
  publishedHeroIds: readonly string[];
}): BuilderHeroLists {
  const draftIds = new Set(params.draftHeroIds);
  const publishedIds = new Set(params.publishedHeroIds);

  return params.heroes.reduce<BuilderHeroLists>(
    (lists, hero) => {
      if (publishedIds.has(hero.id)) return lists;
      if (draftIds.has(hero.id)) lists.notPublishedHeroes.push(hero);
      else lists.notCreatedHeroes.push(hero);
      return lists;
    },
    { notCreatedHeroes: [], notPublishedHeroes: [] },
  );
}
```

Remove `getSelectableBuilderHeroes` after its screen caller is migrated in Task 5; until then keep it to avoid breaking unrelated tests midway.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --runInBand src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

Expected: PASS for list derivation and the existing UR/SSR grouping test.

- [ ] **Step 5: Commit the pure model**

```bash
git add src/features/admin/model/heroGuideSelector.ts src/features/admin/__tests__/heroGuideSelectorModel.test.ts
git commit -m "feat: разделить состояния героев билдера"
```

---

### Task 3: Prepare Partial Draft Snapshots Before Committing Local State

**Files:**
- Modify: `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- Modify: `src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`

**Interfaces:**
- Produces: exported `PreparedTargetBuildSave`.
- Produces from hook: `prepareCurrentTargetBuild(createdAt?): PreparedTargetBuildSave | null`.
- Produces from hook: `commitPreparedTargetBuild(prepared): void`.
- `PreparedTargetBuildSave` contains `buildSet`, `exported`, and `nextSavedBuilds` from one explicit snapshot.

- [ ] **Step 1: Write a failing hook test for a partial next-state snapshot**

Use the existing `filledBuild()` hook-test helper, which fills a valid Western Queen tab, then add:

```ts
it("prepares the current valid tab as a partial build set without committing it", () => {
  const result = filledBuild();

  let prepared: ReturnType<typeof result.current.prepareCurrentTargetBuild>;
  act(() => {
    prepared = result.current.prepareCurrentTargetBuild("2026-08-12T10:00:00.000Z");
  });

  expect(prepared?.nextSavedBuilds.pvp.heroId).toBe("western-queen");
  expect(prepared?.buildSet.tabs[0].build?.heroId).toBe("western-queen");
  expect(prepared?.buildSet.tabs[1].children?.every((tab) => tab.build === null)).toBe(true);
  expect(result.current.savedBuildsByPath).toEqual({});
});
```

- [ ] **Step 2: Run the hook test and verify RED**

Run: `npm test -- --runInBand src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`

Expected: FAIL because `prepareCurrentTargetBuild` is missing.

- [ ] **Step 3: Implement preparation from an explicit next snapshot**

Add this exported type near `DraftsByPath`:

```ts
export type PreparedTargetBuildSave = {
  buildSet: HeroBuildSet;
  exported: DivinityBranchBuilderExport;
  nextSavedBuilds: SavedBuildsByPath;
};
```

Replace the state-writing body of `saveCurrentTargetBuild` with two callbacks:

```ts
const prepareCurrentTargetBuild = useCallback(
  (createdAt?: string): PreparedTargetBuildSave | null => {
    const exported = buildExport(createdAt);
    if (!exported) return null;

    const nextSavedBuilds = {
      ...savedBuildsByPath,
      [getBuildTargetPathKey(targetTabPath)]: toCommittedBuild(exported),
    };

    return {
      buildSet: buildHeroBuildSetFromSavedBuilds(buildTargetTabs, nextSavedBuilds),
      exported,
      nextSavedBuilds,
    };
  },
  [buildExport, savedBuildsByPath, targetTabPath],
);

const commitPreparedTargetBuild = useCallback(
  (prepared: PreparedTargetBuildSave) => {
    setSavedBuildsByPath(prepared.nextSavedBuilds);
    setDraftsByPath((current) => seedEmptyDrafts(current, prepared.exported));
  },
  [],
);
```

Expose both callbacks from the hook memo. Keep a temporary `saveCurrentTargetBuild` wrapper implemented as prepare + commit until Task 6 migrates the screen, then remove the wrapper.

- [ ] **Step 4: Verify partial snapshot GREEN**

Run: `npm test -- --runInBand src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`

Expected: PASS and no existing hook behavior regresses.

- [ ] **Step 5: Write and pass delayed-commit tests**

Add:

```ts
it("commits a prepared snapshot only when explicitly requested", () => {
  const result = filledBuild();
  const prepared = result.current.prepareCurrentTargetBuild("2026-08-12T10:00:00.000Z");

  act(() => result.current.commitPreparedTargetBuild(prepared!));

  expect(result.current.savedBuildsByPath.pvp?.heroId).toBe("western-queen");
  expect(result.current.savedBuildsByPath["pve/bosses"]).toBeUndefined();
});

it("preserves an earlier committed tab in the next prepared snapshot", () => {
  const result = filledBuild();
  const pvp = result.current.prepareCurrentTargetBuild("2026-08-12T10:00:00.000Z")!;
  act(() => {
    result.current.commitPreparedTargetBuild(pvp);
    result.current.setTargetTopTab("pve");
  });

  const bosses = result.current.prepareCurrentTargetBuild("2026-08-12T10:05:00.000Z")!;
  expect(bosses.nextSavedBuilds.pvp).toEqual(pvp.nextSavedBuilds.pvp);
  expect(bosses.nextSavedBuilds["pve/bosses"]).toBeTruthy();
});

it("cannot prepare an incomplete current tab", () => {
  const { result } = renderHook(() => useDivinityBranchBuilder(weaponAwakeningCatalog));
  expect(result.current.prepareCurrentTargetBuild()).toBeNull();
});
```

Run the same focused command and expect PASS.

- [ ] **Step 6: Commit the hook boundary**

```bash
git add src/features/admin/hooks/useDivinityBranchBuilder.ts src/features/admin/__tests__/useDivinityBranchBuilder.test.ts
git commit -m "feat: подготовить частичный черновик героя"
```

---

### Task 4: Render `Не созданы` And `Не опубликованы`

**Files:**
- Modify: `src/features/admin/components/HeroGuideSelector.tsx`
- Modify: `src/features/admin/components/branch-builder/HeroBuilderSection.tsx`
- Modify: `src/features/admin/__tests__/HeroGuideSelector.test.tsx`

**Interfaces:**
- Consumes: `notCreatedHeroes`, `notPublishedHeroes`, `selectedHero`, `isDraftLoadPending`, and the existing catalog loading/error callbacks.
- Produces: one selector panel with two titled lists; each list reuses `getHeroGuideSelectorSections` and existing hero cards.

- [ ] **Step 1: Rewrite test props and add failing list rendering tests**

Set default props to:

```ts
const props = {
  error: null,
  isDraftLoadPending: false,
  isLoading: false,
  notCreatedHeroes: [urHero],
  notPublishedHeroes: [ssrHero],
  onRetry: jest.fn(),
  onSelectHero: jest.fn(),
  selectedHero: null,
  selectedHeroId: null,
};
```

Add:

```ts
it("renders not-created before unfinished heroes", () => {
  render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  const labels = screen.getAllByText(/Не созданы|Не опубликованы/);
  expect(labels[0].props.children).toBe("Не созданы");
  expect(labels[1].props.children).toBe("Не опубликованы");
  expect(screen.getByLabelText(`Выбрать героя ${urHero.name.ru}`)).toBeTruthy();
  expect(screen.getByLabelText(`Выбрать героя ${ssrHero.name.ru}`)).toBeTruthy();
});

it("shows an explicit empty state for each empty list", () => {
  render(
    <HeroGuideSelector
      {...props}
      notCreatedHeroes={[]}
      notPublishedHeroes={[]}
    />,
  );
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  expect(screen.getByText("Нет героев без черновика")).toBeTruthy();
  expect(screen.getByText("Нет неопубликованных героев")).toBeTruthy();
});
```

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx`

Expected: FAIL because the component still accepts one `heroes` collection.

- [ ] **Step 3: Implement a reusable titled catalog block**

Change props to the interface above. Derive `selectedHero` from its explicit prop rather than searching the filtered lists. Add:

```tsx
function HeroCatalogList({
  emptyText,
  heroes,
  onSelectHero,
  selectedHeroId,
  title,
}: {
  emptyText: string;
  heroes: readonly Hero[];
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
  title: string;
}) {
  const sections = getHeroGuideSelectorSections(heroes, heroFactions);

  return (
    <View style={styles.listSection}>
      <Text style={styles.listTitle}>{title}</Text>
      {heroes.length === 0 ? (
        <Text style={styles.stateText}>{emptyText}</Text>
      ) : (
        <HeroCatalogSections
          sections={sections}
          onSelectHero={onSelectHero}
          selectedHeroId={selectedHeroId}
        />
      )}
    </View>
  );
}
```

Extract the existing UR/SSR JSX into `HeroCatalogSections`, then render two `HeroCatalogList` instances in order. Preserve existing `HeroGrid`, `FactionHeroGrid`, card dimensions, selected badge, loading, error, expansion, and retry behavior.

When `isDraftLoadPending` is true, set the header text to `Загружаем черновик...`, disable hero option presses, and expose `accessibilityState={{ busy: true }}` on the selector header.

- [ ] **Step 4: Update `HeroBuilderSection` plumbing**

Replace its single `heroes` prop with the same two arrays plus `selectedHero` and `isDraftLoadPending`, then pass them unchanged to `HeroGuideSelector`.

- [ ] **Step 5: Add pending and grouping assertions, then verify GREEN**

Keep the existing grouping assertions and add:

```ts
it("keeps an explicit selected hero in the header when it is absent from both lists", () => {
  render(
    <HeroGuideSelector
      {...props}
      notCreatedHeroes={[]}
      notPublishedHeroes={[]}
      selectedHero={urHero}
      selectedHeroId={urHero.id}
    />,
  );
  expect(screen.getByLabelText(`Изменить героя: ${urHero.name.ru}`)).toBeTruthy();
});

it("blocks hero selection while a draft is loading", () => {
  const onSelectHero = jest.fn();
  render(
    <HeroGuideSelector
      {...props}
      isDraftLoadPending
      onSelectHero={onSelectHero}
    />,
  );
  expect(screen.getByText("Загружаем черновик...")).toBeTruthy();
  expect(screen.getByLabelText("Загрузка черновика").props.accessibilityState).toEqual(
    expect.objectContaining({ busy: true }),
  );
  expect(onSelectHero).not.toHaveBeenCalled();
});
```

Run: `npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the selector UI**

```bash
git add src/features/admin/components/HeroGuideSelector.tsx src/features/admin/components/branch-builder/HeroBuilderSection.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx
git commit -m "feat: разделить списки героев билдера"
```

---

### Task 5: Load Combined Catalog State And Resume Drafts

**Files:**
- Modify: `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`
- Modify: `src/features/admin/model/heroGuideSelector.ts`

**Interfaces:**
- Consumes: `fetchHeroBuildSetStatusIds`, `fetchDraftHeroBuildSet`, `getBuilderHeroLists`, and hook `loadBuildSetForEditing`.
- Produces: authenticated combined catalog state, retry action, and draft-aware `handleSelectHero(heroId)`.

- [ ] **Step 1: Replace the repository mocks and write failing catalog tests**

Create `mockFetchHeroBuildSetStatusIds` and `mockFetchDraftHeroBuildSet`, return them from the `@/features/builds` mock, and default the status result to empty arrays. Add:

```ts
it("passes separate not-created and unfinished lists to the selector", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockFetchHeroBuildSetStatusIds.mockResolvedValue({
    draftHeroIds: ["bastet"],
    publishedHeroIds: ["morana"],
  });

  renderAdminBuilder();

  await waitFor(() => {
    expect(mockHeroBuilderSectionProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        notPublishedHeroes: expect.arrayContaining([
          expect.objectContaining({ id: "bastet" }),
        ]),
      }),
    );
  });
  const calls = mockHeroBuilderSectionProps.mock.calls;
  const lastProps = calls[calls.length - 1][0];
  expect((lastProps.notCreatedHeroes as Array<{ id: string }>).some(({ id }) => id === "morana")).toBe(false);
});
```

- [ ] **Step 2: Run the screen test and verify RED**

Run: `npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

Expected: FAIL because the screen still loads only published ids and passes one list.

- [ ] **Step 3: Implement combined status loading**

Replace `publishedHeroIds` with:

```ts
const [heroStatusIds, setHeroStatusIds] = useState<HeroBuildSetStatusIds>({
  draftHeroIds: [],
  publishedHeroIds: [],
});
const [isDraftLoadPending, setIsDraftLoadPending] = useState(false);
```

Rename `loadPublishedHeroIds` to `loadHeroStatusIds`; call `fetchHeroBuildSetStatusIds`, preserve the existing request-id stale-response guard, loading gate, retryable error, login/logout reset, and `Supabase не настроен.` behavior.

Derive:

```ts
const heroLists = useMemo(
  () => getBuilderHeroLists({ heroes: branchBuilderHeroes, ...heroStatusIds }),
  [heroStatusIds],
);
```

Pass both lists, `selectedHero`, and `isDraftLoadPending` to `HeroBuilderSection`. Remove `getSelectableBuilderHeroes` and its obsolete tests only after no caller remains.

- [ ] **Step 4: Verify catalog GREEN**

Run: `npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

Expected: PASS for loading, error, retry, logout reset, and the two-list state.

- [ ] **Step 5: Write failing draft-resume tests**

```ts
it("loads an unfinished hero draft before changing the active builder", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockFetchHeroBuildSetStatusIds.mockResolvedValue({
    draftHeroIds: ["bastet"],
    publishedHeroIds: [],
  });
  mockFetchDraftHeroBuildSet.mockResolvedValue(getValidBastetBuildSet());
  renderAdminBuilder();

  fireEvent.press(await screen.findByLabelText("Выбрать героя"));
  fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

  expect(screen.getByText("Загружаем черновик...")).toBeTruthy();
  await waitFor(() => expect(mockFetchDraftHeroBuildSet).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText("Черновик загружен.")).toBeTruthy());
});

it("keeps the current builder state when draft loading fails", async () => {
  mockFetchDraftHeroBuildSet.mockRejectedValue(new Error("network down"));
  // select an unfinished hero through the rendered selector
  await waitFor(() => expect(screen.getByText("Ошибка Supabase: network down")).toBeTruthy());
  const calls = mockHeroBuilderSectionProps.mock.calls;
  expect(calls[calls.length - 1][0]).toEqual(
    expect.objectContaining({ selectedHeroId: null }),
  );
});
```

- [ ] **Step 6: Run the draft-resume tests and verify RED**

Run the same focused screen test. Expected: FAIL because selection is still synchronous and published-only loading is used.

- [ ] **Step 7: Implement draft-aware selection**

```ts
const handleSelectHero = async (heroId: string) => {
  clearValidationErrors(isHeroErrorPath);

  if (!heroStatusIds.draftHeroIds.includes(heroId)) {
    selectHero(heroId);
    return;
  }

  const client = getSupabaseClient();
  if (!client || isDraftLoadPending) return;

  setIsDraftLoadPending(true);
  try {
    const draft = await fetchDraftHeroBuildSet(
      client as unknown as HeroBuildSetSupabaseClient,
      heroId,
    );
    if (!draft || !loadBuildSetForEditing(draft)) {
      await loadHeroStatusIds();
      showBackendMessage("error", "Черновик для выбранного героя не найден.");
      return;
    }
    showBackendMessage("success", "Черновик загружен.");
  } catch (error) {
    showBackendMessage(
      "error",
      error instanceof Error ? `Ошибка Supabase: ${error.message}` : "Ошибка Supabase.",
    );
  } finally {
    setIsDraftLoadPending(false);
  }
};
```

Pass `onSelectHero={(heroId) => void handleSelectHero(heroId)}`. Keep the previous selected hero until `loadBuildSetForEditing` succeeds.

- [ ] **Step 8: Verify draft resume GREEN and commit**

Run: `npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

Expected: PASS.

```bash
git add src/features/admin/screens/DivinityBranchBuilderScreen.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/model/heroGuideSelector.ts
git commit -m "feat: загружать незавершённые билды"
```

---

### Task 6: Save A Valid Current Tab To Supabase

**Files:**
- Modify: `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- Modify: `src/features/admin/components/DownloadJsonButton.tsx`
- Modify: `src/features/admin/components/branch-builder/DownloadSection.tsx`
- Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`
- Modify: `src/features/admin/__tests__/DownloadJsonButton.test.tsx`
- Modify: `src/features/admin/hooks/useDivinityBranchBuilder.ts`

**Interfaces:**
- Consumes: `prepareCurrentTargetBuild`, `commitPreparedTargetBuild`, `saveHeroBuildSet(... status: "draft")`, and `loadHeroStatusIds`.
- Produces: async `handleSaveCurrentTargetBuild()` with `isTabSavePending`.
- Removes: temporary synchronous `saveCurrentTargetBuild` hook wrapper after screen migration.

- [ ] **Step 1: Write failing invalid/save-success screen tests**

```ts
it("does not request a draft for an invalid current tab", () => {
  renderAdminBuilder();
  fireEvent.press(screen.getByText("Сохранить вкладку"));
  expect(mockSaveHeroBuildSet).not.toHaveBeenCalled();
});

it("saves the newly prepared tab as a partial draft before marking it saved", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  render(
    <DivinityBranchBuilderScreen
      initialAdminSession={{ email: "admin@example.com" }}
      initialHeroId="bastet"
      initialMode="edit"
    />,
  );
  await screen.findAllByText("Билд загружен для редактирования.");
  fireEvent.press(screen.getByText("Сохранить вкладку"));

  await waitFor(() => {
    expect(mockSaveHeroBuildSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        heroId: "bastet",
        status: "draft",
        buildSet: expect.objectContaining({ schemaVersion: 2 }),
      }),
    );
  });
});
```

The hook tests from Task 3 are the direct proof that a fresh one-tab save sends a partial `HeroBuildSet`; this screen test proves that the prepared snapshot is passed to the repository as `status: "draft"`.

- [ ] **Step 2: Run focused screen tests and verify RED**

Run: `npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

Expected: the invalid case passes, while the valid case FAILS because current save is local-only.

- [ ] **Step 3: Implement async server save with delayed local commit**

Add `isTabSavePending` state and replace the handler with:

```ts
const handleSaveCurrentTargetBuild = async () => {
  const result = validateBranchBuild(buildValidationDraft(), branchBuilderValidationCatalog);
  showValidationErrors(result.errors);
  if (!result.isValid) {
    showValidationErrorToast(result.errors, "Сначала исправьте ошибки вкладки.");
    return;
  }

  const client = getSupabaseClient();
  const prepared = prepareCurrentTargetBuild();
  if (!client || !prepared || !selectedHeroId) {
    showBackendMessage("error", client ? "Не удалось собрать вкладку." : "Supabase не настроен.");
    return;
  }

  setIsTabSavePending(true);
  try {
    await saveHeroBuildSet(client as unknown as HeroBuildSetSupabaseClient, {
      buildSet: prepared.buildSet,
      heroId: selectedHeroId,
      status: "draft",
    });
    commitPreparedTargetBuild(prepared);
    await loadHeroStatusIds();
    showBackendMessage("success", "Вкладка сохранена.");
  } catch (error) {
    showBackendMessage(
      "error",
      error instanceof Error ? `Ошибка Supabase: ${error.message}` : "Ошибка Supabase.",
    );
  } finally {
    setIsTabSavePending(false);
  }
};
```

If catalog refresh fails, keep the successful saved state and surface the selector's retryable catalog error; do not roll back the persisted tab.

- [ ] **Step 4: Add failing pending/failure tests**

Add a deferred-save test:

```ts
it("blocks duplicate save and publication while a tab save is pending", async () => {
  let resolveSave!: () => void;
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockSaveHeroBuildSet.mockImplementation(
    () => new Promise<void>((resolve) => { resolveSave = resolve; }),
  );
  render(
    <DivinityBranchBuilderScreen
      initialAdminSession={{ email: "admin@example.com" }}
      initialHeroId="bastet"
      initialMode="edit"
    />,
  );
  await screen.findAllByText("Билд загружен для редактирования.");

  fireEvent.press(screen.getByText("Сохранить вкладку"));
  expect(screen.getByText("Сохраняем...")).toBeTruthy();
  fireEvent.press(screen.getByText("Сохраняем..."));
  fireEvent.press(screen.getByText("Опубликовать"));
  expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1);

  await act(async () => resolveSave());
});

it("keeps the editable form when server tab saving fails", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockSaveHeroBuildSet.mockRejectedValue(new Error("save failed"));
  render(
    <DivinityBranchBuilderScreen
      initialAdminSession={{ email: "admin@example.com" }}
      initialHeroId="bastet"
      initialMode="edit"
    />,
  );
  await screen.findAllByText("Билд загружен для редактирования.");
  fireEvent.press(screen.getByText("Сохранить вкладку"));

  expect(await screen.findAllByText("Ошибка Supabase: save failed")).not.toHaveLength(0);
  expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
  expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
});
```

- [ ] **Step 5: Implement pending button behavior**

Add `isTabSavePending` through `DownloadSection` into `DownloadJsonButton`. Use:

```tsx
<Pressable
  accessibilityRole="button"
  disabled={isTabSavePending || isPublishPending}
  onPress={isTabSavePending || isPublishPending ? undefined : onSaveCurrent}
  style={[styles.button, styles.secondaryButton, (isTabSavePending || isPublishPending) && styles.buttonDisabled]}
>
  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
    {isTabSavePending ? "Сохраняем..." : "Сохранить вкладку"}
  </Text>
</Pressable>
```

Disable publication when either pending flag is true. Remove the obsolete local-only `saveCurrentTargetBuild` hook return and wrapper.

- [ ] **Step 6: Verify save behavior GREEN**

Run: `npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/DownloadJsonButton.test.tsx src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`

Expected: PASS for validation, partial payload, delayed commit, failure preservation, pending label, and duplicate-write prevention.

- [ ] **Step 7: Commit server tab saving**

```bash
git add src/features/admin/screens/DivinityBranchBuilderScreen.tsx src/features/admin/components/DownloadJsonButton.tsx src/features/admin/components/branch-builder/DownloadSection.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/DownloadJsonButton.test.tsx src/features/admin/hooks/useDivinityBranchBuilder.ts
git commit -m "feat: сохранять вкладки на сервере"
```

---

### Task 7: Publish First, Then Delete The Draft

**Files:**
- Modify: `src/features/admin/api/saveAdminHeroBuildSet.ts`
- Modify: `src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts`
- Modify: `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

**Interfaces:**
- Produces: `PublishAdminHeroBuildSetResult = { draftCleanupError: Error | null }`.
- Produces: `publishAdminHeroBuildSet({ buildSet, client, heroId }): Promise<PublishAdminHeroBuildSetResult>`.
- Consumes: `saveHeroBuildSet` and `deleteDraftHeroBuildSet`.
- Removes: refresh responsibility from the API helper; screen refreshes combined status ids after publication/cleanup outcome.

- [ ] **Step 1: Write failing publication-order tests**

Mock both repository functions and add:

```ts
it("publishes before deleting the matching draft", async () => {
  const events: string[] = [];
  mockedSave.mockImplementation(async () => { events.push("published"); });
  mockedDeleteDraft.mockImplementation(async () => { events.push("draft-deleted"); });

  await expect(
    publishAdminHeroBuildSet({ buildSet, client, heroId: "bastet" }),
  ).resolves.toEqual({ draftCleanupError: null });
  expect(events).toEqual(["published", "draft-deleted"]);
  expect(mockedSave).toHaveBeenCalledWith(client, {
    buildSet,
    heroId: "bastet",
    status: "published",
  });
  expect(mockedDeleteDraft).toHaveBeenCalledWith(client, "bastet");
});

it("preserves the draft when publication fails", async () => {
  mockedSave.mockRejectedValue(new Error("publish failed"));
  await expect(
    publishAdminHeroBuildSet({ buildSet, client, heroId: "bastet" }),
  ).rejects.toThrow("publish failed");
  expect(mockedDeleteDraft).not.toHaveBeenCalled();
});

it("returns a cleanup error after a successful publication", async () => {
  mockedSave.mockResolvedValue(undefined);
  mockedDeleteDraft.mockRejectedValue(new Error("cleanup failed"));
  await expect(
    publishAdminHeroBuildSet({ buildSet, client, heroId: "bastet" }),
  ).resolves.toEqual({ draftCleanupError: new Error("cleanup failed") });
});
```

- [ ] **Step 2: Run API tests and verify RED**

Run: `npm test -- --runInBand src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts`

Expected: FAIL because the publish-specific operation is missing.

- [ ] **Step 3: Implement staged publication**

```ts
export type PublishAdminHeroBuildSetResult = {
  draftCleanupError: Error | null;
};

export async function publishAdminHeroBuildSet(params: {
  buildSet: HeroBuildSet;
  client: HeroBuildSetSupabaseClient;
  heroId: string;
}): Promise<PublishAdminHeroBuildSetResult> {
  await saveHeroBuildSet(params.client, {
    buildSet: params.buildSet,
    heroId: params.heroId,
    status: "published",
  });

  try {
    await deleteDraftHeroBuildSet(params.client, params.heroId);
    return { draftCleanupError: null };
  } catch (error) {
    return {
      draftCleanupError:
        error instanceof Error ? error : new Error("Не удалось удалить черновик."),
    };
  }
}
```

Remove the old `saveAdminHeroBuildSet` refresh coupling after all screen callers are migrated.

- [ ] **Step 4: Verify API GREEN**

Run: `npm test -- --runInBand src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts`

Expected: PASS for strict order, failed-publication preservation, and cleanup outcome.

- [ ] **Step 5: Write failing screen tests for success and partial success**

For the existing fully populated edit-mode builder fixture, assert:

```ts
expect(mockSaveHeroBuildSet).toHaveBeenCalledWith(expect.anything(), {
  buildSet: expect.anything(),
  heroId: "bastet",
  status: "published",
});
expect(mockDeleteDraftHeroBuildSet).toHaveBeenCalledWith(expect.anything(), "bastet");
expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2);
expect(screen.getByText("Билд опубликован.")).toBeTruthy();
```

Add:

```ts
it("does not delete the draft when publication fails", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockSaveHeroBuildSet.mockRejectedValue(new Error("publication failed"));
  render(
    <DivinityBranchBuilderScreen
      initialAdminSession={{ email: "admin@example.com" }}
      initialHeroId="bastet"
      initialMode="edit"
    />,
  );
  await screen.findAllByText("Билд загружен для редактирования.");
  fireEvent.press(screen.getByText("Опубликовать"));
  expect(await screen.findAllByText("Ошибка Supabase: publication failed")).not.toHaveLength(0);
  expect(mockDeleteDraftHeroBuildSet).not.toHaveBeenCalled();
});

it("reports cleanup failure after publication and keeps the published hero excluded", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockDeleteDraftHeroBuildSet.mockRejectedValue(new Error("cleanup failed"));
  mockFetchHeroBuildSetStatusIds
    .mockResolvedValueOnce({ draftHeroIds: ["bastet"], publishedHeroIds: [] })
    .mockResolvedValueOnce({ draftHeroIds: ["bastet"], publishedHeroIds: ["bastet"] });
  render(
    <DivinityBranchBuilderScreen
      initialAdminSession={{ email: "admin@example.com" }}
      initialHeroId="bastet"
      initialMode="edit"
    />,
  );
  await screen.findAllByText("Билд загружен для редактирования.");
  fireEvent.press(screen.getByText("Опубликовать"));
  expect(
    await screen.findAllByText(
      "Билд опубликован, но черновик удалить не удалось: cleanup failed",
    ),
  ).not.toHaveLength(0);
  const calls = mockHeroBuilderSectionProps.mock.calls;
  const lastProps = calls[calls.length - 1][0];
  expect(lastProps.notCreatedHeroes).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: "bastet" })]),
  );
  expect(lastProps.notPublishedHeroes).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: "bastet" })]),
  );
});
```

- [ ] **Step 6: Migrate the screen publication flow**

Keep `validateFullExport`, `buildFullExport`, hero-id resolution, the create-mode conflict check, and `isPublishPending`. Replace the final save call with:

```ts
const { draftCleanupError } = await publishAdminHeroBuildSet({
  buildSet,
  client: client as unknown as HeroBuildSetSupabaseClient,
  heroId,
});
await loadHeroStatusIds();

if (draftCleanupError) {
  showBackendMessage(
    "error",
    `Билд опубликован, но черновик удалить не удалось: ${draftCleanupError.message}`,
  );
  return;
}

showBackendMessage("success", "Билд опубликован.");
```

If the combined catalog refresh itself fails, keep the publication/cleanup outcome message and leave the selector's existing retryable error visible. Published dominance in `getBuilderHeroLists` protects the UI whenever fresh ids are available.

- [ ] **Step 7: Verify publication GREEN**

Run: `npm test -- --runInBand src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

Expected: PASS for complete validation, publish-before-delete ordering, failed-publication preservation, cleanup partial success, and catalog refresh.

- [ ] **Step 8: Commit publication cleanup**

```bash
git add src/features/admin/api/saveAdminHeroBuildSet.ts src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts src/features/admin/screens/DivinityBranchBuilderScreen.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
git commit -m "feat: удалять черновик после публикации"
```

---

### Task 8: Full Verification And Acceptance Review

**Files:**
- Verify all files changed in Tasks 1-7.
- Reference: `docs/superpowers/specs/2026-08-12-server-tab-drafts-design.md`

**Interfaces:**
- Consumes the complete implementation.
- Produces fresh evidence for focused behavior, type safety, full regression safety, web export, and spec coverage.

- [ ] **Step 1: Run focused feature tests**

Run:

```bash
npm test -- --runInBand \
  src/features/builds/api/__tests__/heroBuildSetRepository.test.ts \
  src/features/admin/__tests__/heroGuideSelectorModel.test.ts \
  src/features/admin/__tests__/useDivinityBranchBuilder.test.ts \
  src/features/admin/__tests__/HeroGuideSelector.test.tsx \
  src/features/admin/__tests__/DownloadJsonButton.test.tsx \
  src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts \
  src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
```

Expected: all listed suites PASS with zero failed tests.

- [ ] **Step 2: Run TypeScript validation**

Run: `npx tsc --noEmit`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the full Jest suite**

Run: `npm test -- --runInBand`

Expected: every suite PASS with zero failed tests.

- [ ] **Step 4: Verify the production web export**

Run: `npm run export:web`

Expected: exit code 0 and Expo reports a completed web export.

- [ ] **Step 5: Check formatting and worktree scope**

Run:

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Expected: `git diff --check` prints nothing; status contains only expected task files; the branch diff contains no Supabase migration, public hero-screen change, or unrelated file.

- [ ] **Step 6: Review every acceptance criterion against evidence**

Confirm from the focused tests and implementation diff:

- valid current tab persists as `draft`;
- invalid current tab sends no request;
- partial drafts allow missing leaf tabs;
- separate lists use draft/published ids with published dominance;
- unfinished selection restores saved tabs;
- full publication validation is unchanged;
- publication precedes draft-only deletion;
- publication failure preserves draft;
- cleanup failure is explicit and cannot re-expose a published hero;
- request pending/error states prevent misleading duplicate actions.

If any item lacks direct evidence, add a failing test for that item, observe RED, implement the smallest correction, rerun its focused test, and repeat Steps 1-6.

- [ ] **Step 7: Commit any verification-only corrections**

Only if Step 6 required corrections:

```bash
git add src/features/builds/api/heroBuildSetRepository.ts src/features/builds/api/__tests__/heroBuildSetRepository.test.ts src/features/builds/index.ts src/features/admin/model/heroGuideSelector.ts src/features/admin/__tests__/heroGuideSelectorModel.test.ts src/features/admin/hooks/useDivinityBranchBuilder.ts src/features/admin/__tests__/useDivinityBranchBuilder.test.ts src/features/admin/components/HeroGuideSelector.tsx src/features/admin/components/branch-builder/HeroBuilderSection.tsx src/features/admin/components/DownloadJsonButton.tsx src/features/admin/components/branch-builder/DownloadSection.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DownloadJsonButton.test.tsx src/features/admin/api/saveAdminHeroBuildSet.ts src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts src/features/admin/screens/DivinityBranchBuilderScreen.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
git commit -m "fix: завершить серверные черновики билдера"
```

Do not create an empty commit when no correction was needed.
