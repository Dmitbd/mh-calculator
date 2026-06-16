# Iconic Weapon Node Bonuses Specification

Date: 2026-06-16

## Goal

Add calculated bonus descriptions for Iconic Weapon awakening node colors.

The builder and the hero build view already show 8 weapon awakening circles. This task adds the missing meaning of color combinations:

- count selected weapon awakening node colors;
- show active bonuses only when a color appears at least 2 times;
- support several active colors at once, for example `2 red + 2 blue`;
- hide bonus information when every selected color appears only once;
- use hero class to choose the correct bonus text;
- show the same calculated information in the builder and in the hero build page.

## Verified Source

Source checked: `Iconic Weapons` on Fandom.

URL:

- `https://mythic-heroes.fandom.com/wiki/Iconic_Weapons`

Confirmed source facts:

- Iconic Weapons unlock after Chapter 11-04.
- Iconic Weapons have 5 attributes linked to Zodiac Caverns beasts.
- Weapon awakening requires:
  - `225` total attribute points;
  - `150k` gold;
  - hero at least `Mythic I`.
- Weapon refinement unlocks weapon nodes.
- New nodes unlock at refinement levels `2 / 5 / 8 / 11 / 14 / 17 / 20`.
- Total node count is up to `8`.
- Each node has one of five colors: red, yellow, green, blue, purple.
- Color bonuses depend on hero type:
  - Tank;
  - Physical Fighter;
  - Magical Fighter;
  - Support.
- Bonuses have 3 tiers and require `2 / 4 / 8` nodes of the same color.
- A single node of a color gives no color bonus.

Note: the `Wind` page is not the correct source for this mechanic. It is a hero listing page, not the Iconic Weapon node system.

## Current Project Context

Relevant existing files:

- `src/features/admin/components/WeaponAwakeningPicker.tsx`
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- `src/features/admin/types/admin.types.ts`
- `src/features/admin/utils/weaponAwakening.ts`
- `src/features/heroes/screens/HeroBuildScreen.tsx`
- `src/features/heroes/utils/mapBuildToView.ts`
- `src/features/game-data/weapon-awakening/weapon-awakening-colors.json`
- `src/features/game-data/weapon-awakening/weapon-awakening-slots.json`
- `src/features/game-data/weapon-awakening/weapon-awakening-combos.json`
- `src/features/game-data/heroes/heroes.json`

Current state:

- colors already exist with ids `red`, `yellow`, `green`, `blue`, `purple`;
- slots already exist as 8 positions;
- `weapon-awakening-combos.json` exists but currently contains an empty `combos` array;
- builder stores selected colors as `Partial<Record<number, WeaponAwakeningColorId>>`;
- export stores weapon awakening as array of `{ slot, colorId }`;
- hero catalog stores:
  - `role`: `fighter`, `mage`, `tank`, `support`;
  - `damageType`: `physical`, `magical`, or `null`.

## Brainstormed Approaches

### Option A: Hardcode bonus logic in UI components

Put color counting and text branching directly into `WeaponAwakeningPicker`.

Pros:

- fast to implement;
- few new files.

Cons:

- duplicates logic between builder and hero view;
- hard to test cleanly;
- bonus data becomes hidden in UI code;
- future changes from Fandom require code edits, not data edits.

### Option B: Data-driven bonuses + shared calculation utility

Store all color bonus rules in JSON and add a pure utility that receives hero class and selected colors, then returns active bonuses.

Pros:

- matches current project style: JSON data + small mapping utilities;
- one source of truth for builder and hero view;
- easy to test all thresholds and hero classes;
- future bonus edits are data-only when structure stays the same.

Cons:

- requires new types and a small display component.

Recommendation: use Option B.

### Option C: Store precomputed bonus text in exported builds

Calculate bonuses in the builder and save them into every build JSON.

Pros:

- viewer can render without calculation.

Cons:

- stale data risk when bonus rules are corrected;
- bloats build JSON;
- requires migrations when text changes;
- wrong for localized text because display language should be data/UI driven.

Do not use this option.

## Recommended Architecture

Use three layers:

1. Data layer:
   - `weapon-awakening-colors.json` keeps color dictionary.
   - `weapon-awakening-combos.json` stores bonus rules.
2. Logic layer:
   - a pure utility maps hero catalog metadata to Iconic Weapon class;
   - a pure utility counts selected colors and returns active bonus tiers.
3. UI layer:
   - a shared component renders bonus descriptions under the weapon awakening circles;
   - both builder and hero build page use the same component.

