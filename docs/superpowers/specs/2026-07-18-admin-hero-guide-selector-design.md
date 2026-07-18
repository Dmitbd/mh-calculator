# Admin Hero Guide Selector Design

## Goal

Replace the admin builder hero search with a compact expandable hero grid that only offers heroes without a published Supabase guide.

## Scope

This change affects hero selection in the admin branch builder.

In scope:

- remove the text search and search dropdown from the builder hero section;
- load the published hero ids from Supabase;
- show only heroes without a published guide in create mode;
- preserve the current published hero in edit mode;
- render UR heroes first in one grid;
- render SSR heroes below, grouped by faction;
- refresh the published-id list after a successful publication;
- cover loading, error, retry, empty, selection, and refresh behavior.

Out of scope:

- changing the public hero guide list;
- changing the hero catalog or build payload contracts;
- Supabase realtime subscriptions;
- searching or filtering inside the new selector;
- changing authentication behavior.

## Data Ownership And Flow

`DivinityBranchBuilderScreen` owns the remote state because it already owns the authenticated admin session and publication flow.

After the admin session is confirmed, the screen calls the existing `fetchPublishedHeroIds()` repository function. It stores:

- published hero ids;
- loading state;
- load error state.

The available create-mode catalog is derived from the local master hero catalog by excluding every published id. Draft rows do not exclude a hero. Stable hero ids remain the only relationship key.

In edit mode, the currently loaded hero is added to the displayed catalog even when its id is published. This keeps the selected hero visible and editable.

The selector component receives only prepared heroes, selected hero id, loading/error state, retry action, and selection callbacks. It does not create a Supabase client or issue remote requests.

## Refresh After Publication

After `saveHeroBuildSet(..., status: "published")` succeeds, the screen requests the published hero ids again.

The completed selection remains visible and selected while the current builder state is still active. The refreshed published id prevents that hero from appearing when the builder returns to a fresh create state.

If publication fails, the published-id state is not changed. If the post-publication refresh fails, the successful publication remains successful and the selector exposes its normal list-load error with a retry action.

No realtime subscription is introduced.

## Selector Interaction

The existing search input is replaced by an expandable control inside the hero section.

- The closed control is labeled `Выбрать героя` and shows an expansion indicator.
- Pressing it expands or collapses the content in place.
- The content is not a modal and not an overlay dropdown.
- Selecting a hero keeps the content expanded.
- Pressing the selected hero again is a no-op.
- Pressing another hero uses the existing builder selection behavior and replaces the selected hero.
- The existing selected-build invalidation rules remain unchanged.

## Layout

When expanded, the toggle and hero catalog read as one continuous panel:

- the toggle is the panel header and keeps the existing selector background and border;
- the catalog uses the same background and border color as the toggle;
- the header loses its bottom corner rounding and the catalog loses its top corner rounding;
- a single thin divider separates the header from the catalog;
- the catalog has 16px inner padding so section labels and cards do not touch the border;
- the closed state remains the current standalone rounded toggle.

This shared panel treatment applies to the complete catalog, not separately to the UR and SSR sections. It must not add nested section borders or change card dimensions.

The expanded content renders sections in this order:

1. `UR`: one adaptive grid containing every available UR hero.
2. `SSR`: faction groups ordered by the hero faction dictionary.

Each SSR faction group shows its catalog icon, Russian label, and an adaptive hero grid. Only SSR heroes are grouped by faction. A hero that belongs to multiple factions appears in each matching SSR faction group, while selection still uses its single stable hero id.

Each hero card contains:

- a compact square portrait;
- a short Russian name below the portrait;
- a selected border and a check mark in the portrait corner when selected.

The card does not show the English name or a separate rarity badge. Names are constrained so a long label cannot turn the grid into a list-like layout.

The grid reduces its column count on narrow screens while preserving consistent card dimensions and compact spacing.

## Loading, Error, And Empty States

While a published-id request is pending, the selector header remains visible and interactive. Its portrait/name content is replaced by a small activity indicator and the text `Загрузка героев`. The expansion arrow remains visible and reflects the current expanded state.

The administrator may expand or collapse the selector while loading. If expanded, the shared catalog panel remains visible but replaces all hero cards and section headings with one centered activity indicator. Completing the request restores the normal selected hero and catalog without resetting the expanded state.

The loading state never exposes an unfiltered catalog. It uses the existing React Native `ActivityIndicator` so the animation and accessibility behavior match other admin loading controls.

If loading fails, the section shows:

- `Не удалось загрузить список опубликованных гайдов`;
- a `Повторить` button.

The full local catalog must not be shown as a fallback because that could allow an administrator to start a duplicate published guide.

In edit mode, the already loaded selected hero remains visible even if the published-id request fails.

If no create-mode heroes remain, the expanded selector shows `Все герои уже имеют опубликованные гайды`.

## Component Boundaries

The existing admin hero selection component is replaced or reshaped into a focused presentational selector. Responsibilities are separated as follows:

- build repository: fetch published hero ids;
- builder screen: remote state, derived available catalog, refresh after publication;
- hero selector: expand/collapse, section rendering, selection presentation;
- pure grouping helpers: UR selection and SSR faction grouping where extraction improves testability.

Game-data remains independent from admin UI and Supabase.

## Testing

Repository tests cover:

- querying `hero_build_sets` with `status = published`;
- returning published hero ids;
- handling repository errors according to the selector contract.

Pure data tests cover:

- excluding published heroes in create mode;
- retaining the selected published hero in edit mode;
- ordering UR before SSR;
- grouping only SSR heroes by faction dictionary order;
- handling multi-faction SSR heroes without changing stable ids.

Component tests cover:

- expanding and collapsing with `Выбрать героя`;
- rendering UR before SSR;
- rendering compact portrait/name cards;
- keeping the panel expanded after selection;
- showing the selected border and check mark;
- treating a second press on the selected hero as a no-op;
- loading, retryable error, and empty states.
- loading header copy and activity indicator while preserving the arrow;
- expanding and collapsing during loading;
- showing only a centered activity indicator in the open loading panel;
- restoring content without resetting expansion after loading completes.

Screen tests cover:

- loading published ids after admin authentication;
- not exposing the unfiltered catalog while loading or after an error;
- retrying a failed load;
- refreshing published ids after successful publication;
- not refreshing after failed publication;
- keeping the current hero visible during edit mode and immediately after its successful publication;
- excluding that hero from a subsequent fresh create state.

## Acceptance Criteria

- The admin builder has no hero text search.
- The selector opens inline from `Выбрать героя`.
- The expanded toggle and full hero catalog form one bordered panel with a shared background.
- Only heroes without a published Supabase guide are offered in create mode.
- UR heroes appear first in one grid.
- SSR heroes appear below and are grouped by faction.
- Hero options are compact portrait/name cards rather than list rows.
- Selection keeps the panel open and adds a visible check mark to the portrait.
- The published-id list refreshes after successful publication.
- Loading, retryable error, and empty states prevent accidental duplicate-guide creation.
- Loading replaces the header content with `Загрузка героев`, keeps the arrow usable, and shows only a loader inside an expanded catalog panel.
- Edit mode keeps its current published hero available.
