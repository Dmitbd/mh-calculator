# Admin Hero Guide Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace admin hero search with an expandable UR/SSR portrait grid that excludes heroes with published Supabase guides and refreshes after publication.

**Architecture:** Keep Supabase access and publication refresh orchestration in `DivinityBranchBuilderScreen`. Put deterministic filtering/grouping in a pure admin model and keep the new selector presentational. The selector never falls back to the unfiltered catalog after a remote failure.

**Tech Stack:** Expo 56, React 19, React Native 0.85, TypeScript 6, Supabase JS, Jest 29, React Native Testing Library.

## Global Constraints

- Create mode must derive availability from actually published Supabase rows, not local build JSON and not draft rows.
- UR heroes render first in one grid.
- SSR heroes render below and are grouped by faction dictionary order.
- Selecting a hero keeps the selector expanded and adds a check mark to the portrait.
- The current selected hero remains visible during edit mode and immediately after its own publication.
- Refresh published hero ids after a successful publication; do not refresh after a failed publication.
- Never expose the full catalog while published-id loading is pending or failed.
- Keep game-data independent from admin UI and Supabase.
- Do not add runtime dependencies or Supabase realtime subscriptions.
- Keep `.env` and `apps/web/public/config.json`-style local runtime files out of commits; for this repo specifically, do not stage `.env`.

## File Structure

- Modify `src/features/builds/api/heroBuildSetRepository.ts`: make published-id failures observable.
- Modify `src/features/builds/api/__tests__/heroBuildSetRepository.test.ts`: lock repository query and error behavior.
- Create `src/features/admin/model/heroGuideSelector.ts`: pure availability and UR/SSR grouping.
- Create `src/features/admin/__tests__/heroGuideSelectorModel.test.ts`: model coverage.
- Create `src/features/admin/components/HeroGuideSelector.tsx`: expandable presentational grid.
- Create `src/features/admin/__tests__/HeroGuideSelector.test.tsx`: interaction and state coverage.
- Modify `src/features/admin/components/branch-builder/HeroBuilderSection.tsx`: compose selector with validation messages.
- Modify `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`: load/refresh published ids and derive selector catalog.
- Create `src/features/admin/api/saveAdminHeroBuildSet.ts`: save a build and refresh published ids only after successful publication.
- Create `src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts`: focused publication refresh contract.
- Modify `src/features/admin/hooks/useDivinityBranchBuilder.ts`: remove obsolete query-search state.
- Modify `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`: screen-level loading, retry, filtering, and refresh expectations.
- Delete `src/features/admin/components/HeroSelectInput.tsx`: obsolete search UI.
- Delete `src/features/admin/__tests__/HeroSelectInput.test.tsx`: obsolete search tests.
- Delete `src/features/admin/utils/searchHeroCatalog.ts`: obsolete search helper.
- Delete its focused test file if present.

---

### Task 1: Make Published-ID Load Failures Observable

**Files:**
- Modify: `src/features/builds/api/heroBuildSetRepository.ts:54-72`
- Modify: `src/features/builds/api/__tests__/heroBuildSetRepository.test.ts:60-100`

**Interfaces:**
- Consumes: `HeroBuildSetSupabaseClient`.
- Produces: `fetchPublishedHeroIds(client): Promise<string[]>`, resolving with ids on success and rejecting with the Supabase error message on failure.

- [ ] **Step 1: Change the existing failure test to require rejection**

Replace the empty-list expectation with:

```ts
it("throws when published hero ids cannot be loaded", async () => {
  const query = createQueryResult({
    data: null,
    error: { message: "network down" },
  });
  const client = { from: jest.fn(() => query) };

  await expect(fetchPublishedHeroIds(client)).rejects.toThrow("network down");
});
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run:

```bash
npm test -- --runInBand src/features/builds/api/__tests__/heroBuildSetRepository.test.ts
```

Expected: FAIL because the repository currently resolves to `[]`.

- [ ] **Step 3: Throw the repository error**

Implement:

```ts
export async function fetchPublishedHeroIds(
  client: HeroBuildSetSupabaseClient,
): Promise<string[]> {
  const { data, error } = await (client
    .from("hero_build_sets")
    .select("hero_id")
    .eq("status", "published") as unknown as Promise<
    QueryResult<HeroBuildSetHeroIdRow[]>
  >);

  if (error) {
    throw new Error(error.message);
  }

  return data?.map((row) => row.hero_id) ?? [];
}
```

- [ ] **Step 4: Run the repository tests**

Run the same command.

Expected: PASS, including assertions that `select("hero_id")` and `eq("status", "published")` were called.

- [ ] **Step 5: Commit the repository contract**

```bash
git add src/features/builds/api/heroBuildSetRepository.ts src/features/builds/api/__tests__/heroBuildSetRepository.test.ts
git commit -m "fix: expose published hero list errors"
```

---

### Task 2: Add Pure Hero Availability And Grouping Model

**Files:**
- Create: `src/features/admin/model/heroGuideSelector.ts`
- Create: `src/features/admin/__tests__/heroGuideSelectorModel.test.ts`

**Interfaces:**
- Consumes: `readonly Hero[]`, `readonly HeroDictionaryEntry[]`, `readonly string[]`, and `selectedHeroId: string | null`.
- Produces:
  - `getSelectableBuilderHeroes(params): Hero[]`
  - `getHeroGuideSelectorSections(heroes, factions): HeroGuideSelectorSections`

- [ ] **Step 1: Write failing model tests**

Create tests using a small typed fixture:

```ts
import type {
  Hero,
  HeroDictionaryEntry,
} from "@/features/game-data/heroes/types";

import {
  getHeroGuideSelectorSections,
  getSelectableBuilderHeroes,
} from "../model/heroGuideSelector";

const hero = (
  id: string,
  rarity: Hero["rarity"],
  factions: Hero["factions"],
): Hero => ({
  id,
  name: { en: id, ru: id },
  icon: `/img/heroes/${id}.png`,
  rarity,
  role: "fighter",
  damageType: "physical",
  element: "fire",
  factions,
  releaseDate: null,
});

const factions: HeroDictionaryEntry[] = [
  { id: "luminarch", name: { en: "Light", ru: "Свет" }, icon: "/light.png", order: 1 },
  { id: "shadowarch", name: { en: "Dark", ru: "Тьма" }, icon: "/dark.png", order: 2 },
];

const heroes = [
  hero("ur-open", "ur", ["luminarch"]),
  hero("ssr-open", "ssr", ["luminarch"]),
  hero("ssr-multi", "ssr", ["luminarch", "shadowarch"]),
  hero("published", "ssr", ["shadowarch"]),
];

it("excludes published heroes but retains the selected published hero", () => {
  expect(
    getSelectableBuilderHeroes({
      heroes,
      publishedHeroIds: ["published"],
      selectedHeroId: null,
    }).map(({ id }) => id),
  ).toEqual(["ur-open", "ssr-open", "ssr-multi"]);

  expect(
    getSelectableBuilderHeroes({
      heroes,
      publishedHeroIds: ["published"],
      selectedHeroId: "published",
    }).map(({ id }) => id),
  ).toContain("published");
});

it("puts UR first and groups only SSR heroes by ordered factions", () => {
  const sections = getHeroGuideSelectorSections(heroes, factions);

  expect(sections.urHeroes.map(({ id }) => id)).toEqual(["ur-open"]);
  expect(sections.ssrGroups.map(({ faction }) => faction.id)).toEqual([
    "luminarch",
    "shadowarch",
  ]);
  expect(sections.ssrGroups[0].heroes.map(({ id }) => id)).toEqual([
    "ssr-open",
    "ssr-multi",
  ]);
  expect(sections.ssrGroups[1].heroes.map(({ id }) => id)).toEqual([
    "ssr-multi",
    "published",
  ]);
});
```

- [ ] **Step 2: Run the model test and confirm the red state**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/heroGuideSelectorModel.test.ts
```

