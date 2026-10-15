# Verification — undo-today / client-3

> Builder model: sonnet · Verifier model: opus
> Every number below is the observed output of a command named next to it. Never assumed,
> never copied from the builder.

Slice under test: commit `bb39da4` (`undo-today slice 3: handleUncomplete on the home page`) on
`feature/undo-today`, worktree `.claude/worktrees/undo-today`, compared with the slice 2 verify commit
`cfdacfc` (base `main` `d9f7527`). Task `verify-client-undo-today-3`, roster `balanced`. All commands
were run from the worktree at `HEAD` = `bb39da4` (`git rev-parse --short HEAD`). Node `v24.18.0` (`node -v`).

## Mechanical gate

| Command | Result | Counts (observed) |
|---|---|---|
| `npm test` | pass | `Test Files 14 passed (14)`, `Tests 84 passed (84)`. Same count as the slice 2 report's observed head (84); the slice adds no tests, as the design says |
| `npx tsc --noEmit` | pass | exit 0, no output |
| `npm run lint` | baseline red, not worsened | `✖ 9 problems (9 errors, 0 warnings)`. Error locations (`npm run lint \| grep -E '^\s+[0-9]+:[0-9]+\s+error'` with the file headers): `app/archive/page.tsx:34:5`, `app/components/HabitForm.tsx:29:26`, `app/components/ThemeToggle.tsx:9:5`, `app/page.tsx:68:5, 79:46, 94:5`, `app/settings/page.tsx:24:7` (7 × `react-hooks/set-state-in-effect`), `app/settings/page.tsx:106:23, 106:38` (2 × `react/no-unescaped-entities`) |
| `npx eslint app/page.tsx` | only pre-existing errors | `✖ 3 problems (3 errors, 0 warnings)`, all `react-hooks/set-state-in-effect` at `68:5` (`setTodayLabel`), `79:46` (`setCategoryFilter`), `94:5` (`loadHabits` in the effect). These are the slice 2 report's `app/page.tsx:67,78,93`, each moved down one line by the added import line. None is on an added line (added lines are 15, 119-128, 457; changed line 451; from `git diff -U0 cfdacfc..bb39da4`) |
| `npm run build` | pass | exit 0 (`npm run build > build.log 2>&1; echo $?` → `0`); `✓ Compiled successfully`, `Finished TypeScript`, `✓ Generating static pages using 9 workers (9/9)`, routes `/`, `/_not-found`, `/archive`, `/history`, `/login`, `/settings`, `/stats`. One pre-existing Next 16 notice (`"middleware" file convention is deprecated`), not an error |
| Slice-specific lines of the gate (`api.test.ts`, `HabitCard.test.tsx`) | n/a | neither `app/lib/api.ts` nor `HabitCard.tsx` changed (`git diff --name-only cfdacfc..bb39da4` → `app/page.tsx` only); both files still run inside `npm test` (`api.test.ts (12 tests)`, `HabitCard.test.tsx (22 tests)`) |

`AGENTS.md` after the build: `git status --porcelain` printed nothing. The build did **not** rewrite the
agent-rules block; no restore was needed.

## Invariants

| Code | Checked how | Result |
|---|---|---|
| `API-1` | The handler calls `uncompleteHabit` imported from `@/app/lib/api` (`app/page.tsx:15`, `:121`); `grep -n 'confirm\|fetch(' app/page.tsx` → no match (exit 1); `git diff cfdacfc..bb39da4 \| grep '^+' \| grep -E 'window\|document\|localStorage\|Date\|confirm\|fetch\|useEffect'` → no match (exit 1). Probe M7 (calling `completeHabit` instead) fails 5 of 7 probes, so the probes pin the endpoint function | pass |
| `SSR-1` | Same `grep` over added lines: nothing browser-only, no new state, no effect. The render-condition change reads only `loading`, which is initial `true` on server and client alike (`app/page.tsx:42`), so the first render is unchanged | pass |
| `TEST-1` | Applies to `app/lib` and `app/components`; the slice touches neither (`git diff --name-only`). `app/page.tsx` has no test sibling, as the design records | n/a, consistent |
| `TYPES-1`, frozen files | `git diff cfdacfc..bb39da4 -- app/types app/lib package.json package-lock.json app/globals.css app/archive app/components middleware.ts \| wc -l` → `0`; `git diff d9f7527..bb39da4 -- app/types package.json package-lock.json app/globals.css app/archive app/history app/stats app/lib/export.ts test/mock-data.ts \| wc -l` → `0` | pass |
| Scope | `git diff --numstat cfdacfc..bb39da4` → `13 1 app/page.tsx`, the only file | pass |
| `AUTH-1`, `PREFS-1` | not reachable: no cookie, middleware or localStorage code changed | n/a |

## Design and contract conformance

**Spec verified against.** `docs/undo-today/design/2026-10-15-undo-today-design.md` § Settled decisions
(D4, D6, A1, A7), § Slices → 3 and § Risks (first entry), **as overridden by two later human decisions**:

