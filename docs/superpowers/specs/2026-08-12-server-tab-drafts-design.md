# Server-Saved Hero Builder Tabs Design

## Goal

Persist each valid hero-builder tab in Supabase before the hero is complete, separate heroes into `Не созданы` and `Не опубликованы`, and let an administrator resume an incomplete hero before publishing it.

## Scope

In scope:

- save the current valid tab to the hero's Supabase `draft` row;
- allow a `draft` payload to contain only some target leaf tabs;
- load an existing draft when its hero is selected from `Не опубликованы`;
- split the builder selector into `Не созданы` and `Не опубликованы` lists;
- keep full-build validation as the publication gate;
- remove the server draft after successful publication;
- cover loading, saving, resuming, publishing, cleanup, and request failures.

Out of scope:

- changing the public hero guide screen;
- changing the set of required publication tabs;
- autosave of an invalid or partially filled current form;
- realtime subscriptions or simultaneous-editor conflict resolution;
- adding a new Supabase table;
- changing authentication or RLS policies.

## Existing Contracts

`public.hero_build_sets` already uses `(hero_id, status)` as its primary key and supports `draft` and `published` rows. The existing authenticated policies allow administrators to read and write both statuses.

The current builder keeps saved tabs in memory. `Сохранить вкладку` validates only the current tab and then stores it locally. `Опубликовать` validates every required target leaf. The existing single-tab and full-export validation rules remain authoritative.

The current repository can save either status, but it can only fetch published ids and published payloads. Its existing broad hero deletion operation must not be used for draft cleanup because it deletes both statuses.

## Hero States And Lists

The authenticated builder loads lightweight row metadata for both statuses and derives three mutually exclusive states from stable hero ids:

- `Не созданы`: no `draft` row and no `published` row;
- `Не опубликованы`: a `draft` row exists and no `published` row exists;
- published: a `published` row exists, regardless of whether a stale `draft` row also exists.

Published heroes do not appear in either create list. Treating `published` as dominant prevents a failed cleanup request from exposing an already published hero as unfinished.

The selector renders `Не созданы` first and `Не опубликованы` second. Within each list, the established catalog presentation remains unchanged: UR heroes first, then SSR heroes grouped by faction. Empty sections show a short explicit empty state instead of disappearing ambiguously.

The selected hero remains visible while it is active, including during a save-triggered transition from `Не созданы` to `Не опубликованы`.

## Repository Operations

Add focused repository operations for authenticated builder use:

- fetch the ids of both `draft` and `published` rows in one catalog request;
- fetch one hero's `draft` payload;
- upsert one hero's partial payload with `status: "draft"`;
- delete only the row matching both `hero_id` and `status: "draft"`.

Existing public reads remain restricted to `status: "published"`. No schema or RLS migration is required.

## Saving The Current Tab

`Сохранить вкладку` becomes a server operation:

1. Validate only the active tab with the existing `validateBranchBuild` rules.
2. If invalid, show the current field and toast errors and send no request.
3. Convert the valid active form into its committed nested-build shape without `targetTabPath`.
4. Merge that build with the builder's already saved tabs for the same hero.
5. Build a partial `HeroBuildSet` whose missing leaf tabs have `build: null`.
6. Upsert that payload as the hero's `draft` row.
7. Only after the request succeeds, commit the new tab snapshot to the builder's saved state, refresh the hero-state catalog, and show `Вкладка сохранена.`

The save operation must build the outgoing payload from an explicit next-state snapshot rather than reading React state immediately after a setter. This prevents the newly saved tab from being omitted from the request.

While the request is pending, the save action is disabled and labeled `Сохраняем...`. Repeated presses must not create parallel saves. Publication is also disabled during the tab-save request so the two writes cannot race in one builder session.

If the request fails, the new tab is not marked as saved in the builder, the hero remains in its previous list, and an error toast is shown. The editable form remains intact so the administrator can retry.

## Resuming An Unpublished Hero

Selecting a hero from `Не опубликованы` requests its `draft` payload and loads all saved leaf builds into the existing builder hook. The first saved leaf becomes active using the existing load behavior. Missing leaves remain available and empty for completion.

During loading, the builder does not display another hero's form as though it belonged to the selected draft. The selector and form expose a pending state, and duplicate draft-load requests are prevented.

