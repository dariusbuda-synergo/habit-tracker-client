# Verification — undo-today / client-2

> Builder model: sonnet · Verifier model: opus
> Every number below is the observed output of a command named next to it. Never assumed,
> never copied from the builder.

Slice under test: commit `a5be0ea` (`undo-today slice 2: Undo control on HabitCard, forwarded through
HabitList`) on `feature/undo-today`, worktree `.claude/worktrees/undo-today`, compared with the slice 1
verify commit `c58d202` (base `main` `d9f7527`). Task `verify-client-undo-today-2`, roster `balanced`.
All commands were run from the worktree at `HEAD` = `a5be0ea` (`git rev-parse --short HEAD`). Node
`v24.18.0` (`node -v`).

## Mechanical gate

| Command | Result | Counts (observed) |
|---|---|---|
| `npm test` at `a5be0ea` | pass | `Test Files 14 passed (14)`, `Tests 84 passed (84)`; `HabitCard.test.tsx (22 tests)`, `HabitList.test.tsx (4 tests)` |
| `npm test` with the four slice files checked out from `c58d202` (`git checkout c58d202 -- app/components/HabitCard.tsx app/components/HabitList.tsx app/components/__tests__/HabitCard.test.tsx app/components/__tests__/HabitList.test.tsx`, then restored with `git checkout HEAD -- app/components`; `git status --porcelain` empty) | pass (previous head) | `Test Files 14 passed (14)`, `Tests 80 passed (80)`; `HabitCard.test.tsx (19 tests)`, `HabitList.test.tsx (3 tests)` → delta **+4** (card +3, list +1). The rewrite kept the count, as the design expects |
| `npx tsc --noEmit` | pass | exit 0, no output. No existing `<HabitCard`/`<HabitList` render outside the rewritten test was edited (see A2 below), so this proves the prop is optional |
| `npm run lint` | baseline red, not worsened | `✖ 9 problems (9 errors, 0 warnings)`; files reporting errors (`npm run lint \| grep '^/Users'`): `app/archive/page.tsx:34`, `app/components/HabitForm.tsx:29`, `app/components/ThemeToggle.tsx:9`, `app/page.tsx:67,78,93`, `app/settings/page.tsx:24,106:23,106:38` (error lines from `npm run lint \| grep -E "^\s+[0-9]+:[0-9]+\s+error"`: 7 `set-state-in-effect`, 2 `react/no-unescaped-entities`). None is a touched file |
| `npx eslint app/components/HabitCard.tsx app/components/HabitList.tsx app/components/__tests__/HabitCard.test.tsx app/components/__tests__/HabitList.test.tsx` | pass | exit 0, no output: 0 errors in the touched files |
| `npm run build` | pass | exit 0 (`npm run build >/dev/null 2>&1; echo $?` → `0`); `✓ Compiled successfully`, `Finished TypeScript`, `Generating static pages … (9/9)`, routes `/`, `/_not-found`, `/archive`, `/history`, `/login`, `/settings`, `/stats`. One pre-existing Next 16 notice (`"middleware" file convention is deprecated`), not an error |
| Slice-specific: `app/components/__tests__/HabitCard.test.tsx` for a change to `HabitCard.tsx` | pass | runs inside `npm test` (22 passed); also `npx vitest run app/components` → `Tests 40 passed (40)` |

`AGENTS.md` after the build: `git status --porcelain` printed nothing after both build runs. The build did
**not** rewrite the agent-rules block; no restore was needed.

## Invariants

| Code | Checked how | Result |
|---|---|---|
| `TEST-1` | `git diff --numstat c58d202..a5be0ea` → `11 4 app/components/HabitCard.tsx`, `3 0 app/components/HabitList.tsx`, `61 2 app/components/__tests__/HabitCard.test.tsx`, `18 1 app/components/__tests__/HabitList.test.tsx`: both changed components have their `__tests__` sibling changed in the same commit | pass |
| `SSR-1` | `git diff c58d202..a5be0ea -- app/components/HabitCard.tsx app/components/HabitList.tsx \| grep '^+' \| grep -E 'Date\|localStorage\|document\|window\|useEffect\|useState'` → no match (exit 1). The completed branch is selected only by `habit.completed_today` (`app/components/HabitCard.tsx:239-248`). Probe P10: `renderToString` of the same card twice gives identical markup, and its `aria-label` equals the jsdom render's | pass |
| `TYPES-1` | `git diff c58d202..a5be0ea -- app/types/HabitTypes.ts …` → 0 lines (combined with the frozen files below); also 0 lines from `d9f7527` | pass |
| Frozen files (`AGENTS.md § Branching`) | `git diff c58d202..a5be0ea -- app/types/HabitTypes.ts app/lib/api.ts package.json package-lock.json app/globals.css app/archive/page.tsx app/page.tsx \| wc -l` → `0`; same set minus `api.ts` from `d9f7527..a5be0ea` → `0` | pass |
| Scope | `git diff --name-only c58d202..a5be0ea` → exactly the four files the design names | pass |
| `API-1`, `AUTH-1`, `PREFS-1` | not reachable: no `fetch`, `api.ts`, cookie, middleware or localStorage code changed (`git diff --name-only`) | n/a |