- **(a) Design gate amendment**: in the `catch`, the handler first awaits the reload
  (`loadHabits(categoryFilter, showArchived, priorityFilter)`) and **then** sets the banner
  `Could not undo that completion — refreshing the list.`, so the reload's own `setError(null)` does not
  clear it. This replaces the design's `setError(...); loadHabits(...)` order and resolves its first Risk.
- **(b) Build gate decision (2026-10-15)**: the home page renders the list whenever it is not loading;
  `{!loading && !error && (` becomes `{!loading && (`, and the banner shows above the list instead of
  replacing it.

Checks (`git show bb39da4`, `app/page.tsx` at `HEAD`):

- **A1 names / import**: `uncompleteHabit` added to the `@/app/lib/api` import between `skipHabit` and
  `unskipHabit` (`app/page.tsx:15`); `handleUncomplete` defined directly after `handleUnskip`
  (`handleUnskip` at `:114-117`, `handleUncomplete` at `:119-127`); `onUncomplete={handleUncomplete}` on `HabitList` directly after
  `onUnskip={handleUnskip}` (`:457`). Conforms.
- **Success path**: `const updated = await uncompleteHabit(id); setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));`
  (`:121-122`), the design's literal code. Probe Q2 confirms exactly one habit is replaced by the returned
  object and the other is untouched; mutant M5 (replace every habit) is killed by Q2.
- **Failure path vs (a)**: `await loadHabits(categoryFilter, showArchived, priorityFilter); setError("Could not undo that completion — refreshing the list.");`
  (`:124-125`), the amended order and the A7 text exactly (em dash, final period). Conforms literally.
  **Note on "awaits"** (non-blocking): `loadHabits` is a `useCallback` returning `void`
  (`app/page.tsx:50-60`, it does not return the `listHabits` promise), so `await loadHabits(...)` awaits
  `undefined`: it yields one microtask, not the end of the reload. The banner survives because
  `loadHabits` calls `setError(null)` synchronously before the `await`, and the banner is set after it.
  Mutant M3 (drop the `await`, keep the order) survives all probes, which shows the guarantee comes
  from statement order, not from waiting. Observable consequences: the banner appears while the reload
  is still in flight (probe Q4: "Loading habits…" and the banner together, list hidden); and if the
  reload itself fails, its `Could not load habits. Is the API running?` replaces the undo banner
  (probe Q5). Both are reasonable, and the stated purpose of (a), that `setError(null)` does not clear the
  banner, holds. If the human meant "after the reload has finished", `loadHabits` would have to return its
  promise; that is outside this slice and not required by the amendment text.
- **Render condition vs (b)**: `{!loading && (` (`app/page.tsx:451`); the banner line `:450` precedes it,
  so it renders above the list. Conforms. Consequence beyond undo, which (b) accepts by its wording: every
  other banner (import summary `:238`, complete-all partial failure `:277`, duplicate failure `:179`, load
  failure `:56`) now shows above the list instead of hiding it; a load failure shows the banner over the
  `HabitList` empty message (probe Q6).
- **D6**: no `window.confirm` (grep above; probes Q1 and Q3 spy on `window.confirm`, 0 calls).
- **D4**: complete-all untouched. `git diff -U0 cfdacfc..bb39da4 | grep '^@@'` shows hunks only at old
  lines 14, 117, 440, 445; `handleCompleteAll` is at `app/page.tsx:266-281` (old `:255-270`), outside them.
- **A3**: `app/archive/page.tsx` unchanged (0-line diff above).
- **Design § Risks, first entry**: resolved by (a) for this handler (probes Q3, Q4). The pre-existing
  `handlePinToggle`, `handlePriorityChange` and `handleArchiveToggle` keep the old order; probe Q7 confirms
  the pin-toggle banner is still cleared by its reload. Out of scope for this slice; recorded for the
  feature reviewer.
- **Contract**: follows the contract's "page refresh after a mutation" pattern (replace one habit from the
  returned summary; on failure banner + `loadHabits`), client contract lines 63-66.
- **Deviations from the overriding spec**: none. **Decisions**: "Decisions left to implementation: None";
  both changes from the design text are the human's (a) and (b). The slice touched no unsettled decision.
- **Observation, not a finding on the code**: as in slices 1 and 2, the slice commit's trailer reads
  `Co-Authored-By: Claude Fable 5.1` while the roster names the builder as **sonnet**; the header records
  the roster's builder.

## Adversarial probes