Expected: FAIL because `heroGuideSelector.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

Create:

```ts
import type {
  Hero,
  HeroDictionaryEntry,
  HeroFaction,
} from "@/features/game-data/heroes/types";

export type HeroGuideSelectorGroup = {
  faction: HeroDictionaryEntry;
  heroes: Hero[];
};

export type HeroGuideSelectorSections = {
  urHeroes: Hero[];
  ssrGroups: HeroGuideSelectorGroup[];
};

export function getSelectableBuilderHeroes(params: {
  heroes: readonly Hero[];
  publishedHeroIds: readonly string[];
  selectedHeroId: string | null;
}): Hero[] {
  const publishedIds = new Set(params.publishedHeroIds);

  return params.heroes.filter(
    (hero) => hero.id === params.selectedHeroId || !publishedIds.has(hero.id),
  );
}

export function getHeroGuideSelectorSections(
  heroes: readonly Hero[],
  factions: readonly HeroDictionaryEntry[],
): HeroGuideSelectorSections {
  const ssrHeroes = heroes.filter((hero) => hero.rarity === "ssr");
  const orderedFactions = [...factions].sort((left, right) => left.order - right.order);

  return {
    urHeroes: heroes.filter((hero) => hero.rarity === "ur"),
    ssrGroups: orderedFactions
      .map((faction) => ({
        faction,
        heroes: ssrHeroes.filter((hero) =>
          hero.factions.includes(faction.id as HeroFaction),
        ),
      }))
      .filter((group) => group.heroes.length > 0),
  };
}
```

- [ ] **Step 4: Run the focused model test**

Expected: PASS.

- [ ] **Step 5: Commit the model**

```bash
git add src/features/admin/model/heroGuideSelector.ts src/features/admin/__tests__/heroGuideSelectorModel.test.ts
git commit -m "feat: derive available admin heroes"
```

---

### Task 3: Build The Expandable Portrait Selector

**Files:**
- Create: `src/features/admin/components/HeroGuideSelector.tsx`
- Create: `src/features/admin/__tests__/HeroGuideSelector.test.tsx`
- Modify: `src/features/admin/components/branch-builder/HeroBuilderSection.tsx`
- Delete: `src/features/admin/components/HeroSelectInput.tsx`
- Delete: `src/features/admin/__tests__/HeroSelectInput.test.tsx`
- Delete: `src/features/admin/utils/searchHeroCatalog.ts`
- Delete: the focused search helper test returned by `rg -l "searchHeroCatalog" src/features/admin --glob '*test*'`, if present.

**Interfaces:**
- Consumes:

```ts
type HeroGuideSelectorProps = {
  error: string | null;
  heroes: readonly Hero[];
  isLoading: boolean;
  onRetry: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};
