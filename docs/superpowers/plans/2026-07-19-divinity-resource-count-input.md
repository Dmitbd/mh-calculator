# Divinity Resource Count Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the separate counter and step buttons in every «Мои ресурсы» row with a confirmed numeric input and a stable confirm/clear action slot.

**Architecture:** Normalize resource counts at the model/storage/hook boundary and expose direct chest/gem setters from useDivinityResources. Keep each text draft local to CounterRow; only confirm, clear, or the global reset updates AsyncStorage and the remaining-cost calculation.

**Tech Stack:** TypeScript 6, React 19, React Native 0.85, Expo 56, react-native-svg, AsyncStorage, Jest 29, Testing Library React Native.

## Global Constraints

- The supported saved range is exactly 0 through 999.
- Inputs accept only digits, have maxLength 3, inputMode numeric, and keyboardType number-pad.
- The row layout is: icon with its visible level label fixed left, then a wider fixed-width input and fixed action slot centered as one editor group in the remaining row width.
- Keep a fixed gap between the input and its reserved action slot so check/trash never shifts the input.
- Remove the minus button, plus button, and separate text counter.
- Draft input must not change persistence or calculations before confirmation.
- A dirty draft shows confirm; otherwise a positive saved value shows clear; saved zero shows an empty reserved slot.
- Confirm/check and clear/trash share the same fixed slot immediately to the right of the input.
- Collapsing «Мои ресурсы» discards drafts because counter rows unmount.
- The existing allocation formula and AsyncStorage record shape do not change.
- Use react-native-svg for the trash icon; add no dependency.
- Dropdowns use the narrow `›` glyph rotated down/up; existing correct back/navigation arrows remain unchanged.
- The manual explains resource input, confirmation and clearing without changing the separate ring-progress instructions.
- Tests are functional behavior tests; do not assert palette-only or CSS-only details.
- Do not commit or push this feature without a separate user command.

---

### Task 1: Normalize counts and replace step methods with direct setters

**Files:**
- Modify: src/features/divinity/model/divinityOwnedResources.ts
- Modify: src/features/divinity/storage/divinityResourcesStorage.ts
- Modify: src/features/divinity/hooks/useDivinityResources.ts
- Modify: src/features/divinity/screens/DivinityScreen.tsx
- Modify: src/features/divinity/__tests__/divinityResourcesStorage.test.ts
- Modify: src/features/divinity/__tests__/useDivinityResources.test.tsx

**Interfaces:**
- Produces MAX_DIVINITY_RESOURCE_COUNT = 999.
- Produces normalizeDivinityResourceCount(value: unknown): number.
- Produces normalizeDivinityOwnedResources(resources): DivinityOwnedResources.
- Produces from useDivinityResources: setChestCount(chestId, count) and setGemCount(level, count).
- Removes the no-longer-used increment/decrement methods.
- Preserves ref-based update ordering, resetResources, and the storage record shape.

- [ ] **Step 1: Write failing hook tests for direct setters and boundaries**

Replace increment/decrement assertions in useDivinityResources.test.tsx with direct setter behavior and keep the existing reset/write-order coverage:

~~~tsx
test("sets and persists normalized chest and gem counts", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setChestCount("600001", 1_200);
    await result.current.setGemCount(7, -4);
  });

  expect(result.current.resources.chestCounts["600001"]).toBe(999);
  expect(result.current.resources.gemCounts[7]).toBe(0);

  const persisted = JSON.parse(
    mockStorage.get("divinity-resources") ?? "{}",
  );
  expect(persisted.chestCounts["600001"]).toBe(999);
  expect(persisted.gemCounts[7]).toBe(0);
});
~~~

Change the immediate-after-reset race test to call setChestCount("600001", 1) instead of incrementChest.

- [ ] **Step 2: Write a failing storage normalization test**

Append:

~~~ts
test("normalizes legacy stored counts into the supported range", async () => {
  mockStorage.set(
    "divinity-resources",
    JSON.stringify({
      chestCounts: { "600001": 1_400, "600076": -2 },
      gemCounts: { 1: 12.8, 7: "broken" },
    }),
  );

  await expect(loadDivinityResources()).resolves.toMatchObject({
    chestCounts: { "600001": 999, "600076": 0 },
    gemCounts: { 1: 12, 7: 0 },
  });
});
~~~

- [ ] **Step 3: Run both suites and verify RED**

Run:

~~~bash
npm test -- --runInBand src/features/divinity/__tests__/useDivinityResources.test.tsx src/features/divinity/__tests__/divinityResourcesStorage.test.ts
~~~

