# Antique Rivalry Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить отдельный экран «Антиквариат», который распределяет монеты исследования между картами гробницы и храма и каскадно рассчитывает очки, 16 узлов наград, четыре крупных сундука и кешбэк события.

**Architecture:** Статические правила события принадлежат локальному каталогу `features/game-data/antiques`; нормализация, конвертация и каскадный расчёт реализуются чистыми функциями в `features/antiques/model`. Отдельный hook сохраняет только пользовательские вводы и распределение, а экран собирает производный результат из небольших presentation-компонентов.

**Tech Stack:** Expo Router, React Native, TypeScript, AsyncStorage, Jest, React Native Testing Library.

## Global Constraints

- Призыв героев и его очки не изменяются.
- 1 карта гробницы = 500 монет = 30 очков.
- 1 карта храма = 1000 монет = 60 очков.
- Шкала содержит 16 узлов по 750 очков; крупные сундуки находятся на 3000, 6000, 9000 и 12 000.
- Полученные из узлов карты тратятся в этом же событии каскадно; каждый узел выдаёт награду не более одного раза.
- Фрагменты легендарного и мифического сундуков отображаются, но не дают очков.
- Runtime-источник игровых правил — локальные типизированные данные; сетевые запросы запрещены.
- Asset paths имеют вид `/img/antiques/...` и разрешаются через `resolveAssetUri`; неподтверждённая иконка заменяется контролируемой текстовой заглушкой.
- Компоненты размещаются в `src/features/antiques/components`, не в новом `ui`-каталоге.
- Production-код каждого поведения добавляется только после соответствующего падающего теста.

## File Map

- Create `src/features/game-data/antiques/types.ts`: contracts for thresholds and cumulative rewards.
- Create `src/features/game-data/antiques/antique-rivalry-rewards.json`: 17 cumulative rows from 0 through 12 000.
- Create `src/features/game-data/antiques/index.ts`: typed public catalog API and constants.
- Create `src/features/game-data/antiques/__tests__/antiqueRivalryCatalog.test.ts`: catalog integrity.
- Create `src/features/antiques/model/types.ts`: input, allocation, cashback, and result contracts.
- Create `src/features/antiques/model/normalizeAntiqueInput.ts`: integer/nonnegative normalization.
- Create `src/features/antiques/model/allocateAntiqueCoins.ts`: 2:1 linked allocation actions.
- Create `src/features/antiques/model/calculateAntiqueRivalry.ts`: base and cascading totals.
- Create `src/features/antiques/__tests__/antiqueModel.test.ts`: pure model tests.
- Create `src/features/antiques/storage/antiqueCalculatorStorage.ts`: isolated persistence.
- Create `src/features/antiques/hooks/useAntiqueCalculator.ts`: state/actions facade.
- Create `src/features/antiques/__tests__/antiqueCalculatorStorage.test.ts` and `useAntiqueCalculator.test.tsx`: persistence tests.
- Create `src/features/antiques/components/AntiqueResourceIcon.tsx`: confirmed icon or placeholder.
- Create `src/features/antiques/components/AntiqueSummary.tsx`: score cards.
- Create `src/features/antiques/components/AntiqueCoinAllocation.tsx`: coin input and linked controls.
- Create `src/features/antiques/components/AntiqueOwnedCards.tsx`: owned-card inputs.
- Create `src/features/antiques/components/AntiqueRewardTrack.tsx`: 16-node track.
- Create `src/features/antiques/components/AntiqueCashback.tsx`: earned resources.
- Create `src/features/antiques/screens/AntiqueScreen.tsx`: screen composition.
- Create `src/features/antiques/__tests__/AntiqueScreen.test.tsx`: interaction and rendering tests.
- Create `app/antiques.tsx`: thin route.
- Modify `app/_layout.tsx`: register headerless route.
- Modify `src/features/home/screens/HomeScreen.tsx`: add calculator link.
- Modify `src/features/home/__tests__/HomeScreen.test.tsx`: navigation entry coverage.
- Create confirmed PNG files under `public/img/antiques/` only when APK mapping is unambiguous.