```

- Produces: an inline expandable selector with stable accessible labels `Выбрать героя`, `Выбрать героя <name>`, and `Герой <name> выбран`.

- [ ] **Step 1: Replace search tests with selector behavior tests**

Create tests that assert the approved behavior:

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";

import heroesData from "@/features/game-data/heroes/heroes.json";
import type { Hero } from "@/features/game-data/heroes/types";

import { HeroGuideSelector } from "../components/HeroGuideSelector";

const heroes = heroesData as Hero[];
const urHero = heroes.find((hero) => hero.rarity === "ur")!;
const ssrHero = heroes.find((hero) => hero.rarity === "ssr")!;
const options = [ssrHero, urHero];

const props = {
  error: null,
  heroes: options,
  isLoading: false,
  onRetry: jest.fn(),
  onSelectHero: jest.fn(),
  selectedHeroId: null,
};

beforeEach(() => jest.clearAllMocks());

it("renders UR before SSR after expanding", () => {
  const view = render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  const texts = view.UNSAFE_getAllByType("Text" as never);
  const values = texts.map((node) => node.props.children);
  expect(values.indexOf("UR")).toBeLessThan(values.indexOf("SSR"));
});

it("selects a hero, keeps the panel open, and shows a check mark", () => {
  const { rerender } = render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  fireEvent.press(screen.getByLabelText(`Выбрать героя ${urHero.name.ru}`));
  expect(props.onSelectHero).toHaveBeenCalledWith(urHero.id);

  rerender(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);
  expect(screen.getByText("UR")).toBeTruthy();
  expect(screen.getByLabelText(`Герой ${urHero.name.ru} выбран`)).toBeTruthy();
});

it("shows loading, retryable error, and empty states", () => {
  const { rerender } = render(<HeroGuideSelector {...props} isLoading />);
  expect(screen.getByText("Загружаем доступных героев...")).toBeTruthy();

  rerender(<HeroGuideSelector {...props} error="failed" />);
  expect(screen.getByText("Не удалось загрузить список опубликованных гайдов")).toBeTruthy();
  fireEvent.press(screen.getByText("Повторить"));
  expect(props.onRetry).toHaveBeenCalledTimes(1);

  rerender(<HeroGuideSelector {...props} heroes={[]} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  expect(screen.getByText("Все герои уже имеют опубликованные гайды")).toBeTruthy();
});
```

- [ ] **Step 2: Run the selector test and confirm the red state**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx
```

Expected: FAIL because `HeroGuideSelector` does not exist.

- [ ] **Step 3: Implement the selector structure**

Use `useState(false)` for expansion and `getHeroGuideSelectorSections(heroes, heroFactions)` for sections. The core render must follow this structure:

```tsx
const [isExpanded, setIsExpanded] = useState(false);
const sections = useMemo(
  () => getHeroGuideSelectorSections(heroes, heroFactions),
  [heroes],
);

if (isLoading) {
  return <Text style={styles.stateText}>Загружаем доступных героев...</Text>;
}

if (error) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateText}>
        Не удалось загрузить список опубликованных гайдов
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

return (
  <View style={styles.wrapper}>
    <Pressable
      accessibilityLabel="Выбрать героя"
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      onPress={() => setIsExpanded((current) => !current)}
      style={styles.toggle}
    >
      <Text style={styles.toggleText}>Выбрать героя</Text>
      <Text style={styles.chevron}>{isExpanded ? "⌃" : "⌄"}</Text>
    </Pressable>

    {isExpanded ? (
      heroes.length === 0 ? (
        <Text style={styles.stateText}>Все герои уже имеют опубликованные гайды</Text>
      ) : (
        <View style={styles.content}>
          {sections.urHeroes.length > 0 ? (
            <HeroGrid title="UR" heroes={sections.urHeroes} />
          ) : null}
          {sections.ssrGroups.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SSR</Text>
              {sections.ssrGroups.map((group) => (
                <FactionHeroGrid group={group} key={group.faction.id} />
              ))}
            </View>
          ) : null}
        </View>
      )
    ) : null}
  </View>
);
```

Implement each hero option as a `Pressable` with `width: 72`, portrait size `56`, `numberOfLines={1}`, `flexWrap: "wrap"`, and compact gaps. For a selected option, render a corner badge containing `✓`, apply the selected border, set `accessibilityState={{ selected: true }}`, and use `accessibilityLabel={`Герой ${hero.name.ru} выбран`}`. For an unselected option use `accessibilityLabel={`Выбрать героя ${hero.name.ru}`}`. Guard `onPress` so selecting the already selected id is a no-op.

- [ ] **Step 4: Update `HeroBuilderSection`**

Replace query props with selector state props:

```ts
type HeroBuilderSectionProps = {
  errors: readonly string[];
  heroListError: string | null;
  heroes: readonly Hero[];
  isHeroListLoading: boolean;
  onRetryHeroList: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};