If loading fails or the row no longer exists, the current builder state is not replaced. The selector refreshes its catalog after a not-found result, and an error toast explains that the draft could not be loaded.

Selecting a hero from `Не созданы` uses the existing fresh-hero flow and starts with no saved tabs. Switching heroes does not silently upload unsaved invalid form state.

## Publication And Draft Cleanup

`Опубликовать` keeps the current full-build gate:

- every required target leaf must have a saved valid build;
- the existing multi-build validation messages and scroll targets remain unchanged;
- no `published` request is sent when any required tab is missing or invalid.

After full validation succeeds:

1. Upsert the complete payload with `status: "published"`.
2. After that request succeeds, delete only the same hero's `draft` row.
3. Refresh the combined draft/published id catalog.
4. Report publication success and remove the hero from `Не опубликованы`.

The order is deliberate: a failed publication must never destroy the resumable draft. If publication succeeds but draft deletion fails, the published row remains authoritative, the hero stays out of both create lists, and the UI reports that publication succeeded but draft cleanup must be retried. A later successful publication or explicit retry may repeat the idempotent draft deletion.

The existing create-mode published-conflict check remains in place. Draft existence is not a publication conflict for the same resumed hero.

## State And Component Boundaries

Responsibilities remain separated:

- build repository owns Supabase queries and status-specific row operations;
- builder model derives `notCreated` and `notPublished` catalogs from local heroes plus remote status ids;
- builder hook owns editable tab forms and saved tab snapshots, and can produce a partial build set from an explicit next snapshot;
- builder screen orchestrates authentication, remote catalog state, draft save/load, publication, cleanup, pending states, and toasts;
- hero selector only renders the prepared lists and invokes create/resume selection callbacks.

The game-data layer remains independent of Supabase and admin orchestration.

## Loading And Error Handling

The initial authenticated catalog request gates both lists, preserving the current rule that an unfiltered catalog is never shown while server state is unknown.

Catalog loading, error, and retry behavior remain available from the selector. A failed catalog refresh after a successful tab save does not undo the saved draft; the success message states that the tab was saved, while the selector shows its retryable catalog error.

Save, load, publish, and cleanup failures use distinct messages so the administrator can tell whether data was persisted. Successful server operations are never reported before their corresponding request completes.

## Testing

Repository tests cover:

- fetching draft and published hero ids;
- fetching one draft payload by `hero_id` and `status: "draft"`;
- upserting a partial build set as `draft`;
- deleting only the `draft` row for one hero;
- propagating Supabase errors.

Pure model tests cover:

- deriving mutually exclusive `Не созданы` and `Не опубликованы` lists;
- excluding published heroes even when a stale draft also exists;
- retaining the selected hero during a list transition;
- preserving UR-first and SSR-faction grouping within both lists;
- building a partial `HeroBuildSet` with only the explicitly saved leaf builds.

Hook and screen tests cover:

- invalid current tabs send no request;
- a valid tab request includes the newly saved tab and preserves earlier saved tabs;
- other required tabs may remain null in a draft;
- local saved state changes only after a successful server response;
- pending save prevents duplicate save and publication actions;
- a failed save preserves the editable form and previous catalog state;
- selecting `Не опубликованы` loads its draft tabs;
- a draft load failure does not replace current state;
- selecting `Не созданы` starts a fresh hero;
- publication remains blocked until all required tabs pass validation;
- successful publication writes `published`, then deletes only `draft`, then refreshes the catalog;
- failed publication does not delete the draft;
- failed cleanup leaves the published hero excluded and reports partial success.

Component tests cover:

- rendering `Не созданы` before `Не опубликованы`;
- rendering both empty states;
- preserving existing hero-card selection and grouping behavior;
- showing save and draft-load pending states.

## Acceptance Criteria

- A valid current tab is saved to Supabase when `Сохранить вкладку` is pressed.
- Saving one valid tab does not require any other tab to be filled.
- A hero with a saved draft moves from `Не созданы` to `Не опубликованы`.
- An unfinished hero can be opened from `Не опубликованы`, restores all saved tabs, and can be completed later.
- Publication still requires every existing mandatory target tab to be valid.
- Successful publication deletes only that hero's draft row and removes the hero from the unfinished list.
- Failed publication preserves the draft.
- Published heroes never appear in either create list, including after a cleanup failure.
- Request failures are visible and never masquerade as successful saves or loads.