The build JSON should continue to save only selected node colors. Bonus descriptions must be derived at render time.

## Data Model

Keep colors in `weapon-awakening-colors.json`.

Recommended combo data file:

`src/features/game-data/weapon-awakening/weapon-awakening-combos.json`

```json
{
  "schemaVersion": 1,
  "thresholds": [2, 4, 8],
  "combos": [
    {
      "heroClass": "physical-fighter",
      "color": "blue",
      "values": [4, 12, 32],
      "description": {
        "en": "For the Hero directly opposed to this Hero in the enemy's formation, Physical Damage taken is increased by {value}%."
      }
    }
  ]
}
```

Recommended TypeScript types:

```ts
export type IconicWeaponHeroClass =
  | "tank"
  | "physical-fighter"
  | "magical-fighter"
  | "support";

export type WeaponAwakeningComboRule = {
  heroClass: IconicWeaponHeroClass;
  color: WeaponAwakeningColorId;
  values: [number, number, number];
  description: {
    en: string;
  };
};

export type WeaponAwakeningCombosData = {
  schemaVersion: 1;
  thresholds: [2, 4, 8];
  combos: WeaponAwakeningComboRule[];
};
```

Rules:

- `thresholds` are global and ordered.
- `values[index]` maps to `thresholds[index]`.
- `description.en` must contain `{value}` placeholder.
- Bonus text is rendered by replacing `{value}` with the active tier value.
- Bonus effect text should remain in original English from Fandom to avoid changing gameplay meaning during translation.
- Store only rules, not calculated active states.

## Hero Class Mapping

Fandom uses classes that do not exactly match current hero roles. Add a mapper.

Input:

```ts
type Hero = {
  role: "fighter" | "tank" | "mage" | "support";
  damageType: "physical" | "magical" | null;
};
```

Mapping:

- `role: "tank"` -> `tank`;
- `role: "support"` -> `support`;
- `role: "fighter"` + `damageType: "physical"` -> `physical-fighter`;
- `role: "mage"` + `damageType: "magical"` -> `magical-fighter`.

Fallback:

- if class cannot be derived, return `null`;
- UI should not show combo descriptions when class is `null`;
- data integrity tests should catch heroes whose role/damage type cannot map to a class.

Important: do not infer `physical-fighter` or `magical-fighter` from the selected weapon. It must come from hero catalog metadata.

## Bonus Calculation Rules

Create a utility, for example:

`src/features/game-data/weapon-awakening/weaponAwakeningBonuses.ts`

Required functions:

```ts
export function getIconicWeaponHeroClass(hero: Hero): IconicWeaponHeroClass | null;

export function countWeaponAwakeningColors(
  selections: readonly WeaponAwakeningSlotSelection[],
): Partial<Record<WeaponAwakeningColorId, number>>;

export function getWeaponAwakeningActiveBonuses(params: {
  heroClass: IconicWeaponHeroClass | null;
  selections: readonly WeaponAwakeningSlotSelection[];
  rules: readonly WeaponAwakeningComboRule[];
  thresholds: readonly [2, 4, 8];
}): WeaponAwakeningActiveBonus[];
```

Returned active bonus shape:

```ts
export type WeaponAwakeningActiveBonus = {
  color: WeaponAwakeningColorId;
  count: number;
  threshold: 2 | 4 | 8;
  value: number;
  description: string;
};
```

Threshold selection:

- count `0` or `1`: no active bonus;
- count `2` or `3`: threshold `2`;
- count `4` to `7`: threshold `4`;
- count `8`: threshold `8`.

Examples:

- `red, blue, green` -> no bonuses;
- `red, red, blue` -> red tier 2 only;
- `red, red, blue, blue` -> red tier 2 + blue tier 2;
- `red x4, blue x2` -> red tier 4 + blue tier 2;
- `green x8` -> green tier 8.

Sorting:

- active bonuses should follow color dictionary order:
  - red;
  - yellow;
  - green;
  - blue;
  - purple.

## Bonus Data

Add all Fandom rules in original English. Do not translate the effect descriptions in this task: terms such as `Health Bestowal`, `Parry`, `Lifesteal`, `same formational line`, and `immediate flanks` should stay semantically identical to Fandom.

### Tank

- Red: if hero HP is above 50%, Parry +4/12/32%.
  - EN: `Whenever this Hero's Health is above 50%, their Parry increases by {value}%.`
- Yellow: physical damage taken -6/18/48%.
  - EN: `Reduce the Physical damage taken by {value}%.`