```

Render `HeroGuideSelector` followed by the unchanged `ValidationErrorMessages`.

- [ ] **Step 5: Delete obsolete search files and run focused tests**

Run:

```bash
rg -n "HeroSelectInput|searchHeroCatalog|heroQuery|onQueryChange" src/features/admin
npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/heroGuideSelectorModel.test.ts
```

Expected: the `rg` output only identifies screen/hook integration work intentionally deferred to Task 4; both tests PASS.

- [ ] **Step 6: Commit the selector**

```bash
git add src/features/admin/components src/features/admin/model src/features/admin/__tests__ src/features/admin/utils
git commit -m "feat: add admin hero portrait selector"
```

---

### Task 4: Load, Retry, Filter, And Refresh In The Builder Screen

**Files:**
- Modify: `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- Create: `src/features/admin/api/saveAdminHeroBuildSet.ts`
- Create: `src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts`
- Modify: `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

**Interfaces:**
- Consumes: `fetchPublishedHeroIds`, `getSelectableBuilderHeroes`, authenticated `adminSession`, and existing publication flow.
- Produces: `loadPublishedHeroIds(): Promise<void>` and the prepared props required by `HeroBuilderSection`.

- [ ] **Step 1: Mock the published-id repository and add failing screen tests**

At the top of `DivinityBranchBuilderScreen.test.tsx`, add mocks while preserving the real builds UI exports:

```ts
const mockFetchPublishedHeroIds = jest.fn<Promise<string[]>, []>();

jest.mock("@/features/builds", () => {
  const actual = jest.requireActual("@/features/builds");
  return {
    ...actual,
    fetchPublishedHeroIds: () => mockFetchPublishedHeroIds(),
  };
});
```

Reset them in `beforeEach` and default `mockFetchPublishedHeroIds.mockResolvedValue([])`.

Add focused tests:

```tsx
it("loads published ids after authentication and excludes those heroes", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockFetchPublishedHeroIds.mockResolvedValue(["bastet"]);
  renderAdminBuilder();

  await waitFor(() => expect(mockFetchPublishedHeroIds).toHaveBeenCalledTimes(1));
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
});

it("shows a retry action instead of the unfiltered catalog after load failure", async () => {
  mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
  mockFetchPublishedHeroIds
    .mockRejectedValueOnce(new Error("network down"))
    .mockResolvedValueOnce([]);
  renderAdminBuilder();

  expect(await screen.findByText("Не удалось загрузить список опубликованных гайдов")).toBeTruthy();
  expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
  fireEvent.press(screen.getByText("Повторить"));
  await waitFor(() => expect(mockFetchPublishedHeroIds).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText("Выбрать героя")).toBeTruthy();
});
```

Create `saveAdminHeroBuildSet.test.ts` with a mocked repository function and an explicit refresh callback:

```ts
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

import { saveHeroBuildSet } from "@/features/builds";
import { saveAdminHeroBuildSet } from "../api/saveAdminHeroBuildSet";

jest.mock("@/features/builds", () => ({
  saveHeroBuildSet: jest.fn(),
}));

const mockedSave = jest.mocked(saveHeroBuildSet);
const buildSet: HeroBuildSet = { schemaVersion: 2, tabs: [] };
const client = { from: jest.fn() } as never;

beforeEach(() => mockedSave.mockReset());

it("refreshes published ids after a successful publication", async () => {
  const refreshPublishedHeroIds = jest.fn(async () => undefined);
  mockedSave.mockResolvedValue(undefined);

  await saveAdminHeroBuildSet({
    buildSet,
    client,
    heroId: "bastet",
    refreshPublishedHeroIds,
    status: "published",
  });

  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(refreshPublishedHeroIds).toHaveBeenCalledTimes(1);
});

