# Divinity Calculator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first mobile Mythic Heroes calculator screen for Divinity progression with local persistence and room to add more calculators later.

**Architecture:** Start with an Expo React Native app organized by feature. Keep game data in local JSON, calculation logic in pure TypeScript modules, and user progress in a small persistence layer backed by AsyncStorage. This keeps the MVP simple while leaving a clean path to add more screens and eventually swap persistence to SQLite if needed.

**Tech Stack:** React Native, Expo, TypeScript, Expo Router, AsyncStorage, Jest, React Native Testing Library

---

## File Structure

- `package.json` - project scripts and dependencies.
- `app/_layout.tsx` - app-level navigation shell.
- `app/index.tsx` - home screen with the `Божественность` entry button.
- `app/divinity.tsx` - Divinity calculator screen.
- `src/features/divinity/data/divinity-steps.json` - static game progression data.
- `src/features/divinity/model/types.ts` - divinity domain types.
- `src/features/divinity/model/calculateDivinityTotals.ts` - pure calculation logic.
- `src/features/divinity/model/getNextDivinityStep.ts` - progression lookup helper.
- `src/features/divinity/storage/divinityProgressStorage.ts` - save/load/reset user progress.
- `src/features/divinity/hooks/useDivinityProgress.ts` - screen-facing state and persistence orchestration.
- `src/features/divinity/ui/DivinitySummary.tsx` - current level and total resource summary.
- `src/features/divinity/ui/DivinityStepBreakdown.tsx` - current step cost display.
- `src/features/divinity/ui/DivinityControls.tsx` - increment/reset controls.
- `src/features/divinity/__tests__/calculateDivinityTotals.test.ts` - unit tests for totals.
- `src/features/divinity/__tests__/divinityProgressStorage.test.ts` - persistence tests.
- `src/features/divinity/__tests__/divinityScreen.test.tsx` - screen behavior test.
- `jest.config.js` - test configuration.
- `babel.config.js` - Expo/Jest configuration if needed.
- `tsconfig.json` - TypeScript config.
- `README.md` - setup and run instructions.

### Task 1: Scaffold The Expo App

**Files:**
- Create: `package.json`
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `tsconfig.json`
- Create: `babel.config.js`
- Create: `jest.config.js`
- Create: `README.md`

- [ ] **Step 1: Initialize the Expo TypeScript app skeleton**

Create the base Expo project with file-based routing support and TypeScript-ready config.

- [ ] **Step 2: Add navigation and storage dependencies**

Install:
`expo-router`
`@react-native-async-storage/async-storage`
`react-native-safe-area-context`
`react-native-screens`

- [ ] **Step 3: Add test dependencies**

Install:
`jest`
`jest-expo`
`@testing-library/react-native`
`@testing-library/jest-native`
`react-test-renderer`

- [ ] **Step 4: Configure app shell**

Set up root layout and a minimal home screen with a single `Божественность` button that opens the calculator screen.

- [ ] **Step 5: Verify the app boots**

Run: `npm run test -- --help`
Expected: Jest CLI help prints without config errors.

- [ ] **Step 6: Commit**

```bash
git add package.json app/_layout.tsx app/index.tsx tsconfig.json babel.config.js jest.config.js README.md
git commit -m "chore: scaffold expo divinity calculator app"
```

### Task 2: Define Divinity Data Model

**Files:**
- Create: `src/features/divinity/data/divinity-steps.json`
- Create: `src/features/divinity/model/types.ts`
- Test: `src/features/divinity/__tests__/calculateDivinityTotals.test.ts`

- [ ] **Step 1: Write the failing model test**

```ts
import steps from "../data/divinity-steps.json";

test("divinity steps expose level transitions and stone costs", () => {
  expect(steps[0]).toMatchObject({
    fromLevel: 0,
    toLevel: 1,
    totalCost: { stone5: 0, stone6: 0, stone7: 0 },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- calculateDivinityTotals.test.ts`
Expected: FAIL because files do not exist yet.

- [ ] **Step 3: Create the domain types and JSON shape**

Represent each step as:
- `fromLevel`
- `toLevel`
- `tapCost`
- `finishCost`
- `totalCost`

Store normalized numeric values per stone tier:

```json
{
  "fromLevel": 18,
  "toLevel": 19,
  "tapCost": { "stone5": 50, "stone6": 0, "stone7": 0 },
  "finishCost": { "stone5": 20, "stone6": 0, "stone7": 0 },
  "totalCost": { "stone5": 70, "stone6": 0, "stone7": 0 }
}
```

Include a synthetic initial entry for level `0` so the UI has a stable empty state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- calculateDivinityTotals.test.ts`
Expected: PASS for the shape assertion.

- [ ] **Step 5: Commit**

```bash
git add src/features/divinity/data/divinity-steps.json src/features/divinity/model/types.ts src/features/divinity/__tests__/calculateDivinityTotals.test.ts
git commit -m "feat: add divinity progression data model"
```

### Task 3: Build Pure Calculation Logic

**Files:**
- Create: `src/features/divinity/model/calculateDivinityTotals.ts`
- Create: `src/features/divinity/model/getNextDivinityStep.ts`
- Modify: `src/features/divinity/__tests__/calculateDivinityTotals.test.ts`

- [ ] **Step 1: Extend tests for cumulative totals**

```ts
import { calculateDivinityTotals } from "../model/calculateDivinityTotals";