---

### Task 1: Event reward catalog

**Files:**
- Create: `src/features/game-data/antiques/types.ts`
- Create: `src/features/game-data/antiques/antique-rivalry-rewards.json`
- Create: `src/features/game-data/antiques/index.ts`
- Create: `src/features/game-data/antiques/__tests__/antiqueRivalryCatalog.test.ts`

**Interfaces:**
- Consumes: cumulative Excel rows at thresholds 0, 750, ..., 12 000.
- Produces: `ANTIQUE_EVENT_MAX_SCORE`, `ANTIQUE_NODE_STEP`, `ANTIQUE_MAJOR_THRESHOLDS`, `antiqueRivalryRewards`, and `AntiqueRivalryReward`.

- [ ] **Step 1: Write the failing catalog integrity test**

```ts
import {
  ANTIQUE_EVENT_MAX_SCORE,
  ANTIQUE_MAJOR_THRESHOLDS,
  ANTIQUE_NODE_STEP,
  antiqueRivalryRewards,
} from "..";

test("defines every cumulative rivalry reward node", () => {
  expect(ANTIQUE_NODE_STEP).toBe(750);
  expect(ANTIQUE_EVENT_MAX_SCORE).toBe(12_000);
  expect(ANTIQUE_MAJOR_THRESHOLDS).toEqual([3000, 6000, 9000, 12_000]);
  expect(antiqueRivalryRewards.map((row) => row.score)).toEqual(
    Array.from({ length: 17 }, (_, index) => index * 750),
  );
  expect(antiqueRivalryRewards.at(-1)).toEqual({
    score: 12_000,
    tombMaps: 60,
    templeMaps: 20,
    legendaryChestFragments: 600,
    mythicChestFragments: 200,
  });
});

test("keeps cumulative rewards monotonic", () => {
  for (let index = 1; index < antiqueRivalryRewards.length; index += 1) {
    const previous = antiqueRivalryRewards[index - 1];
    const current = antiqueRivalryRewards[index];
    expect(current.tombMaps).toBeGreaterThanOrEqual(previous.tombMaps);
    expect(current.templeMaps).toBeGreaterThanOrEqual(previous.templeMaps);
    expect(current.legendaryChestFragments).toBeGreaterThanOrEqual(previous.legendaryChestFragments);
    expect(current.mythicChestFragments).toBeGreaterThanOrEqual(previous.mythicChestFragments);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand src/features/game-data/antiques/__tests__/antiqueRivalryCatalog.test.ts`

Expected: FAIL because `features/game-data/antiques` does not exist.

- [ ] **Step 3: Add the typed catalog**

```ts
export type AntiqueRivalryReward = {
  score: number;
  tombMaps: number;
  templeMaps: number;
  legendaryChestFragments: number;
  mythicChestFragments: number;
};
```

Populate JSON with the Excel cumulative rows:

```json
[
  {"score":0,"tombMaps":0,"templeMaps":0,"legendaryChestFragments":0,"mythicChestFragments":0},
  {"score":750,"tombMaps":5,"templeMaps":0,"legendaryChestFragments":50,"mythicChestFragments":0},
  {"score":1500,"tombMaps":10,"templeMaps":0,"legendaryChestFragments":100,"mythicChestFragments":0},
  {"score":2250,"tombMaps":15,"templeMaps":0,"legendaryChestFragments":150,"mythicChestFragments":0},
  {"score":3000,"tombMaps":15,"templeMaps":5,"legendaryChestFragments":150,"mythicChestFragments":50},
  {"score":3750,"tombMaps":20,"templeMaps":5,"legendaryChestFragments":200,"mythicChestFragments":50},
  {"score":4500,"tombMaps":25,"templeMaps":5,"legendaryChestFragments":250,"mythicChestFragments":50},
  {"score":5250,"tombMaps":30,"templeMaps":5,"legendaryChestFragments":300,"mythicChestFragments":50},
  {"score":6000,"tombMaps":30,"templeMaps":10,"legendaryChestFragments":300,"mythicChestFragments":100},
  {"score":6750,"tombMaps":35,"templeMaps":10,"legendaryChestFragments":350,"mythicChestFragments":100},
  {"score":7500,"tombMaps":40,"templeMaps":10,"legendaryChestFragments":400,"mythicChestFragments":100},
  {"score":8250,"tombMaps":45,"templeMaps":10,"legendaryChestFragments":450,"mythicChestFragments":100},
  {"score":9000,"tombMaps":45,"templeMaps":15,"legendaryChestFragments":450,"mythicChestFragments":150},
  {"score":9750,"tombMaps":50,"templeMaps":15,"legendaryChestFragments":500,"mythicChestFragments":150},
  {"score":10500,"tombMaps":55,"templeMaps":15,"legendaryChestFragments":550,"mythicChestFragments":150},
  {"score":11250,"tombMaps":55,"templeMaps":15,"legendaryChestFragments":550,"mythicChestFragments":150},
  {"score":12000,"tombMaps":60,"templeMaps":20,"legendaryChestFragments":600,"mythicChestFragments":200}
]
```

Export it with `as AntiqueRivalryReward[]` and the exact constants asserted above.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- --runInBand src/features/game-data/antiques/__tests__/antiqueRivalryCatalog.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/game-data/antiques
git commit -m "feat: добавить данные события антиквариата"
```

### Task 2: Coin allocation and cascading calculator

**Files:**
- Create: `src/features/antiques/model/types.ts`
- Create: `src/features/antiques/model/normalizeAntiqueInput.ts`
- Create: `src/features/antiques/model/allocateAntiqueCoins.ts`
- Create: `src/features/antiques/model/calculateAntiqueRivalry.ts`
- Create: `src/features/antiques/__tests__/antiqueModel.test.ts`

**Interfaces:**
- Consumes: `antiqueRivalryRewards` and constants from Task 1.
- Produces: `normalizeAntiqueCount`, `getCoinAllocation`, `convertToTempleMap`, `convertToTombMaps`, and `calculateAntiqueRivalry(input): AntiqueRivalryResult`.

- [ ] **Step 1: Write failing model tests**

```ts
expect(getCoinAllocation(10_000, 0)).toEqual({
  spendableCoins: 10_000,
  unusedCoins: 0,
  tombMaps: 20,
  templeMaps: 0,
  templeMapAllocation: 0,
});
expect(getCoinAllocation(10_499, 10)).toMatchObject({
  unusedCoins: 499,
  tombMaps: 0,
  templeMaps: 10,
});
expect(convertToTempleMap({ coins: 10_000, templeMapAllocation: 0 })).toBe(1);
expect(convertToTombMaps({ coins: 10_000, templeMapAllocation: 1 })).toBe(0);

const result = calculateAntiqueRivalry({
  coins: 10_000,
  templeMapAllocation: 0,
  ownedTombMaps: 0,
  ownedTempleMaps: 0,
});
expect(result.baseScore).toBe(600);
expect(result.totalScore).toBe(600);
expect(result.openedNodes).toBe(0);
expect(result.openedMajorChests).toBe(0);

const cascade = calculateAntiqueRivalry({
  coins: 0,
  templeMapAllocation: 0,
  ownedTombMaps: 25,
  ownedTempleMaps: 0,
});
expect(cascade.baseScore).toBe(750);
expect(cascade.cashback.tombMaps).toBe(5);
expect(cascade.totalScore).toBe(900);
expect(cascade.openedNodes).toBe(1);
```

Add cases for invalid values, 2:1 score invariance, multi-threshold cascade, 16/4 caps, and confirmation that cashback deltas are applied once even when they unlock a later node. Exact cumulative rows at 3000, 6000, 9000 and 12 000 remain covered by the catalog test; the cascading result may legitimately progress beyond the base-score row.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- --runInBand src/features/antiques/__tests__/antiqueModel.test.ts`