- Green: magical damage taken -6/18/48%.
  - EN: `Reduce the Magical damage taken by {value}%.`
- Blue: Health Bestowal of opposite enemy -4/12/32%.
  - EN: `Reduces the Health Bestowal of the enemy directly across from this Hero in opposing formation by {value}%.`
- Purple: defense of allied heroes behind this hero on immediate flanks +4.5/13.5/36%.
  - EN: `Increases the Defense of any allied Heroes behind this Hero (only those on immediate flanks) by {value}%.`

### Physical Fighter

- Red: if hero HP is below 50%, Lifesteal +4.5/13.5/36%.
  - EN: `Whenever this Hero's Health is below 50%, their Lifesteal increases by {value}%.`
- Yellow: damage to frontline enemies +4/12/32%.
  - EN: `Increase this Hero's damage dealt to the frontline enemies by {value}%.`
- Green: if any allied frontline hero is alive, damage taken -3/9/24%.
  - EN: `If any allied frontline Hero is still alive, this Hero's damage taken is reduced by {value}%.`
- Blue: opposite enemy takes more physical damage +4/12/32%.
  - EN: `For the Hero directly opposed to this Hero in the enemy's formation, Physical Damage taken is increased by {value}%.`
- Purple: allied heroes on same formation line attack +1.5/4.5/12%.
  - EN: `Increase the Attack of allied Heroes on the same formational line by {value}%.`

### Magical Fighter

- Red: when attacking enemy with HP above 50%, damage dealt +3/9/24%.
  - EN: `When this Hero attacks an enemy unit with Health higher than 50%, their damage dealt increases by {value}%.`
- Yellow: damage to frontline enemies +4/12/32%.
  - EN: `Increase this Hero's damage dealt to the frontline enemies by {value}%.`
- Green: if any allied frontline hero is alive, damage taken -3/9/24%.
  - EN: `If any allied frontline Hero is still alive, this Hero's damage taken is reduced by {value}%.`
- Blue: opposite enemy takes more magical damage +4/12/32%.
  - EN: `For the Hero directly opposed to this Hero in the enemy's formation, Magical Damage taken is increased by {value}%.`
- Purple: allied heroes on same formation line attack +1.5/4.5/12%.
  - EN: `Increase the Attack of allied Heroes on the same formational line by {value}%.`

### Support

- Red: when healing ally with HP below 50%, Health Bestowal +3/15/40%.
  - EN: `When healing an ally unit with Health lower than 50%, increases this Hero's Health Bestowal by {value}%.`
- Yellow: physical damage taken -6/18/48%.
  - EN: `Reduce the Physical Damage taken by this Hero by {value}%.`
- Green: magical damage taken -6/18/48%.
  - EN: `Reduce the Magical Damage taken by this Hero by {value}%.`
- Blue: opposite enemy defense -8/24/64%.
  - EN: `Reduce the Defense of the enemy Hero directly opposing this one in the enemy formation by {value}%.`
- Purple: defense of allied heroes in front of this hero on immediate flanks +4.5/13.5/36%.
  - EN: `Increases the Defense of any allied Heroes in front of this Hero (only those on immediate flanks) by {value}%.`

## Builder Requirements

The builder must show active color bonus information below weapon awakening circles.

Placement:

- directly under `WeaponAwakeningPicker`;
- visually part of the same section;
- not inside the circles row itself.

Inputs:

- selected hero from `HeroSelectInput`;
- selected weapon awakening colors from builder state;
- combo rules from `weapon-awakening-combos.json`;
- color dictionary from `weapon-awakening-colors.json`.

Behavior:

- if no hero is selected: show no bonus list;
- if hero class cannot be derived: show no bonus list;
- if fewer than 2 nodes of any color are selected: show no bonus list;
- if one color reaches threshold: show one bonus row;
- if several colors reach threshold: show all active bonus rows;
- changing a node color updates descriptions immediately;
- changing selected hero updates hero class and descriptions immediately.

Recommended row content:

- color icon/sphere;
- color name;
- node count, for example `2/8`;
- tier label, for example `Бонус за 2 ноды`;
- calculated original English description.

Example for Bastet if she maps to `physical-fighter`:

```text
Пробуждение оружия
[nodes...]

Активные бонусы цветов
Зелёный · 2/8 · Бонус за 2 ноды
If any allied frontline Hero is still alive, this Hero's damage taken is reduced by 3%.
```

## Hero Build View Requirements

