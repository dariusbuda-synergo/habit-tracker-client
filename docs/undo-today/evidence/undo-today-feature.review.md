# Verification — undo-today / feature

> Builder model: sonnet (slices 1, 2, 3) · Verifier models: opus (slices 1, 2, 3) · Reviewer model: fable
> Every number below is the observed output of a command named next to it. Never assumed,
> never copied from the builder.

Branch under review: `feature/undo-today`, worktree `.claude/worktrees/undo-today`, base `main` `d9f7527`,
head `11a90ca` (`git rev-parse --short HEAD`); the whole branch is `git diff d9f7527..HEAD`. Task
`review-client-undo-today`, roster `balanced`. Commits (`git log --oneline d9f7527..HEAD`): docs `b135d12`;
slice 1 `8ea48ec`; verify `c58d202`; slice 2 `a5be0ea`; verify `cfdacfc`; slice 3 `bb39da4`; verify `11a90ca`.
Node `v24.18.0` (`node -v`). The tree was clean before the review (`git status --porcelain` empty).

Spec reviewed against: the client contract and design in `docs/undo-today/design/`, every settled decision
that touches the client (D2, D4, D5, D6, D7, A1–A5, A7), and the two human decisions made after the design
that override its slice 3 text: **(a)** on failure the handler reloads first, then sets the banner
`Could not undo that completion — refreshing the list.`; **(b)** the home page renders the list whenever it is
not loading (`{!loading && (`), so the banner shows above the list. Server side: `DELETE /habits/{id}/complete`
→ 200 full habit summary, 404 `{"detail": "Habit not found"}` (dariusbuda-synergo/habit-tracker-server#2).

Code files on the branch (`git diff --numstat d9f7527..HEAD -- app`): `11 4 app/components/HabitCard.tsx`,
`3 0 app/components/HabitList.tsx`, `61 2 app/components/__tests__/HabitCard.test.tsx`,
`18 1 app/components/__tests__/HabitList.test.tsx`, `19 0 app/lib/__tests__/api.test.ts`, `4 0 app/lib/api.ts`,
`13 1 app/page.tsx`. Everything else in `git diff --name-only d9f7527..HEAD` is under `docs/undo-today/`.

## Mechanical gate

All commands run from the worktree at `11a90ca`.

| Command | Result | Counts (observed) |
|---|---|---|
| `npm test` | pass | exit 0; `Test Files 14 passed (14)`, `Tests 84 passed (84)`; `api.test.ts (12 tests)`, `HabitCard.test.tsx (22 tests)`, `HabitList.test.tsx (4 tests)`, `export.test.ts (7 tests)`. Base per `AGENTS.md` is 79 → **+5** over the branch (slice 1 +1, slice 2 +4, slice 3 +0), as the design expects. Re-run after the probes below were deleted: `14 passed (14)`, `84 passed (84)` again |
| `npx tsc --noEmit` | pass | exit 0, 0 lines of output (`wc -l` → `0`) |
| `npm run lint` | baseline red, not worsened | exit 1; `✖ 9 problems (9 errors, 0 warnings)`: `app/archive/page.tsx:34:5`, `app/components/HabitForm.tsx:29:26`, `app/components/ThemeToggle.tsx:9:5`, `app/page.tsx:68:5`, `:79:46`, `:94:5`, `app/settings/page.tsx:24:7` (7 × `react-hooks/set-state-in-effect`), `app/settings/page.tsx:106:23`, `:106:38` (2 × `react/no-unescaped-entities`). Equal to the 9-error baseline in `AGENTS.md § Mechanical gate` |
| `npx eslint` on the seven touched code files | only pre-existing errors | `✖ 3 problems (3 errors, 0 warnings)`, all in `app/page.tsx` at `68:5`, `79:46`, `94:5` (`set-state-in-effect`, the three effects that already exist on `main`). The branch's hunks in that file (`git diff -U0 d9f7527..HEAD -- app/page.tsx \| grep '^@@'`) are `-14,0 +15`, `-117,0 +119,10`, `-440 +451`, `-445,0 +457`, so the added lines are 15, 119–128, 451 and 457. **None of the 3 errors is on a line the branch added**; they are the base's 67, 78, 93 shifted by the one added import line. 0 errors in the other six touched files |
| `npm run build` | pass | exit 0; `✓ Compiled successfully in 395ms`, `Finished TypeScript in 607ms`, `✓ Generating static pages using 9 workers (9/9)`; routes `/`, `/_not-found`, `/archive`, `/history`, `/login`, `/settings`, `/stats`, `ƒ Proxy (Middleware)`. One pre-existing Next 16 notice (`"middleware" file convention is deprecated`), not an error |
| `AGENTS.md` after the build | unchanged | `git status --porcelain` empty; `md5 -q AGENTS.md` → `7bfa207b5dbb912dd794ed7de8111c40`, equal to `git show HEAD:AGENTS.md \| md5 -q`. The build did **not** rewrite the agent-rules block; no restore was needed |
| Slice-specific lines of the gate | pass | `app/lib/__tests__/api.test.ts` (12) and `app/components/__tests__/HabitCard.test.tsx` (22) ran inside `npm test` above |

**Frozen files against the base** (`git diff d9f7527..HEAD -- <file> \| wc -l`): `app/types/HabitTypes.ts` → `0`,
`package.json` → `0`, `package-lock.json` → `0`, `app/globals.css` → `0`. Also `0` for `app/archive/page.tsx`,
`app/history/page.tsx`, `app/stats/page.tsx`, `app/lib/export.ts`, `test/mock-data.ts`, `middleware.ts`.
`app/lib/api.ts`: `git diff --numstat` → `4 0`; `grep -c '^export function'` → `9` at `d9f7527`, `10` at `HEAD`;
the only added non-blank lines are `export function uncompleteHabit(id: number): Promise<Habit> {`,
`  return request<Habit>(\`/habits/${id}/complete\`, { method: "DELETE" });`, `}`. **Exactly one added
function, nothing else changed in the file.**

## Invariants

| Code | Checked how (whole branch) | Result |
|---|---|---|
| `TYPES-1` | `HabitTypes.ts` 0-line diff (above). No new field is read anywhere: every added product line references only existing `Habit` fields (`completed_today`, `archived`, `id`, `name`). The server returns the full `HabitOut`, which the existing type already mirrors | pass |
| `API-1` | `grep -rn 'fetch(' app middleware.ts --include='*.ts' --include='*.tsx' \| grep -v __tests__` → one hit, `app/lib/api.ts:6`, inside `request()`. `uncompleteHabit` is `request<Habit>(…, { method: "DELETE" })` (`app/lib/api.ts:75-77`); the page imports it from `@/app/lib/api` (`app/page.tsx:15`, `:121`). Non-2xx throws through `request()` (`:10-12`) and lands in the page's `catch` (probe F2); 204 → `undefined` is the documented `request()` behaviour and is probed in F6a below | pass |
| `SSR-1` | Added product lines contain nothing browser-only: `git diff d9f7527..HEAD -- app/page.tsx app/components/HabitCard.tsx app/components/HabitList.tsx app/lib/api.ts \| grep '^+' \| grep -E 'Date\|localStorage\|document\|window\|useEffect\|useState\|Audio\|sound\|fetch(\|confirm'` → no match (exit 1). "Done today" still comes only from the API's `completed_today`. Probe F7: `renderToString(<Home />)` twice gives identical markup that contains `Loading habits…` and contains neither `Undo`, `Mark done` nor `<ul` (initial `loading` is `true` on both sides); `hydrateRoot` of that markup with `console.error` spied produced **0** messages matching `/hydrat\|did not match\|mismatch/i`, and the Undo button appeared after the mount effect. `renderToString(<Archive />)` twice: identical | pass |
| `AUTH-1` | `middleware.ts` 0-line diff; no new route (the build's route list is the base's seven); no cookie code in the diff (grep above) | n/a, pass |
| `PREFS-1` | No localStorage read or write added (grep above). Probe F2: the view prefs read on mount feed only the existing `listHabits(category, includeArchived, priority)` filter arguments, as on `main`; nothing new reaches the API | pass |
| `TEST-1` | `git diff --numstat d9f7527..HEAD -- app`: every changed module under `app/lib` or `app/components` has its `__tests__` sibling changed on the same branch (`api.ts` ↔ `api.test.ts`, `HabitCard.tsx` ↔ `HabitCard.test.tsx`, `HabitList.tsx` ↔ `HabitList.test.tsx`); tests render in jsdom with Testing Library and the `@` alias. `app/page.tsx` is outside the invariant's scope and has no sibling, as the design records | pass |
| Lint baseline rule | 9 errors = baseline; 0 on any line the branch added (gate table) | pass |

## Design and contract conformance

Checked on `HEAD` (`app/page.tsx`, `app/components/HabitCard.tsx`, `app/components/HabitList.tsx`, `app/lib/api.ts`):

- **D2 (route, verb, body)**: `uncompleteHabit` → `DELETE /habits/${id}/complete`, typed `Promise<Habit>`, placed directly after `completeHabit` (`app/lib/api.ts:75-77`). The builder's test asserts the path substring and method; the slice 1 verifier's P3 asserted the exact URL. Conforms to the server's merged-ready shape (200 `HabitOut`; 404 throws).
- **D4 (card only)**: `handleCompleteAll` (`app/page.tsx:266`) and its button (`:412`) are outside every hunk of the branch (`-14`, `-117`, `-440`, `-445` in old line numbers). The complete-all count follows the undone habit purely through the derived `pendingToday` (probe F1: `(0)` disabled → `(1)` enabled). History and stats pages: 0-line diffs.
- **D5 (archived disabled)**: `disabled={habit.archived || (habit.completed_today && !onUncomplete)}` (`HabitCard.tsx:240`). Probes F4 (home page, show archived on) and F8 (`/archive`): the archived card's Undo is disabled and two kinds of click call nothing; mutant MF (drop `habit.archived`) is killed by both.
- **D6 as amended by (a)**: no confirmation (`grep -n 'window.confirm'` → only `HabitCard.tsx:279`, the pre-existing delete confirm; `d9f7527` has the same one); `try/catch`; in the `catch`: `await loadHabits(categoryFilter, showArchived, priorityFilter);` then `setError("Could not undo that completion — refreshing the list.");` (`app/page.tsx:124-125`). Probe F2: reload called with the **current** filters (`"Health", true, "High"`), then the banner is visible with the list; mutant MD (design's original order) is killed.
- **(b)**: `{!loading && (` (`app/page.tsx:451`), banner line `:450` precedes it. Probes F2, F3b, F12; mutant ME (restore `!error &&`) is killed by all three.
- **D7 (no sound, no animation)**: grep above finds no `Audio`/`sound` in added lines; `app/globals.css` unchanged; the only motion is the pre-existing progress-bar width transition reversing (probe F1 sees `aria-valuenow` 3 → 2).
- **A1 names**: `uncompleteHabit` (`api.ts:75`), `onUncomplete` (`HabitCard.tsx:37,51,239-240`; `HabitList.tsx:21,36,62`), `handleUncomplete` (`page.tsx:119`, passed at `:457`). Import alphabetical between `skipHabit` and `unskipHabit` (`:15`).
- **A2 (optional prop)**: `onUncomplete?:` in both props interfaces; `npx tsc --noEmit` clean with `app/archive/page.tsx` and the pre-existing test renders unedited proves it. Probe F8 renders `/archive` without the prop: Undo disabled, nothing called.
- **A3**: `app/archive/page.tsx` 0-line diff.
- **A4 (one toggling button)**: one primary `<button>` (`HabitCard.tsx:238-249`); probe F10 completes, undoes and completes again on the same button, with the freeze control disabled/enabled/disabled in step. The only `Done today` string left in product code is the stats label `app/components/StatsSummary.tsx:32` (`grep -rn 'Done today' app --include='*.tsx' \| grep -v __tests__`), pre-existing and unrelated to the card (0-line diff); none in `HabitCard.tsx`.
- **A5**: `offers an enabled Undo instead of a disabled button once completed today` at `HabitCard.test.tsx:153`, rewritten in place (the branch diff shows the old title and assertion removed, nothing else of the test file deleted).
- **A7**: the exact banner string occurs once in `app/page.tsx` (`grep -c` → `1`); mutant MH (shortened text) is killed.
- **Contract pattern**: success path is the literal replace-one-habit pattern (`:121-122`); probe F1 shows the returned summary object (its `notes`, `streak`, `completed_this_week`, `at_risk`) renders for the one habit and the other card is untouched; mutant MG (replace every habit) is killed.
- **Deviations from the overriding spec**: none. **Unsettled decisions**: none touched (the design lists none; (a) and (b) are the human's).

**Verifier notes, judged for the Ship gate:**

1. *`loadHabits` returns `void`, so `await loadHabits(...)` does not wait for the reload* (slice 3 verifier). Confirmed: `loadHabits` is a `useCallback` whose body chains `.then/.catch/.finally` without returning the promise (`app/page.tsx:50-60`). The amendment's stated purpose, that the reload's own `setError(null)` must not wipe the banner, holds by statement order (`setError(null)` runs synchronously inside `loadHabits`, the banner is set after). Observable consequences, both reproduced in my probes: the banner appears while `Loading habits…` is still shown (F2 before the reload settles), and a failing reload replaces it with `Could not load habits. Is the API running?` (slice 3 verifier's Q5). Neither contradicts (a) as worded, and the undo itself is already rolled back server-side or never happened, so no data is at risk. **Not blocking.** The `await` is misleading to a reader; a one-line follow-up (return the promise from `loadHabits`, or drop the `await`) can go in a later change. It is not a lint error under the repository's config (0 errors on that line).
2. *Older handlers (pin, priority, archive) still set the banner before reloading* (`app/page.tsx:159-160` archive, `:188-189` pin, `:198-199` priority: `setError(...)` then `loadHabits(...)`, so their banner is cleared by the reload's `setError(null)`). This is `main`'s behaviour, outside this feature's contract (D6 named it as the pattern to copy; the amendment fixed only the new handler). **Not blocking.** Worth a follow-up ticket: the fix is reordering two lines in three places, and after (b) those banners would then show above the list like the undo banner.
3. *Consequence of (b) beyond undo* (slice 3 verifier Q6, my F12): when the initial load fails, the page now shows `Could not load habits. Is the API running?` **and**, directly under it, the empty-list message `No habits yet — add one above to get started.` (the `HabitList` empty state renders because `habits` is `[]` and `loading` is false). Before (b) the list was hidden whenever `error` was set. This is a cosmetic contradiction on an API-down screen, accepted by (b)'s wording; the human should see it at the Ship gate. **Not blocking.**
4. *Commit trailers* (all three verifiers): the slice commits read `Co-Authored-By: Claude Fable 5.1`, the verify commits for slices 2 and 3 read `Claude Opus 5.5` (`git log --format='%h %s%n%(trailers)' d9f7527..HEAD`). Git cannot prove the model; the header records the roster. Bookkeeping only.

## Adversarial probes

Written as one throwaway file `app/__tests__/zz-review-feature.probe.test.tsx` (not the builders' tests; copied to
the scratchpad, then deleted from the tree; never committed). It renders the real `Home` and `Archive` pages in
jsdom with `vi.mock("@/app/lib/api")` (all ten exports as `vi.fn()`), `vi.mock("next/navigation")` (for
`LogoutButton`), and `vi.mock("@/app/lib/export")` keeping the real `habitsToCsv`/`habitsToJson` and stubbing
`downloadFile`; `vi.resetAllMocks()` and `localStorage.clear()` before each test. Card, list and page are
the real components wired together, so every probe crosses the slice boundaries. Final run:
`npx vitest run app/__tests__/zz-review-feature.probe.test.tsx` → `Tests 15 passed (15)`, plus
`Errors 1 error` (the deliberate crash in F6a, reported by React through `window.reportError`; vitest counts
it as an unhandled error and exits 1 while all 15 tests pass). No dev server, API or external service was
started or called.

| Probe | Setup and action | Observed |
|---|---|---|
| F1 success, whole chain | Read (5, done, streak 3, 3/5 this week) and Run (6, done); `uncompleteHabit` → Read with `completed_today: false`, `streak: 2`, `completed_this_week: 2`, `at_risk: true`, `notes: "from the server summary"`. Click `Undo today's completion of Read` | before: `2/2 done today`, `Freeze Read for today` disabled, `Complete all for today (0)` disabled, exactly 2 buttons match `/undo/i` (nothing else on the page does), no `/mark done/i`. After: `1/2 done today`; exactly one `Mark done`, enabled, no `aria-label`; `Freeze Read for today` enabled; `Complete all for today (1)` enabled; Run's Undo still enabled; the returned notes, `🔥 2 days streak`, `2/5 this week`, the `Due today` status and `aria-valuenow="2"` render; still 2 list items; `uncompleteHabit` once with `5`; `completeHabit` never; `listHabits` once (no reload on success); no banner |
| F2 failure with filters active | view prefs in localStorage: category `Health`, priority `High`, show archived on; `uncompleteHabit` rejects (404 text). Click Undo | `listHabits` called a 2nd time with `("Health", true, "High")` (the current filters, not defaults); after the reload settles the banner `Could not undo that completion — refreshing the list.` and the list (Read's Undo enabled, `1/1 done today`) are visible together; the banner node precedes the `<ul>` in document order; no load-failure banner |
| F3 double-click on Undo | `uncompleteHabit` returns two deferred promises; `userEvent.dblClick` | **two** requests, both with `5`; the button stays enabled while both are in flight (no in-flight guard, the same as `handleComplete`/`handleSkip` on `main`). Resolve the 2nd then the 1st with the un-completed habit: `Mark done` enabled, `0/1 done today`, 1 list item, no banner. The server is idempotent (200 both times), so the end state is consistent |
| F3b double-click, 2nd request fails | as F3; 1st resolves un-completed, 2nd rejects | banner shown, reload happens (`listHabits` 2 calls), `Mark done` enabled: state consistent with the server, no crash |
| F4 archived card on the home page | show archived on; habits: `Archived done` (archived, done), `Archived open` (archived, not done), Read (active, done) | `listHabits(undefined, true, undefined)`; `Undo today's completion of Archived done` is **disabled**; `fireEvent.click` and `userEvent.click` call nothing (`uncompleteHabit` 0 calls); `Mark done` on the archived open card still disabled (unchanged); Read's Undo enabled; header counts only active habits: `1/1 done today`, complete-all `(0)` |
| F5 keyboard | focus the Undo button, `{Enter}` | `uncompleteHabit(5)`, `Mark done` appears, `completeHabit` never (native `<button>`) |
| F6a 204 → `undefined` in state | `uncompleteHabit` resolves `undefined` (what `request()` returns on 204) | **the whole home page crashes**: `TypeError: Cannot read properties of undefined (reading 'completed_today')` thrown while rendering (the page's own `pendingToday` filter over state), React logs `An error occurred in the <Home> component` and unmounts the root (container HTML length `0`; no error boundary exists). In production this is Next's "Application error" screen. The server contract is 200 with a body, so this path is unreachable with the merged server; it is the same exposure `handleComplete`, `handleSkip`, `handleUnskip` have had since `main` (they also put `updated` in state unguarded). Recorded, not a defect of this branch |
| F6b malformed 200 body `{}`, two habits | `uncompleteHabit` resolves `{}` | no crash (the name sort's comparator happens to call `"Run".localeCompare(undefined)`); a garbage card renders: empty name, `🔥 undefined days streak`, `undefined/undefined this week`, an enabled `Mark done`, `1/2 done today`, complete-all `(1)`; clicking that `Mark done` calls `completeHabit(undefined)`. React warns once about a missing `key`. A 200 with a non-JSON body is different: `res.json()` rejects inside `request()`, so it takes the normal `catch` path (reload + banner). Same pre-existing exposure as F6a |
| F6c malformed 200 body `{}`, one habit | as F6b with one habit | no crash; garbage card; `0/1 done today` |
| F7 `SSR-1` | `renderToString(<Home />)` ×2, then `hydrateRoot` on that markup with `console.error` spied | identical strings; markup has `Loading habits…`, no `Undo`, no `Mark done`, no `<ul`; 0 hydration messages; after the mount effect the Undo button is enabled inside the hydrated container |
| F8 `/archive` without the prop | `listHabits` → two archived habits (one done) and one active | the page filters to 2 items; `listHabits(undefined, true)`; `Undo today's completion of Archived done` disabled with text `Undo`; two kinds of click call nothing; `Mark done` disabled; `renderToString(<Archive />)` ×2 identical. The page type-checks unchanged (`tsc` clean, 0-line diff) |
| F9 export after undo | Export CSV before and after Undo, then Export JSON | `downloadFile` 3 calls; CSV header column 8 is `completed_today`; row value `true` before, `false` after; JSON `[0].completed_today === false`. The export helper still exports `completed_today` (also `export.test.ts` 7 passed) |
| F10 round trip | Mark done → Undo → Mark done on one habit | `completeHabit` ×2, `uncompleteHabit` ×1, `listHabits` ×1; the same button toggles `Mark done` ↔ `Undo today's completion of Read`; `Freeze Read for today` disabled ↔ enabled in step |
| F11 frozen habit | habit not done, `skipped_today: true` | `Mark done` enabled, no Undo anywhere, `Unfreeze Read` enabled: undo and unfreeze do not collide |
| F12 consequence of (b) | `listHabits` rejects on mount | `Could not load habits. Is the API running?` and `No habits yet — add one above to get started.` render together; no `<ul>`; no crash (see judged note 3) |

**Cross-slice mutation testing.** Each mutant edited one product file with a `perl -0pi` substitution (verified
changed by `git diff --numstat`), ran the 15-probe file, and was restored with `git checkout -- <file>`:

| Mutant | Where | Probe result |
|---|---|---|
| MA `HabitList` stops forwarding `onUncomplete` | `HabitList.tsx` | **killed**: `13 failed \| 2 passed` |
| MB page passes `onUncomplete={handleComplete}` | `page.tsx` | **killed**: `9 failed \| 6 passed` |
| MC card's completed branch calls `onComplete` | `HabitCard.tsx` | **killed**: `9 failed \| 6 passed` |
| MD failure path back to the design's order (`setError` then `loadHabits`, no `await`) | `page.tsx` | **killed**: `2 failed` (F2, F3b: banner never visible) |
| ME render condition back to `{!loading && !error && (` | `page.tsx` | **killed**: `3 failed` (F2, F3b, F12) |
| MF `disabled` drops `habit.archived` | `HabitCard.tsx` | **killed**: `2 failed` (F4, F8) |
| MG success path replaces every habit with `updated` | `page.tsx` | **killed**: `2 failed` (F1, F6b) |
| MH banner text shortened to `Could not undo that completion.` | `page.tsx` | **killed**: `2 failed` (F2, F3b) |

Restoration: after the last mutant, `md5 -q` of `app/page.tsx` → `465cdbf777e27f8d2d83a94087e2f972`,
`app/components/HabitCard.tsx` → `51fa4a06c01c5c1fec20766af12a3393`, `app/components/HabitList.tsx` →
`357dd73f0af9967f0efcdb2d0522f816`, each equal to `git show HEAD:<file> | md5 -q`. The probe file and the
`app/__tests__/` directory were deleted; `git status --porcelain` printed nothing; `npm test` afterwards:
`14 passed (14)`, `84 passed (84)`.

## Verdict

green — the whole branch conforms to the client contract (`TYPES-1`, `API-1`, `SSR-1`, `AUTH-1`, `PREFS-1`,
`TEST-1`, lint baseline) and to every settled decision including (a) and (b); the mechanical gate on `11a90ca`
is test 84/84, tsc clean, lint 9 = baseline with 0 errors on added lines, build exit 0; the frozen files are
byte-identical to `d9f7527` except the one granted function in `app/lib/api.ts`; 15 cross-slice probes pass
and all 8 cross-slice mutants are killed. None of the four verifier notes blocks the Ship gate: note 1 (the
`await` on a `void`) is a readability nit whose stated purpose still holds; note 2 (old handlers' banner order)
and the F6 exposures are `main`'s behaviour outside this feature's contract; note 3 (load-failure banner above
the empty-list message) is a cosmetic consequence of the human's decision (b) and is named here so the human
sees it. Suggested follow-ups, none required for this PR: return the promise from `loadHabits`, reorder the
three older `catch` blocks, and hide the empty-list message while `error` is set.