Expected: FAIL because the model modules do not exist.

- [ ] **Step 3: Implement normalization and allocation**

```ts
export function normalizeAntiqueCount(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function getCoinAllocation(coins: unknown, templeMapAllocation: unknown) {
  const normalizedCoins = normalizeAntiqueCount(coins);
  const maxTempleMaps = Math.floor(normalizedCoins / 1000);
  const templeMaps = Math.min(normalizeAntiqueCount(templeMapAllocation), maxTempleMaps);
  const spendableCoins = Math.floor(normalizedCoins / 500) * 500;
  return {
    spendableCoins,
    unusedCoins: normalizedCoins - spendableCoins,
    tombMaps: spendableCoins / 500 - templeMaps * 2,
    templeMaps,
    templeMapAllocation: templeMaps,
  };
}
```

The conversion helpers clamp allocation to `[0, floor(coins / 1000)]`.

- [ ] **Step 4: Implement the terminating cascade**

Define `AntiqueRivalryResult` with `baseScore`, `totalScore`, `scoreRemaining`, `openedNodes`, `openedMajorChests`, `allocation`, `cashback`, and `spentMaps`. Start from the base score, walk reward rows in ascending order, and when `totalScore >= row.score`, apply only `row - previousRow` once. Add newly awarded map points immediately. Stop after one finite pass because score only increases and rows are ascending; a newly increased score naturally unlocks later rows in the same pass.

```ts
for (let index = 1; index < antiqueRivalryRewards.length; index += 1) {
  const current = antiqueRivalryRewards[index];
  if (totalScore < current.score) break;
  const previous = antiqueRivalryRewards[index - 1];
  const tombDelta = current.tombMaps - previous.tombMaps;
  const templeDelta = current.templeMaps - previous.templeMaps;
  totalScore += tombDelta * 30 + templeDelta * 60;
  // Accumulate all four deltas exactly once.
}
```

- [ ] **Step 5: Run model tests and verify GREEN**

Run: `npm test -- --runInBand src/features/antiques/__tests__/antiqueModel.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/antiques/model src/features/antiques/__tests__/antiqueModel.test.ts
git commit -m "feat: добавить каскадный расчет антиквариата"
```

### Task 3: Persistent calculator state

**Files:**
- Create: `src/features/antiques/storage/antiqueCalculatorStorage.ts`
- Create: `src/features/antiques/hooks/useAntiqueCalculator.ts`
- Create: `src/features/antiques/__tests__/antiqueCalculatorStorage.test.ts`
- Create: `src/features/antiques/__tests__/useAntiqueCalculator.test.tsx`

**Interfaces:**
- Consumes: normalization and allocation APIs from Task 2.
- Produces: `loadAntiqueCalculator`, `saveAntiqueCalculator`, `resetAntiqueCalculator`, and `useAntiqueCalculator()` with explicit setters/conversion actions.

- [ ] **Step 1: Write failing persistence tests**

Test that missing/malformed storage normalizes to `{ coins: 0, templeMapAllocation: 0, ownedTombMaps: 0, ownedTempleMaps: 0 }`; setters persist; changing coins clamps temple allocation; conversion actions change allocation by one; reset affects only key `antique-rivalry-calculator`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --runInBand src/features/antiques/__tests__/antiqueCalculatorStorage.test.ts src/features/antiques/__tests__/useAntiqueCalculator.test.tsx`

Expected: FAIL because storage and hook modules do not exist.

- [ ] **Step 3: Implement storage**

Use `AsyncStorage`, the exact key `antique-rivalry-calculator`, normalized fields, and `updatedAt`. Catch invalid JSON on load and return the normalized empty record instead of crashing.

- [ ] **Step 4: Implement the hook**

Mirror the ref-backed update approach of `useDivinityResources`. Return:

```ts
{
  input,
  isLoaded,
  setCoins,
  setOwnedTombMaps,
  setOwnedTempleMaps,
  convertOneToTemple,
  convertOneToTombs,
  reset,
}
```

Every action normalizes, updates React state, and awaits persistence.

- [ ] **Step 5: Run tests and verify GREEN**

Run the same targeted command; expected PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/antiques/hooks src/features/antiques/storage src/features/antiques/__tests__
git commit -m "feat: сохранять данные калькулятора антиквариата"
```