Expected: FAIL because the direct setters and normalizers do not exist.

- [ ] **Step 4: Add model normalization helpers**

In divinityOwnedResources.ts add:

~~~ts
export const MAX_DIVINITY_RESOURCE_COUNT = 999;

export function normalizeDivinityResourceCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    MAX_DIVINITY_RESOURCE_COUNT,
    Math.max(0, Math.trunc(value)),
  );
}

type DivinityOwnedResourcesInput = {
  chestCounts?: Partial<DivinityOwnedResources["chestCounts"]>;
  gemCounts?: Partial<DivinityOwnedResources["gemCounts"]>;
};

export function normalizeDivinityOwnedResources(
  resources?: DivinityOwnedResourcesInput,
): DivinityOwnedResources {
  return {
    chestCounts: {
      "600001": normalizeDivinityResourceCount(
        resources?.chestCounts?.["600001"],
      ),
      "600076": normalizeDivinityResourceCount(
        resources?.chestCounts?.["600076"],
      ),
    },
    gemCounts: {
      1: normalizeDivinityResourceCount(resources?.gemCounts?.[1]),
      2: normalizeDivinityResourceCount(resources?.gemCounts?.[2]),
      3: normalizeDivinityResourceCount(resources?.gemCounts?.[3]),
      4: normalizeDivinityResourceCount(resources?.gemCounts?.[4]),
      5: normalizeDivinityResourceCount(resources?.gemCounts?.[5]),
      6: normalizeDivinityResourceCount(resources?.gemCounts?.[6]),
      7: normalizeDivinityResourceCount(resources?.gemCounts?.[7]),
    },
  };
}
~~~

Make createEmptyDivinityOwnedResources return normalizeDivinityOwnedResources().

- [ ] **Step 5: Normalize storage reads and writes**

Import normalizeDivinityOwnedResources in divinityResourcesStorage.ts. In loadDivinityResources normalize parsed chestCounts/gemCounts before returning. In saveDivinityResources normalize the supplied resources before creating the record.

~~~ts
const normalized = normalizeDivinityOwnedResources({
  chestCounts: parsed.chestCounts,
  gemCounts: parsed.gemCounts,
});

return {
  ...normalized,
  updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
};
~~~

~~~ts
const record: DivinityResourcesRecord = {
  ...normalizeDivinityOwnedResources(resources),
  updatedAt: new Date().toISOString(),
};
~~~

- [ ] **Step 6: Replace hook step methods with normalized setters**

Add these methods inside useDivinityResources:

~~~ts
const setChestCount = async (
  chestId: DivinityGemChestId,
  count: number,
) => {
  await updateResources((current) => ({
    ...current,
    chestCounts: {
      ...current.chestCounts,
      [chestId]: normalizeDivinityResourceCount(count),
    },
  }));
};

const setGemCount = async (level: DivinityGemLevel, count: number) => {
  await updateResources((current) => ({
    ...current,
    gemCounts: {
      ...current.gemCounts,
      [level]: normalizeDivinityResourceCount(count),
    },
  }));
};
~~~

Return setChestCount and setGemCount. Remove incrementChest, decrementChest, incrementGem, and decrementGem plus their obsolete tests.

Until Task 2 removes the step buttons, keep `DivinityScreen` compiling by wiring the panel's existing increment/decrement props through the new setters and the current resource value plus or minus one. Do not retain aliases in the hook; Task 2 replaces these temporary panel props with direct setter props.

- [ ] **Step 7: Run focused tests and TypeScript and verify GREEN**

~~~bash
npm test -- --runInBand src/features/divinity/__tests__/useDivinityResources.test.tsx src/features/divinity/__tests__/divinityResourcesStorage.test.ts src/features/divinity/__tests__/divinityScreen.test.tsx
npx tsc --noEmit
~~~

Expected: both suites and TypeScript PASS.

---

### Task 2: Add the compact confirmed input to resource rows

**Files:**
- Modify: src/features/divinity/ui/DivinityResourcesPanel.tsx
- Modify: src/features/divinity/screens/DivinityScreen.tsx
- Modify: src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx
- Modify: src/features/divinity/__tests__/divinityScreen.test.tsx

**Interfaces:**
- Consumes normalizeDivinityResourceCount, setChestCount, and setGemCount.
- Panel props become onSetChest(chestId, count), onSetGem(level, count), and onReset.
- CounterRow receives inputLabel, saveLabel, clearLabel, value, and onChange(count).
- Preserves assets, visible level labels, panel reset, chevron, persistence, and allocation.