test("calculates cumulative costs up to the selected level", () => {
  const result = calculateDivinityTotals(sampleSteps, 20);
  expect(result).toEqual({
    currentLevel: 20,
    totalCost: { stone5: 134, stone6: 16, stone7: 0 },
  });
});
```

- [ ] **Step 2: Add a test for next-step breakdown**

```ts
import { getNextDivinityStep } from "../model/getNextDivinityStep";

test("returns the next step cost for the current level", () => {
  expect(getNextDivinityStep(sampleSteps, 19)?.toLevel).toBe(20);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- calculateDivinityTotals.test.ts`
Expected: FAIL because calculation modules are missing.

- [ ] **Step 4: Implement the minimal pure functions**

`calculateDivinityTotals` should:
- sum all `totalCost` entries up to the selected level;
- return zeros for level `0`;
- avoid UI concerns.

`getNextDivinityStep` should:
- return the matching step for the current level;
- return `null` at the final level.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- calculateDivinityTotals.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/divinity/model/calculateDivinityTotals.ts src/features/divinity/model/getNextDivinityStep.ts src/features/divinity/__tests__/calculateDivinityTotals.test.ts
git commit -m "feat: add divinity calculation engine"
```

### Task 4: Add Local Progress Persistence

**Files:**
- Create: `src/features/divinity/storage/divinityProgressStorage.ts`
- Create: `src/features/divinity/hooks/useDivinityProgress.ts`
- Create: `src/features/divinity/__tests__/divinityProgressStorage.test.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
import { saveDivinityProgress, loadDivinityProgress } from "../storage/divinityProgressStorage";

test("loads saved current level", async () => {
  await saveDivinityProgress({ currentLevel: 3 });
  await expect(loadDivinityProgress()).resolves.toEqual({ currentLevel: 3 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- divinityProgressStorage.test.ts`
Expected: FAIL because storage module does not exist yet.

- [ ] **Step 3: Implement persistence helpers**

Persist a minimal payload:

```ts
type DivinityProgressRecord = {
  currentLevel: number;
  updatedAt: string;
};
```

Add helpers:
- `loadDivinityProgress`
- `saveDivinityProgress`
- `resetDivinityProgress`

- [ ] **Step 4: Add a screen-facing hook**

`useDivinityProgress` should:
- load saved progress on mount;
- expose `currentLevel`;
- expose `incrementLevel`;
- expose `resetLevel`;
- persist after changes.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- divinityProgressStorage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/divinity/storage/divinityProgressStorage.ts src/features/divinity/hooks/useDivinityProgress.ts src/features/divinity/__tests__/divinityProgressStorage.test.ts
git commit -m "feat: persist divinity progress locally"
```

### Task 5: Implement The Divinity Screen

**Files:**
- Create: `app/divinity.tsx`
- Create: `src/features/divinity/ui/DivinitySummary.tsx`
- Create: `src/features/divinity/ui/DivinityStepBreakdown.tsx`
- Create: `src/features/divinity/ui/DivinityControls.tsx`
- Create: `src/features/divinity/__tests__/divinityScreen.test.tsx`

- [ ] **Step 1: Write the failing screen test**

```tsx
test("increments level and shows updated totals", async () => {
  const { getByText } = render(<DivinityScreen />);
  fireEvent.press(getByText("Повысить"));
  expect(getByText("Текущий уровень: 1")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- divinityScreen.test.tsx`
Expected: FAIL because screen components do not exist yet.

- [ ] **Step 3: Build the UI components**

The screen should show:
- title `Божественность`;
- current level;
- current step cost;
- cumulative totals for stone 5/6/7;
- `Повысить` button;
- `Сбросить` button.

Keep components dumb and pass derived data through props.

- [ ] **Step 4: Wire the screen to the hook and calculation logic**

The screen should:
- read the current level from `useDivinityProgress`;
- compute totals using pure functions;
- disable increment at the last known level.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- divinityScreen.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/divinity.tsx src/features/divinity/ui/DivinitySummary.tsx src/features/divinity/ui/DivinityStepBreakdown.tsx src/features/divinity/ui/DivinityControls.tsx src/features/divinity/__tests__/divinityScreen.test.tsx
git commit -m "feat: add divinity calculator screen"
```

### Task 6: Final Verification And Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add setup instructions**

Document:
- install dependencies;
- run Expo;
- run tests;
- where divinity data lives.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Start the app locally**

Run: `npx expo start --offline`
Expected: Expo dev server starts without route or bundler errors.

- [ ] **Step 4: Smoke-test the MVP manually**

Verify:
- home screen opens;
- `Божественность` button navigates;
- level starts at `0`;
- `Повысить` changes the level;
- totals update;
- closing and reopening restores progress;
- `Сбросить` clears progress.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add divinity calculator setup and verification"
```

## Notes

- The spreadsheet values from `/Users/mymaughem/Downloads/Divinity Stones.xlsx` should be normalized into JSON before UI work starts.
- The MVP should keep all labels centralized enough that later localization or terminology tweaks do not require rewriting the calculation logic.
- If user progress grows beyond a single `currentLevel`, migrate the storage adapter behind the same interface instead of rewriting screen code.