### Task 4: APK resource mapping and controlled icons

**Files:**
- Create: `src/features/antiques/components/AntiqueResourceIcon.tsx`
- Create: `src/features/antiques/__tests__/AntiqueResourceIcon.test.tsx`
- Create when confirmed: `public/img/antiques/<confirmed-name>.png`
- Modify: `src/features/game-data/antiques/types.ts`
- Modify: `src/features/game-data/antiques/index.ts`

**Interfaces:**
- Consumes: extracted `OlympusTypeTable`, `OlympusTaskRewardTable`, resource catalogs, and Unity bundle sprites.
- Produces: stable `AntiqueResourceKind`, catalog display metadata, and placeholder-safe icon rendering.

- [ ] **Step 1: Resolve resource ids read-only**

Decode the reward resource columns for thresholds 750–12 000, join them to the client resource table, and search the bundle central directory for matching sprite names. Record an id/path only when both the config relationship and sprite name agree. Do not infer an id from Excel wording alone.

- [ ] **Step 2: Write the failing icon test**

Assert that confirmed entries render through `resolveAssetUri`, while an entry without `icon` renders its short Russian fallback label and never produces an empty/broken image URI.

- [ ] **Step 3: Run test and verify RED**

Run: `npm test -- --runInBand src/features/antiques/__tests__/AntiqueResourceIcon.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 4: Add confirmed assets and component**

Copy only confirmed PNGs to `public/img/antiques/`. Implement `AntiqueResourceIcon` with `Image` when catalog metadata has an icon and a fixed-size styled `View` containing `fallbackLabel` otherwise.

- [ ] **Step 5: Verify assets and test**

Run the targeted test and `find public/img/antiques -type f -maxdepth 1` when assets were confirmed. Expected: PASS and every catalog path exists; if none are confirmed, PASS using controlled fallbacks and no new PNGs.

- [ ] **Step 6: Commit**

```bash
git add src/features/game-data/antiques src/features/antiques/components/AntiqueResourceIcon.tsx src/features/antiques/__tests__/AntiqueResourceIcon.test.tsx public/img/antiques
git commit -m "feat: добавить ресурсы антиквариата"
```

Omit the `public/img/antiques` argument if no PNG was confirmed.

### Task 5: Calculator presentation components

**Files:**
- Create: `src/features/antiques/components/AntiqueSummary.tsx`
- Create: `src/features/antiques/components/AntiqueCoinAllocation.tsx`
- Create: `src/features/antiques/components/AntiqueOwnedCards.tsx`
- Create: `src/features/antiques/components/AntiqueRewardTrack.tsx`
- Create: `src/features/antiques/components/AntiqueCashback.tsx`
- Create: `src/features/antiques/__tests__/AntiqueComponents.test.tsx`

**Interfaces:**
- Consumes: `AntiqueRivalryResult`, normalized values, and explicit callbacks.
- Produces: stateless presentation blocks used by `AntiqueScreen`.

- [ ] **Step 1: Write failing component tests**

Assert exact labels and values, all 16 accessible nodes, major markers at four thresholds, numeric inputs, disabled initial `+` tomb/`−` temple buttons, conversion callbacks, unused coin copy, and four cashback resources.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- --runInBand src/features/antiques/__tests__/AntiqueComponents.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement the components**

Use React Native `View`, `Text`, `TextInput`, `Pressable`, and `Image`; set `keyboardType="number-pad"`, accessibility labels for every button and node, `disabled` plus disabled styles, and no calculations inside components. Accept numeric values as props and send raw input text to parent callbacks for normalization.

- [ ] **Step 4: Run tests and verify GREEN**

Run the same targeted test; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/antiques/components src/features/antiques/__tests__/AntiqueComponents.test.tsx
git commit -m "feat: добавить интерфейс расчета антиквариата"
```