## Design and contract conformance

Against `docs/undo-today/design/2026-10-15-undo-today-design.md` § Interfaces and § Slices → 2:

- **A2 (optional prop)**: `onUncomplete?: (id: number) => void;` after `onPriorityChange?` in both
  `HabitCardProps` (`app/components/HabitCard.tsx:37`) and `HabitListProps` (`app/components/HabitList.tsx:21`),
  destructured in both; `HabitList` passes `onUncomplete={onUncomplete}` after `onPriorityChange`
  (`app/components/HabitList.tsx:62`). The only lines removed from the test files
  (`git diff c58d202..a5be0ea -- app/components/__tests__ | grep '^-[^-]'`) are the old test title, its old
  assertion and the `MOCK_HABITS` import line (extended to add `makeMockHabit`, as the design says). The only
  line added inside a pre-existing render is `onUncomplete={vi.fn()}` in the rewritten test, which the design's
  A5 body requires. No other existing render edited; the three `HabitList` renders untouched. Conforms.
- **A4 (one toggling button)**: the single primary `<button>` (`app/components/HabitCard.tsx:238-249`) is
  character for character the design's block: completed → text `Undo`, `aria-label`
  ``Undo today's completion of ${habit.name}``, `onClick` → `onUncomplete?.(habit.id)`, emerald-100/700 active
  palette with dark variants; not completed → `Mark done`, no `aria-label` (`undefined`), the original class
  string unchanged, `onComplete(habit.id)`. Conforms.
- **`disabled` expression**: the builder's `habit.archived || (habit.completed_today && !onUncomplete)` is the
  design's own literal code. Equivalence with the design's state table, by cases: not completed → `archived ||
  false` = `archived`, i.e. enabled when `!archived` ✓; completed → `archived || !onUncomplete`, i.e. enabled when
  `!archived && onUncomplete` ✓. Probe P7 confirms it on all 8 combinations of completed × archived × handler
  passed, including the click outcome of each. Equal in every state.
- **A5**: the test at former `:153-167` is rewritten in place at `app/components/__tests__/HabitCard.test.tsx:153`
  under the exact name `offers an enabled Undo instead of a disabled button once completed today`, with the
  four assertions the design gives; not deleted. The three added card tests and the list test match the
  design's names and bodies. `calls onComplete with the habit id when marking done`, the freeze/unfreeze tests
  and `disables the freeze button once already completed today` are unchanged and pass.
- **D5**: archived → disabled (builder test `disables Undo for an archived habit completed today`; probes P7, P8).
- **D4**: only the card changes; `app/page.tsx` (complete-all) untouched (0-line diff).
- **A3**: `app/archive/page.tsx` unchanged (0-line diff). It lists archived habits only
  (`app/archive/page.tsx:28`), so its cards' Undo is disabled by `archived` regardless.
- **Intermediate state, expected**: until slice 3, `app/page.tsx` passes no `onUncomplete`
  (`grep -n onUncomplete app/page.tsx` → no match), so on this commit the home page shows a disabled `Undo` on
  completed cards. This is by design (slice 3 wires `handleUncomplete`), not a finding; it matters only if the
  branch were shipped after slice 2.
- **Deviations**: none in product code. Formatting of the new `HabitList` test render (several callbacks on one
  line) copies the existing `shows a custom empty message…` test in the same file.
- **Decisions**: the design lists "Decisions left to implementation: None"; the slice is the design's literal
  code and touched no unsettled decision.
- **Observation, not a finding on the code**: as in slice 1, the slice commit's trailer reads
  `Co-Authored-By: Claude Fable 5.1` while the roster names the builder as **sonnet**; the header records the
  roster's builder.

## Adversarial probes

