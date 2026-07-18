# Admin Hero Selector Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the hero selector usable during published-guide loading and show explicit loading feedback in its header and expanded panel.

**Architecture:** `HeroGuideSelector` continues to own expansion state. Loading changes only its presentation: the header renders loading copy and an `ActivityIndicator`, while an expanded panel renders a centered indicator instead of catalog data; remote data ownership stays in the screen.

**Tech Stack:** React 19, React Native 0.85 `ActivityIndicator`, React Native Web 0.21, Jest, Testing Library React Native, TypeScript.

## Global Constraints

- Header loading copy is exactly `Загрузка героев`.
- The header arrow remains visible and usable during loading.
- Loading does not reset `isExpanded`.
- An expanded loading panel contains one centered activity indicator and no hero cards or headings.
- Loading never exposes the unfiltered catalog.
- Existing error/retry behavior remains unchanged.

---

### Task 1: Interactive Loading State

**Files:**
- Modify: `src/features/admin/components/HeroGuideSelector.tsx`
- Test: `src/features/admin/__tests__/HeroGuideSelector.test.tsx`
- Test: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

**Interfaces:**
- Consumes: existing `isLoading: boolean`, `isExpanded: boolean`, and `selectedHeroId` props/state.
- Produces: accessibility labels `Загрузка героев` and `Загрузка списка героев`; no external API changes.

- [ ] **Step 1: Write failing component tests**

Add this test:

```tsx
it("keeps an interactive loading header and restores an open catalog", () => {
  const view = render(<HeroGuideSelector {...props} isLoading />);

  expect(screen.getByText("Загрузка героев")).toBeTruthy();
  expect(screen.getByLabelText("Загрузка героев")).toBeTruthy();
  expect(screen.getByTestId("hero-selector-chevron")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Загрузка героев"));

  expect(screen.getByTestId("hero-selector-content")).toBeTruthy();
  expect(screen.getByLabelText("Загрузка списка героев")).toBeTruthy();
  expect(screen.queryByText("UR")).toBeNull();

  view.rerender(<HeroGuideSelector {...props} />);
  expect(screen.getByText("UR")).toBeTruthy();
});
```

Update the selected-hero loading test with:

```tsx
expect(screen.queryByLabelText(`Герой ${ssrHero.name.ru} выбран`)).toBeNull();
expect(screen.queryByLabelText(`Выбрать героя ${urHero.name.ru}`)).toBeNull();
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
```

Expected: FAIL because the loading header is currently hidden and the old standalone loading copy is rendered.

- [ ] **Step 3: Implement the loading header and panel**

Import `ActivityIndicator`. Render the toggle whenever there is no error, including while loading. In its left content branch render:

```tsx
<View style={styles.loadingHeader}>
  <ActivityIndicator
    accessibilityLabel="Загрузка героев"
    color="#d6c2a4"
    size="small"
  />
  <Text style={styles.toggleText}>Загрузка героев</Text>
</View>
```

Keep the existing arrow and press handler. Use this branch before the normal catalog content:

```tsx
{isExpanded ? (
  <View style={styles.expandedContent} testID="hero-selector-content">
    {isLoading ? (
      <View style={styles.loadingPanel}>
        <ActivityIndicator
          accessibilityLabel="Загрузка списка героев"
          color="#d6c2a4"
          size="small"
        />
      </View>
    ) : (
      /* existing empty/catalog content */
    )}
  </View>
) : null}
```

Add `loadingHeader` with horizontal centered alignment and 8px gap, and `loadingPanel` with centered alignment, justification, and a minimum height of 72px. Do not render the selected hero fallback card during loading. Preserve the current selected fallback only for the error state.

- [ ] **Step 4: Update the screen publication-refresh assertion**

Replace the screen test expectation for `Загружаем доступных героев...` with `Загрузка героев`, while retaining the assertions that the selected hero remains in builder state and is excluded from a later fresh create state.

- [ ] **Step 5: Verify focused and full suites**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
npm test -- --runInBand
npx tsc --noEmit
git diff --check
```

Expected: focused suites pass, all project tests pass, TypeScript exits 0, and `git diff --check` produces no output.

- [ ] **Step 6: Commit and push `main`**

```bash
git add docs/superpowers/plans/2026-07-19-admin-hero-selector-loading.md src/features/admin/components/HeroGuideSelector.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
git commit -m "feat: show hero selector loading state"
git push origin main
```
