# Admin Hero Selector Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually connect the expanded hero selector header and complete hero catalog as one bordered panel.

**Architecture:** Keep `HeroGuideSelector` as the single presentational owner of expansion state. Apply state-dependent header corners and wrap only the expanded catalog in a matching content surface; do not change hero filtering, grouping, selection, or publication data flow.

**Tech Stack:** React 19, React Native 0.85, React Native Web 0.21, Jest, Testing Library React Native, TypeScript.

## Global Constraints

- The closed selector remains a standalone rounded toggle.
- The expanded toggle and complete catalog share background `#241610` and border color `#644932`.
- The expanded header has no bottom corner rounding; the catalog has no top corner rounding.
- A single thin divider separates header and catalog.
- The catalog has 16px inner padding.
- Do not add UR or SSR section borders.
- Do not change hero card dimensions, selector behavior, filtering, grouping, or publication refresh.

---

### Task 1: Expanded Selector Panel

**Files:**
- Modify: `src/features/admin/components/HeroGuideSelector.tsx`
- Test: `src/features/admin/__tests__/HeroGuideSelector.test.tsx`

**Interfaces:**
- Consumes: existing `isExpanded: boolean` local state and `styles.toggle`.
- Produces: `styles.toggleExpanded` and `styles.expandedContent`, used only by `HeroGuideSelector`.

- [ ] **Step 1: Write the failing component test**

Add a test that expands the selector and verifies the header and catalog form a matching panel while the closed state has no expanded styles:

```tsx
it("joins the expanded toggle and catalog into one bordered panel", () => {
  render(<HeroGuideSelector {...props} />);

  const toggle = screen.getByLabelText("Выбрать героя");
  expect(StyleSheet.flatten(toggle.props.style)).not.toMatchObject({
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  });

  fireEvent.press(toggle);

  expect(StyleSheet.flatten(toggle.props.style)).toMatchObject({
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  });
  expect(
    StyleSheet.flatten(screen.getByTestId("hero-selector-content").props.style),
  ).toMatchObject({
    backgroundColor: "#241610",
    borderColor: "#644932",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    padding: 16,
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx
```

Expected: FAIL because the toggle has no expanded corner style and `hero-selector-content` does not exist.

- [ ] **Step 3: Implement the shared panel surface**

Apply the expansion style to the header:

```tsx
style={[styles.toggle, isExpanded ? styles.toggleExpanded : null]}
```

Wrap the existing expanded section content without changing its children:

```tsx
<View style={styles.expandedContent} testID="hero-selector-content">
  <View style={styles.content}>{/* existing UR and SSR sections */}</View>
</View>
```

Add the styles:

```tsx
toggleExpanded: {
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
},
expandedContent: {
  backgroundColor: "#241610",
  borderColor: "#644932",
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderWidth: 1,
  marginTop: -9,
  padding: 16,
},
```

The negative top margin consumes the wrapper's existing 8px gap and overlaps one border pixel, leaving a single divider rather than a double border.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
npm test -- --runInBand src/features/admin/__tests__/HeroGuideSelector.test.tsx
npm test -- --runInBand
npx tsc --noEmit
git diff --check
```

Expected: 15 focused tests pass, all project tests pass, TypeScript exits 0, and `git diff --check` produces no output.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/features/admin/components/HeroGuideSelector.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx
git commit -m "feat: join expanded hero selector panel"
```