Independent probes, written as a throwaway file `app/components/__tests__/zz-verify-probe.test.tsx` (not the
builder's tests), run with `npx vitest run app/components/__tests__/zz-verify-probe.test.tsx` →
`Tests 10 passed (10)`, then deleted (`git status --porcelain` empty afterwards). (A first run reported
`1 failed | 9 passed` because the probe used a matcher this Vitest 2.1.9 lacks, `toHaveBeenCalledExactlyOnceWith`;
replaced by `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(12)`, then 10/10.)

| Probe | What it does | Result |
|---|---|---|
| P1 completed + handler | `name: "Read", completed_today: true`, `onUncomplete` passed; `getByRole("button", { name: /undo today's completion of/i })` | enabled; `aria-label` exactly `Undo today's completion of Read`; text exactly `Undo`; `/done today/i` and `/mark done/i` buttons null; no "done today" text anywhere; exactly one button matches `/undo/i`; class has `bg-emerald-100`, `text-emerald-700`. pass |
| P2 Undo never calls `onComplete` | click Undo via `userEvent` and `fireEvent` | `onUncomplete` called twice with `11`; none of the seven other callbacks called. pass |
| P3 not completed | `completed_today: false`, `onUncomplete` passed | `Mark done` has no `aria-label`, is enabled, its class string equals the pre-slice one exactly; click → `onComplete` once with `12`, `onUncomplete` not called; no `/undo/i` button. pass |
| P4 keyboard | `userEvent.tab()` until focus, then `{Enter}` and Space | the Undo button receives focus; Enter and Space each call `onUncomplete` (2 calls, last with `13`); `onComplete` not called. pass (native `<button>`, so keyboard activation is the browser's) |
| P5 list forwards to every card | `HabitList` with two completed habits A (21) and B (22) and `onUncomplete`; click both by exact accessible name | `onUncomplete.mock.calls` = `[[21], [22]]`; `onComplete` not called. pass |
| P6 list without handler | same two habits, no `onUncomplete` | both Undo buttons disabled. pass |
| P7 truth table | all 8 states of completed × archived × handler, checking `disabled`, text, and which callback a click calls | matches the design table in all 8. pass |
| P8 design's own probe | archived + completed, no `onUncomplete`; `fireEvent.click` and `userEvent.click` | disabled; no callback called. pass |
| P9 after undo | rerender the same card with `completed_today: false` | `Mark done` enabled, no Undo, `Freeze Run for today` goes from disabled to enabled. pass |
| P10 SSR-1 / escaping | `renderToString` twice for name `Tom's "run" <x>` | identical strings; markup carries the escaped label; jsdom `aria-label` is the raw string. pass |

Mutation testing. Each mutant edited `app/components/HabitCard.tsx` (or `HabitList.tsx` for M9) with a `perl`
substitution, ran the builder's two files (`npx vitest run app/components/__tests__/HabitCard.test.tsx
app/components/__tests__/HabitList.test.tsx`, 26 tests) and the probe file (10 tests), then restored with
`git checkout -- <file>`:

| Mutant | Builder's tests | Verifier probes |
|---|---|---|
| M1 completed branch calls `onComplete` instead of `onUncomplete` | **killed** (`2 failed \| 24 passed`) | killed (`4 failed`) |
| M2 drop `habit.archived` from `disabled` | **killed** (`1 failed`) | killed (`1 failed`) |
| M3 drop the handler term (`disabled={habit.archived}`) | **killed** (`1 failed`) | killed (`2 failed`) |
| M4 no `aria-label` in the completed state | **survives** (`26 passed`) | killed by P1, P5, P10 (`3 failed`) |
| M5 visible text back to `Done today` | **killed** (`1 failed`) | killed (`2 failed`) |
| M6 `onUncomplete?.(1)` (hard-coded id) | **killed** (`2 failed`) | killed (`3 failed`) |
| M7 `disabled={habit.archived \|\| !onUncomplete}` (also disables Mark done without handler) | **killed** (`1 failed`) | killed (`1 failed`) |
| M8 completed state keeps the old emerald-600 palette | **survives** (`26 passed`) | killed by P1 (`1 failed`) |
| M9 `HabitList` does not forward `onUncomplete` | **killed** (`1 failed`) | killed (`1 failed`) |
| M10 `aria-label="Undo"` also on the not-completed state | **killed** (`1 failed`) | killed (`2 failed`) |

Finding (non-blocking): the builder's tests query `/undo/i`, which the visible text `Undo` satisfies on its own,
so they do not pin the accessible name the design specifies (M4 survives) or the palette (M8 survives). This is
exactly what the design's test bodies specified; the implementation itself is correct (P1 asserts the exact
`aria-label` and the palette). A later hardening could assert `toHaveAttribute("aria-label", …)`; not required.

Restoration: after the last mutant, `md5 -q app/components/HabitCard.tsx` → `51fa4a06c01c5c1fec20766af12a3393`,
equal to `git show HEAD:app/components/HabitCard.tsx | md5 -q`; `md5 -q app/components/HabitList.tsx` →
`357dd73f0af9967f0efcdb2d0522f816`, equal to `HEAD`'s. `git status --porcelain` empty after deleting the probe
file. No dev server, API or external service was started or called.

## Verdict

green