### Task 6: Screen, routing, and home entry

**Files:**
- Create: `src/features/antiques/screens/AntiqueScreen.tsx`
- Create: `src/features/antiques/__tests__/AntiqueScreen.test.tsx`
- Create: `app/antiques.tsx`
- Modify: `app/_layout.tsx`
- Modify: `src/features/home/screens/HomeScreen.tsx`
- Modify: `src/features/home/__tests__/HomeScreen.test.tsx`

**Interfaces:**
- Consumes: hook from Task 3, calculation from Task 2, and components from Task 5.
- Produces: route `/antiques` and user-visible home navigation.

- [ ] **Step 1: Write failing screen and home tests**

Mock the hook with a loaded state, render the screen, and assert title, initial summary, all sections, conversion action forwarding, reset, and back fallback to `/`. Extend the home test to assert a link/button named `Антиквариат` targeting `/antiques`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --runInBand src/features/antiques/__tests__/AntiqueScreen.test.tsx src/features/home/__tests__/HomeScreen.test.tsx`

Expected: FAIL because the screen and link do not exist.

- [ ] **Step 3: Implement route and screen composition**

`app/antiques.tsx` contains only:

```ts
export { default } from "../src/features/antiques/screens/AntiqueScreen";
```

The screen mirrors the safe-area header/scroll structure of `DivinityScreen`, calculates once from hook input, renders summary first, then allocation, owned cards, reward track, cashback, and reset. Register `<Stack.Screen name="antiques" options={{ headerShown: false }} />`.

- [ ] **Step 4: Add the home link**

Add a second calculator `Link` with `href="/antiques"`, `asChild`, and visible text `Антиквариат`. Add vertical spacing through a calculator-list gap rather than one-off margins.

- [ ] **Step 5: Run tests and verify GREEN**

Run the same targeted command; expected PASS.

- [ ] **Step 6: Commit**

```bash
git add app/antiques.tsx app/_layout.tsx src/features/antiques src/features/home
git commit -m "feat: добавить экран антиквариата"
```

### Task 7: Full verification and visual QA

**Files:**
- Modify only files required to fix defects found by verification.

**Interfaces:**
- Consumes: completed feature from Tasks 1–6.
- Produces: verified mobile/web calculator with no regressions.

- [ ] **Step 1: Run all tests**

Run: `npm test -- --runInBand`

Expected: all suites PASS without new warnings.

- [ ] **Step 2: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Build web output**

Run: `npm run export:web`

Expected: Expo export completes and includes `/antiques` without broken asset errors.

- [ ] **Step 4: Verify calculator examples manually**

Check 10 000 coins as `20/0` and `0/10`: both produce 600 base points. Check 499 coins: no cards and 499 unused. Check a value just below a threshold and one that reaches the next threshold only through cashback. Confirm 16/4 caps at and above 12 000.

- [ ] **Step 5: Visual QA at two widths**

Start web with `npm start -- --web`, inspect `/antiques` at a narrow mobile viewport and a wide desktop viewport, and confirm no clipping, overlapping controls, broken icons, or unreadable disabled states. Verify home navigation and back navigation.

- [ ] **Step 6: Fix defects test-first and rerun affected checks**

For every behavioral defect, add a failing regression test, run it to confirm RED, apply the smallest fix, then rerun the targeted test and the affected full check.

- [ ] **Step 7: Commit verification fixes if any**

```bash
git add app/antiques.tsx app/_layout.tsx src/features/antiques src/features/game-data/antiques src/features/home public/img/antiques
git commit -m "fix: уточнить экран антиквариата"
```

Skip this commit when verification required no changes.