it("does not refresh after a failed publication", async () => {
  const refreshPublishedHeroIds = jest.fn(async () => undefined);
  mockedSave.mockRejectedValue(new Error("save failed"));

  await expect(
    saveAdminHeroBuildSet({
      buildSet,
      client,
      heroId: "bastet",
      refreshPublishedHeroIds,
      status: "published",
    }),
  ).rejects.toThrow("save failed");

  expect(refreshPublishedHeroIds).not.toHaveBeenCalled();
});

it("does not refresh after saving a draft", async () => {
  const refreshPublishedHeroIds = jest.fn(async () => undefined);
  mockedSave.mockResolvedValue(undefined);

  await saveAdminHeroBuildSet({
    buildSet,
    client,
    heroId: "bastet",
    refreshPublishedHeroIds,
    status: "draft",
  });

  expect(refreshPublishedHeroIds).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run screen tests and confirm the red state**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
```

Expected: FAIL because the screen does not load published ids or render the new selector props.

- [ ] **Step 3: Add remote list state and reusable loader**

Import `fetchPublishedHeroIds` and add:

```ts
const [publishedHeroIds, setPublishedHeroIds] = useState<string[]>([]);
const [isHeroListLoading, setIsHeroListLoading] = useState(false);
const [heroListError, setHeroListError] = useState<string | null>(null);

const loadPublishedHeroIds = useCallback(async () => {
  const client = getSupabaseClient();

  if (!client) {
    setPublishedHeroIds([]);
    setHeroListError("Supabase не настроен.");
    setIsHeroListLoading(false);
    return;
  }

  setIsHeroListLoading(true);
  setHeroListError(null);

  try {
    const ids = await fetchPublishedHeroIds(
      client as unknown as HeroBuildSetSupabaseClient,
    );
    setPublishedHeroIds(ids);
  } catch (error) {
    setPublishedHeroIds([]);
    setHeroListError(
      error instanceof Error ? error.message : "Неизвестная ошибка Supabase.",
    );
  } finally {
    setIsHeroListLoading(false);
  }
}, []);

useEffect(() => {
  if (isAuthChecked && adminSession) {
    void loadPublishedHeroIds();
  }
}, [adminSession, isAuthChecked, loadPublishedHeroIds]);
```

Derive options with:

```ts
const selectableHeroes = useMemo(
  () =>
    getSelectableBuilderHeroes({
      heroes: branchBuilderHeroes,
      publishedHeroIds,
      selectedHeroId,
    }),
  [publishedHeroIds, selectedHeroId],
);
```

- [ ] **Step 4: Implement the save-and-refresh boundary**

Create:

```ts
import {
  saveHeroBuildSet,
  type HeroBuildSetStatus,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

export async function saveAdminHeroBuildSet(params: {
  buildSet: HeroBuildSet;
  client: HeroBuildSetSupabaseClient;
  heroId: string;
  refreshPublishedHeroIds: () => Promise<void>;
  status: HeroBuildSetStatus;
}): Promise<void> {
  await saveHeroBuildSet(params.client, {
    buildSet: params.buildSet,
    heroId: params.heroId,
    status: params.status,
  });

  if (params.status === "published") {
    await params.refreshPublishedHeroIds();
  }
}
```

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts
```

Expected: PASS.

- [ ] **Step 5: Wire the section and successful publication refresh**

Pass:

```tsx
<HeroBuilderSection
  errors={heroErrors}
  heroListError={heroListError}
  heroes={selectableHeroes}
  isHeroListLoading={isHeroListLoading}
  onRetryHeroList={() => void loadPublishedHeroIds()}
  onSelectHero={handleSelectHero}
  selectedHeroId={selectedHeroId}
/>
```

Replace the direct `saveHeroBuildSet(...)` call with:

```ts
await saveAdminHeroBuildSet({
  buildSet,
  client: client as unknown as HeroBuildSetSupabaseClient,
  heroId,
  refreshPublishedHeroIds: loadPublishedHeroIds,
  status,
});

showBackendMessage(
  "success",
  status === "published" ? "Билд опубликован." : "Черновик сохранён.",
);
```

Do not call the loader from the `catch` path. `loadPublishedHeroIds` handles its own error instead of throwing, so a failed post-publication refresh exposes `heroListError` without changing the successful publication result.

- [ ] **Step 6: Remove obsolete query state from the builder hook**

Remove `heroQuery`, `setHeroQueryState`, and `setHeroQuery`. Define:

```ts
const heroName = selectedHero?.name.ru ?? "";
```

In `selectHero` and `loadBuildSetForEditing`, stop setting query text. Keep `clearSelectedHero` only if another current screen action uses it; otherwise remove it from the hook return contract too. Remove all obsolete return values and dependency-array entries.

- [ ] **Step 7: Migrate existing screen tests from search to grid selection**

Replace every pair:

```ts
fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
```

with:

```ts
fireEvent.press(screen.getByLabelText("Выбрать героя"));
fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
```

Delete tests whose product requirement was arbitrary typed text or query-driven deselection. Replace the latter with a grid selection change test that verifies choosing another hero updates hero-dependent weapon bonuses.

- [ ] **Step 8: Run focused and full verification**

Run:

```bash
npm test -- --runInBand src/features/builds/api/__tests__/heroBuildSetRepository.test.ts src/features/admin/__tests__/heroGuideSelectorModel.test.ts src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
npx tsc --noEmit
npm test -- --runInBand
git diff --check
git status --short
```

Expected:

- all Jest suites PASS;
- TypeScript exits `0`;
- `git diff --check` prints nothing;
- `.env` is absent from `git status` because it is ignored.

- [ ] **Step 9: Manually verify localhost without opening another browser window**

With the existing `npm run start -- --web --port 8081` server:

1. Sign in as admin.
2. Confirm no text search is present.
3. Expand `Выбрать героя`.
4. Confirm UR is above SSR.
5. Confirm SSR is grouped as Свет, Тьма, Хранители, Лес when groups have available heroes.
6. Select a hero and confirm the panel stays open with a check mark.
7. Publish a complete guide and confirm the refreshed catalog excludes it on a fresh create page.
8. Temporarily force the published-id request to fail only in a test/mocked environment and confirm the retry state; do not alter production Supabase data for this check.

- [ ] **Step 10: Commit the screen integration**

```bash
git add src/features/admin/screens/DivinityBranchBuilderScreen.tsx src/features/admin/hooks/useDivinityBranchBuilder.ts src/features/admin/components/branch-builder/HeroBuilderSection.tsx src/features/admin/api/saveAdminHeroBuildSet.ts src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
git commit -m "feat: filter admin heroes by published guides"
```

---

### Task 5: Final Regression And Scope Audit

**Files:**
- Verify only; modify only files already listed when a failing check proves it necessary.

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified feature with no search remnants or accidental runtime configuration changes.

- [ ] **Step 1: Check obsolete symbols and architecture boundaries**

Run:

```bash
rg -n "HeroSelectInput|searchHeroCatalog|heroQuery|Начните вводить имя героя" src
npm test -- --runInBand src/features/admin/__tests__/adminComponentBoundaries.test.js
```

Expected: `rg` returns no production references; boundary test PASS.

- [ ] **Step 2: Inspect the final diff against the approved spec**

Run:

```bash
git diff HEAD~4 -- src/features/builds src/features/admin
git status --short
```

Confirm the diff contains only repository error semantics, selector model/UI, builder integration, obsolete search removal, and their tests. Confirm `.env` is not listed.

- [ ] **Step 3: Run the project-wide verification one final time**

```bash
npx tsc --noEmit
npm test -- --runInBand
```

Expected: both commands exit `0`.

- [ ] **Step 4: Commit any test-only correction if the audit required one**

If no files changed, skip this commit. Otherwise:

```bash
git add src/features/admin src/features/builds
git commit -m "test: cover admin hero guide selector"
```