The hero build page must show the same active color bonus information below read-only weapon awakening circles.

Inputs:

- current hero from route `heroId` via `getHeroById(heroId)`;
- build weapon awakening selections from `mapBuildToView`;
- combo rules;
- color dictionary.

Behavior:

- same visibility rules as builder;
- never show inactive single-color bonuses;
- read-only display only;
- no extra saved data required in build JSON.

## Shared UI Component

Create a shared component, for example:

`src/features/heroes/components/WeaponAwakeningBonusList.tsx`

Props:

```ts
type WeaponAwakeningBonusListProps = {
  bonuses: readonly WeaponAwakeningActiveBonus[];
  colors: readonly WeaponAwakeningColor[];
};
```

Behavior:

- returns `null` when `bonuses.length === 0`;
- renders compact rows/cards;
- uses existing color icons;
- keeps text readable on mobile;
- no nested cards inside cards.

The component can live under `features/heroes/components` or a more shared place if both admin and hero screens import it. Prefer the smallest location that matches existing imports and avoids duplication.

## Data Flow

Builder flow:

```text
HeroSelectInput -> selectedHero
WeaponAwakeningPicker -> weaponAwakeningSelections
weaponAwakeningSelections -> buildWeaponAwakening()
selectedHero -> getIconicWeaponHeroClass()
buildWeaponAwakening + heroClass + combo rules -> active bonuses
WeaponAwakeningBonusList renders under picker
```

Hero view flow:

```text
route heroId -> getHeroById(heroId)
build -> mapBuildToView()
view.weaponAwakeningSelections -> normalized selections
hero -> getIconicWeaponHeroClass()
normalized selections + heroClass + combo rules -> active bonuses
WeaponAwakeningBonusList renders under read-only picker
```

## Validation And Export

No new export fields are required.

Do not store calculated bonus descriptions in hero build JSON.

Existing validation should remain:

- all 8 weapon awakening slots are required for export;
- every color id must exist in `weapon-awakening-colors.json`.

Optional data integrity validation:

- every combo rule `color` exists in color dictionary;
- every combo rule `heroClass` is valid;
- every combo rule has exactly 3 values;
- thresholds are exactly `[2, 4, 8]`;
- there is exactly one rule for every `(heroClass, color)` pair.

## Tests

Add utility tests:

- maps tank hero to `tank`;
- maps support hero to `support`;
- maps physical fighter to `physical-fighter`;
- maps magical mage to `magical-fighter`;
- returns no bonuses for one red, one blue, one green;
- returns one tier-2 bonus for two same-color nodes;
- returns tier-4 bonus for four same-color nodes;
- returns tier-8 bonus for eight same-color nodes;
- returns multiple tier-2 bonuses for `2 red + 2 blue`;
- sorts bonuses by color order;
- interpolates `{value}` into original English descriptions.

Add data integrity tests:

- combo file has schema version 1;
- thresholds are `[2, 4, 8]`;
- colors referenced by combos exist;
- all 4 hero classes have all 5 colors;
- values length matches thresholds length.

Add component tests:

- `WeaponAwakeningBonusList` renders nothing for empty bonuses;
- renders color name, tier and description for active bonus;
- renders several bonuses when supplied.

Update builder screen tests:

- selected hero + two same-color nodes shows active bonus text;
- only one node of a color does not show bonus text;
- changing hero query so hero becomes unselected hides bonus text.

Update hero build screen tests:

- read-only build with active color combo shows bonus text;
- build with no repeated colors does not show bonus block.

## Acceptance Criteria

- Bonus rules from Fandom `Iconic Weapons` are stored in project data.
- Builder shows active weapon node color bonuses below weapon awakening circles.
- Hero build view shows the same active bonuses below read-only weapon awakening circles.
- Single color node does not show any bonus.
- Multiple independent color pairs are shown independently.
- Hero class is derived from hero catalog metadata, not from UI text.
- Calculated bonus descriptions are not saved into build JSON.
- Existing weapon awakening selection/export behavior remains unchanged.
- Tests cover mapping, thresholds, multiple active colors, data integrity, builder display, and hero build display.

## Out Of Scope

- Adding UI for weapon attribute points.
- Adding UI for refinement level.
- Calculating when nodes unlock by refinement level.
- Validating whether a selected build is actually possible for a specific refinement level.
- Adding costs such as 225 attribute points, 150k gold, or crystals to the builder UI.
- Editing hero catalog classes from this screen.
- Changing existing weapon awakening circle art.