- [ ] **Step 1: Write a failing panel test for draft, confirm, and clear**

Update existing renders to use onSetChest/onSetGem and add:

~~~tsx
test("keeps input as a draft until save and clears a saved value", () => {
  const onSetChest = jest.fn();
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600076"] = 8;

  const { rerender } = render(
    <DivinityResourcesPanel
      resources={resources}
      onSetChest={onSetChest}
      onSetGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  const input = screen.getByLabelText("Количество сундуков 600076");

  expect(input.props.value).toBe("8");
  expect(input.props.inputMode).toBe("numeric");
  expect(input.props.keyboardType).toBe("number-pad");

  fireEvent.changeText(input, "a12b34");
  expect(
    screen.getByLabelText("Количество сундуков 600076").props.value,
  ).toBe("123");
  expect(onSetChest).not.toHaveBeenCalled();

  fireEvent.press(screen.getByLabelText("Сохранить сундуки 600076"));
  expect(onSetChest).toHaveBeenCalledWith("600076", 123);

  const savedResources = createEmptyDivinityOwnedResources();
  savedResources.chestCounts["600076"] = 123;
  rerender(
    <DivinityResourcesPanel
      resources={savedResources}
      onSetChest={onSetChest}
      onSetGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  expect(screen.queryByLabelText("Сохранить сундуки 600076")).toBeNull();
  fireEvent.press(screen.getByLabelText("Очистить сундуки 600076"));
  expect(onSetChest).toHaveBeenLastCalledWith("600076", 0);
});
~~~

- [ ] **Step 2: Write failing tests for empty input and collapsed draft reset**

Add a test that changes the level-7 gem input to an empty string, confirms it, and expects onSetGem(7, 0). Add a separate case that creates a chest draft, collapses/reopens the panel, and expects the saved value to be restored with no save action visible.

- [ ] **Step 3: Run the panel suite and verify RED**

~~~bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx
~~~

Expected: FAIL because setter props and inputs do not exist.

- [ ] **Step 4: Replace CounterRow step controls with local draft state**

Import useEffect, TextInput, Svg, and Path. Change CounterRow props to:

~~~ts
type CounterRowProps = {
  clearLabel: string;
  icon: ReactNode;
  inputLabel: string;
  label: string;
  saveLabel: string;
  value: number;
  onChange: (count: number) => void;
};
~~~

Inside CounterRow:

~~~tsx
const [draft, setDraft] = useState(String(value));

useEffect(() => {
  setDraft(String(value));
}, [value]);

const isDirty = draft !== String(value);

const saveDraft = () => {
  if (!isDirty) {
    return;
  }

  const normalized = normalizeDivinityResourceCount(
    draft === "" ? 0 : Number(draft),
  );
  setDraft(String(normalized));
  onChange(normalized);
};

const clearValue = () => {
  setDraft("0");
  onChange(0);
};
~~~

- [ ] **Step 5: Render the icon/label followed by the fixed editor**

Replace the two step buttons and count box with:

~~~tsx
<View style={styles.resourceIdentity}>
  {icon}
  <Text numberOfLines={1} style={styles.resourceLabel}>
    {label}
  </Text>
</View>

<View style={styles.countEditor}>
  <TextInput
    accessibilityLabel={inputLabel}
    inputMode="numeric"
    keyboardType="number-pad"
    maxLength={3}
    onChangeText={(text) => {
      setDraft(text.replace(/\D/g, "").slice(0, 3));
    }}
    onSubmitEditing={saveDraft}
    selectTextOnFocus
    style={styles.countInput}
    value={draft}
  />

  <View style={styles.countActionSlot}>
    {isDirty ? (
      <Pressable
        accessibilityLabel={saveLabel}
        accessibilityRole="button"
        onPress={saveDraft}
        style={styles.countAction}
      >
        <Text style={styles.confirmIcon}>✓</Text>
      </Pressable>
    ) : value > 0 ? (
      <Pressable
        accessibilityLabel={clearLabel}
        accessibilityRole="button"
        onPress={clearValue}
        style={styles.countAction}
      >
        <TrashIcon />
      </Pressable>
    ) : null}
  </View>
</View>
~~~

Create a file-local TrashIcon using Svg/Path at 20 by 20, viewBox 0 0 24 24, with the existing gold foreground color. Do not use an emoji.

- [ ] **Step 6: Apply the compact mobile layout**

Keep the row at full width. The icon/label remains left, the editor follows with a visible gap, and the action is immediately right of the input:

~~~ts
counterRow: {
  minHeight: 76,
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 16,
  backgroundColor: "#3b2114",
  padding: 8,
  gap: 24,
},
resourceIdentity: {
  width: 64,
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
},
countEditor: {
  width: 98,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},
countInput: {
  width: 52,
  height: 40,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#6f4028",
  backgroundColor: "#281710",
  color: "#fff8e7",
  fontSize: 18,
  fontWeight: "800",
  textAlign: "center",
  paddingHorizontal: 4,
},
countActionSlot: {
  width: 40,
  height: 40,
},
countAction: {
  width: 40,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#8b512f",
  backgroundColor: "#4b2818",
},
confirmIcon: {
  color: "#ffe09d",
  fontSize: 22,
  fontWeight: "900",
},
~~~

Remove counterControls, stepButton, stepButtonDisabled, stepButtonText, countBox, and countText styles.

- [ ] **Step 7: Wire exact labels and direct setters**

Panel props:

~~~ts
onSetChest: (chestId: DivinityGemChestId, count: number) => void;
onSetGem: (level: DivinityGemLevel, count: number) => void;
onReset: () => void;
~~~

Chest rows use labels:
- Количество сундуков plus chest id
- Сохранить сундуки plus chest id
- Очистить сундуки plus chest id

Gem rows use equivalent labels ending with level and ур. Wire onChange directly to onSetChest/onSetGem.

- [ ] **Step 8: Wire setters through DivinityScreen**

Destructure setChestCount and setGemCount, remove the four increment/decrement methods, and pass:

~~~tsx
onSetChest={(chestId, count) => {
  void setChestCount(chestId, count);
}}
onSetGem={(level, count) => {
  void setGemCount(level, count);
}}
~~~

- [ ] **Step 9: Add a screen-level calculation test**

Enable full autofill, expand resources, change Количество сундуков 600001 from 0 to 1, and verify level-1 remaining cost stays 82 before confirmation. Press Сохранить сундуки 600001 and wait for the remaining cost to become 62.

- [ ] **Step 10: Run UI/screen suites and TypeScript and verify GREEN**

~~~bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx src/features/divinity/__tests__/divinityScreen.test.tsx
npx tsc --noEmit
~~~

Expected: both suites and TypeScript PASS.

---

### Task 3: Standardize dropdown chevrons and update the manual

**Files:**
- Modify: `src/features/divinity/ui/DivinityResourcesPanel.tsx`
- Modify: `src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx`
- Modify: `src/features/admin/components/HeroGuideSelector.tsx`
- Modify: `src/features/admin/__tests__/HeroGuideSelector.test.tsx`
- Modify: `src/features/builds/components/BranchBuilderGrid.tsx`
- Modify: `src/features/divinity/screens/DivinityManualScreen.tsx`
- Modify: `src/features/divinity/__tests__/DivinityManualScreen.test.tsx`

**Interfaces:**
- Dropdown indicator uses the same narrow `›` shape as `HeroListCard`.
- Closed dropdown direction: `rotate(90deg)` (down).
- Open dropdown direction: `rotate(-90deg)` (up).
- Back navigation `‹` and hero-card navigation `›` remain unchanged.
- Manual resource copy describes input, confirmation and clearing; the ring-progress copy remains unchanged.

- [ ] **Step 1: Update failing chevron expectations without CSS assertions**

In `DivinityResourcesPanel.test.tsx` and `HeroGuideSelector.test.tsx`, expect the text child to remain `›` in both states and keep the existing functional expanded/collapsed assertions. Remove the old glyph-pair and transform-style assertions. CSS rotation direction is browser-QA-only.

- [ ] **Step 2: Add failing manual-copy assertions**

In `DivinityManualScreen.test.tsx`, assert these user-visible sentences:

```tsx
expect(
  screen.getByText(
    "Введите количество ресурса от 0 до 999 в поле рядом с его иконкой.",
  ),
).toBeTruthy();
expect(
  screen.getByText(
    "Новое значение попадёт в расчёт только после нажатия на галочку.",
  ),
).toBeTruthy();
expect(
  screen.getByText(
    "Чтобы очистить сохранённое значение, нажмите кнопку с урной.",
  ),
).toBeTruthy();
```

- [ ] **Step 3: Run focused tests and verify RED**

```bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/divinity/__tests__/DivinityManualScreen.test.tsx
```

Expected: FAIL on the old glyph pair and missing manual text.

- [ ] **Step 4: Use the narrow rotating chevron in native dropdowns**

In both `DivinityResourcesPanel.tsx` and `HeroGuideSelector.tsx`, render `›` for both states. Apply the direction to the existing fixed `chevronBox`:

```tsx
<View
  style={[
    styles.chevronBox,
    isExpanded ? styles.chevronExpanded : styles.chevronCollapsed,
  ]}
>
  <Text style={styles.chevron}>›</Text>
</View>
```

```ts
chevronCollapsed: { transform: [{ rotate: "90deg" }] },
chevronExpanded: { transform: [{ rotate: "-90deg" }] },
```

- [ ] **Step 5: Update the web-only branch dropdown chevron**

In `BranchBuilderGrid.tsx`, keep one `›` character and change the inline transform to:

```ts
transform: open ? "rotate(-90deg)" : "rotate(90deg)",
```

Do not modify the existing correct `‹` and `›` navigation indicators.

- [ ] **Step 6: Update the «Мои ресурсы» manual section**

Add these items before the existing chest-allocation explanation:

```tsx
"Введите количество ресурса от 0 до 999 в поле рядом с его иконкой.",
"Новое значение попадёт в расчёт только после нажатия на галочку.",
"Чтобы очистить сохранённое значение, нажмите кнопку с урной.",
```

Keep the separate `+` / `−` description in «Расчёт с учётом текущего прогресса» unchanged.

- [ ] **Step 7: Run focused tests and TypeScript and verify GREEN**

```bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/divinity/__tests__/DivinityManualScreen.test.tsx
npx tsc --noEmit
```

Expected: all focused suites and TypeScript PASS.

---

### Task 4: Widen and center the resource editor group

**Files:**
- Modify: `src/features/divinity/ui/DivinityResourcesPanel.tsx`

**Interfaces:**
- The resource icon and visible level label remain fixed at the left edge.
- The input becomes visibly wider while remaining fixed-width for values through `999`.
- The `[input][action slot]` group is centered in the row area after the identity column.
- Input and action slot keep a fixed gap; the reserved empty action slot prevents horizontal jumping.
- This is CSS/layout-only. Do not add or change tests for widths, centering, gaps, or styles.

- [ ] **Step 1: Inspect the existing compact row styles**

Confirm that `resourceIdentity`, `countEditor`, `countInput`, and `countActionSlot` remain the only layout surfaces needed. Do not change draft, save, clear, reset, or allocation behavior.

- [ ] **Step 2: Apply the mobile layout refinement**

Keep `resourceIdentity` fixed left. Make the remaining row area a centered editor region, widen `countInput`, and preserve a fixed gap before the existing 40 px action slot. Keep the full layout safe at 320 px width.

- [ ] **Step 3: Perform source-only checks**

Run `git diff --check` for the touched file and inspect the diff. Do not add or run CSS/style tests. Root performs the visual check on localhost.

---

### Task 5: Integrated verification and localhost QA

**Files:**
- Verify all files from Tasks 1 through 4.
- Do not modify unrelated files.

- [ ] **Step 1: Run all divinity tests**

~~~bash
npm test -- --runInBand src/features/divinity/__tests__
~~~

Expected: every divinity suite PASS.

- [ ] **Step 2: Run full repository verification**

~~~bash
npm test -- --runInBand
npx tsc --noEmit
npm run export:web
git diff --check
~~~

Expected: all commands exit 0. The existing non-failing Supabase Node-version warning may remain.

- [ ] **Step 3: Verify localhost at the user viewport**

At http://localhost:8081/divinity with the 730 by 839 viewport:

- each expanded row contains only icon/label, input, and its stable action slot;
- each icon/label remains on the left while the wider input/action group is centered with a stable gap;
- no minus, plus, or separate counter remains;
- mixed input is filtered to at most three digits;
- the remaining cost does not change before confirmation;
- confirmation saves the value, updates cost, hides check, and shows trash for a positive value;
- trash saves zero and disappears;
- a draft is discarded by collapse/reopen;
- global resource reset synchronizes every input to zero;
- resource panel, Builder hero selector, and web branch dropdown use the same narrow chevron shape with the correct open/closed direction;
- the manual describes input, check and trash behavior while retaining the separate ring-progress `+` / `−` instructions;
- all assets load and there is no horizontal overflow or captured console error.

- [ ] **Step 4: Review final uncommitted scope**

~~~bash
git status --short
git diff --stat
git diff --check
~~~

Expected: only the approved input spec/plan and Task 1/2 source/test files are uncommitted. Do not commit or push.