`app/page.tsx` has no test sibling, so the probes were written as a throwaway file
`app/__tests__/zz-verify-page.probe.test.tsx` (not the builder's; never committed, deleted afterwards).
It renders `Home` in jsdom with `vi.mock("@/app/lib/api")` (all eight imported functions as `vi.fn()`)
and `vi.mock("next/navigation")` (for `LogoutButton`'s `useRouter`), `vi.resetAllMocks()` and
`localStorage.clear()` before each test. The auth cookie and `middleware.ts` do not apply to a component
render in jsdom, so no workaround was needed. ("getHabits" in the brief is `listHabits` in `app/lib/api.ts`.)
Run: `npx vitest run app/__tests__/zz-verify-page.probe.test.tsx` → `Tests 7 passed (7)`.

| Probe | Setup and action | Asserted, all observed |
|---|---|---|
| Q1 success | `listHabits` → one habit "Read" (`id 5`, completed today); `uncompleteHabit` → same habit un-completed. Click `Undo today's completion of Read` | before: `1/1 done today`, `Complete all for today (0)` disabled. After: `Mark done` enabled, no `/undo/i` button, `0/1 done today`, `Complete all for today (1)` enabled; `uncompleteHabit` called once with `5`; `listHabits` called once (no reload on success); no banner; `window.confirm` 0 calls |
| Q2 one habit replaced | two completed habits Read (5) and Run (6); the returned Read carries `notes: "from the server summary"`. Undo Read | the returned notes render (state holds the returned object); Run still shows an enabled Undo; exactly one `Mark done`; `2/2` → `1/2 done today`; 2 list items |
| Q3 failure | `uncompleteHabit` rejects; `listHabits` keeps resolving the same list. Click Undo | `listHabits` called a 2nd time with `(undefined, false, undefined)` (the reload with the default filters); after the reload settles the banner text **and** the list (the Read card, its Undo button, `1/1 done today`) are visible together; no load-failure banner; `window.confirm` 0 calls |
| Q4 slow reload | as Q3, but the reload's `listHabits` is a deferred promise | while pending: banner shown, "Loading habits…" shown, no list items (the `!loading` gate). After resolving it with Read un-completed: banner still shown, `Mark done`, `0/1 done today` |
| Q5 reload also fails | as Q4, then reject the reload | no crash; `Could not load habits. Is the API running?` replaces the undo banner; the stale card "Read" stays rendered under it |
| Q6 initial load rejection | `listHabits` rejects on mount | `Could not load habits. Is the API running?` shown, loading line gone, `HabitList` empty message `No habits yet — add one above to get started.` shown, no list items, heading still rendered: no crash |
| Q7 pre-existing handler (observation) | `updateHabit` rejects; click `Pin Read` | reload happens (2 `listHabits` calls) and `Could not update that habit — refreshing the list.` is **not** visible afterwards: the design's Risk 1 still applies to the old handlers, which this slice was not asked to change |

**Mutation testing.** Each mutant edited `app/page.tsx` with a `perl -0pi` substitution, ran the probe
file, then restored with `git checkout -- app/page.tsx`:

| Mutant | Probes (`npx vitest run app/__tests__/zz-verify-page.probe.test.tsx`) |
|---|---|
| M1 order back to the design's original: `setError(…)` then `loadHabits(…)` | **killed**: `3 failed \| 4 passed` (Q3, Q4, Q5: banner never visible) |
| M2 restore `{!loading && !error && (` | **killed**: `4 failed \| 3 passed` (Q3, Q4, Q5: list disappears under the banner; Q6: no empty message) |
| M3 drop `await`, keep the order | **survives**: `7 passed` (expected: the `await` is on a `void`; see Conformance) |
| M4 no reload in the `catch` | **killed**: `3 failed \| 4 passed` (Q3, Q4, Q5) |
| M5 success path replaces every habit with `updated` | **killed**: `1 failed \| 6 passed` (Q2) |
| M6 `onUncomplete={handleUncomplete}` removed | **killed**: `5 failed \| 2 passed` (Q1-Q5: Undo disabled) |
| M7 `completeHabit(id)` instead of `uncompleteHabit(id)` | **killed**: `5 failed \| 2 passed` (Q1-Q5) |
| M8 banner text shortened to `Could not undo that completion.` | **killed**: `3 failed \| 4 passed` (Q3, Q4, Q5) |
| M9 `try/catch` removed (unguarded like `handleComplete`) | **killed**: `3 failed \| 4 passed` (Q3, Q4, Q5) |

Builder's suite against the two mutants that encode the human's decisions, probe file moved out of the
tree: `npm test` with M2 → `Tests 84 passed (84)`; with M4 → `Tests 84 passed (84)`. As expected for a
slice with no tests, nothing in the existing suite guards (a) or (b); only these throwaway probes do.
A first run of the mutants used `vi.clearAllMocks()`, which leaves unconsumed `mockReturnValueOnce`
values between tests and produced spurious Q6/Q7 failures under M4, M6 and M7; switching to
`vi.resetAllMocks()` removed them, and the table above is from that second run.

Restoration: after the last mutant, `md5 -q app/page.tsx` → `465cdbf777e27f8d2d83a94087e2f972`, equal to
`git show HEAD:app/page.tsx | md5 -q`. The probe file and the `app/__tests__/` directory were deleted;
`git status --porcelain` printed nothing. No dev server, API or external service was started or called.

## Verdict

green
