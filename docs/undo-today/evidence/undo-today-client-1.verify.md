# Verification — undo-today / client-1

> Builder model: sonnet · Verifier model: opus
> Every number below is the observed output of a command named next to it. Never assumed,
> never copied from the builder.

Slice under test: commit `8ea48ec` (`undo-today slice 1: uncompleteHabit in app/lib/api.ts`) on
`feature/undo-today`, worktree `.claude/worktrees/undo-today`, compared with the docs commit
`b135d12` (base `main` `d9f7527`). Task `verify-client-undo-today-1`, roster `balanced`. All commands
were run from the worktree at `HEAD` = `8ea48ec` (`git rev-parse --short HEAD`). Node `v24.18.0`
(`node -v`).

## Mechanical gate

| Command | Result | Counts (observed) |
|---|---|---|
| `npm test` at `8ea48ec` | pass | `Test Files 14 passed (14)`, `Tests 80 passed (80)` |
| `npm test` with `app/lib/api.ts` and `app/lib/__tests__/api.test.ts` temporarily checked out from `b135d12` (then restored with `git checkout HEAD -- …`; `git status --porcelain` empty) | pass (base) | `Test Files 14 passed (14)`, `Tests 79 passed (79)` → delta **+1**, as the design expects |
| `npx tsc --noEmit` | pass | exit 0, no output |
| `npm run lint` | baseline red, not worsened | `✖ 9 problems (9 errors, 0 warnings)`; files reporting errors (`npm run lint \| grep '^/Users'`): `app/archive/page.tsx:34`, `app/components/HabitForm.tsx:29`, `app/components/ThemeToggle.tsx:9`, `app/page.tsx:67,78,93`, `app/settings/page.tsx:24,106(×2)`. None is a touched file |
| `npx eslint app/lib/api.ts app/lib/__tests__/api.test.ts` | pass | exit 0, no output: 0 errors in the touched files |
| `npm run build` | pass | exit 0; `✓ Compiled successfully`, `Finished TypeScript`, 9/9 static pages, routes `/`, `/_not-found`, `/archive`, `/history`, `/login`, `/settings`, `/stats`. One pre-existing Next 16 notice (middleware → proxy), not an error |
| Slice-specific: `app/lib/__tests__/api.test.ts` for a change to `app/lib/api.ts` | pass | runs inside `npm test`; the new case also ran alone (`npx vitest run app/lib/__tests__/api.test.ts -t uncompleteHabit`: `1 passed \| 11 skipped (12)`) |

`AGENTS.md` after the build: `git status --porcelain` printed nothing. The build did **not** rewrite the
agent-rules block; no restore was needed.

## Invariants

| Code | Checked how | Result |
|---|---|---|
| `API-1` | `git diff b135d12..8ea48ec -- app/lib/api.ts`: the only added lines are `export function uncompleteHabit(id: number): Promise<Habit> {`, `  return request<Habit>(\`/habits/${id}/complete\`, { method: "DELETE" });`, `}` and one blank line. `grep -rn 'fetch(' app middleware.ts \| grep -v __tests__` → one hit, `app/lib/api.ts:6` (inside `request()`). Probes P1/P5 below confirm non-2xx throws; P2 confirms 204 → `undefined` | pass |
| `TYPES-1` | `git diff b135d12..8ea48ec -- app/types/HabitTypes.ts \| wc -l` → `0`; also absent from `git diff --stat d9f7527..8ea48ec -- . ':!docs'` | pass |
| `TEST-1` | `git diff --numstat b135d12..8ea48ec` → `19 0 app/lib/__tests__/api.test.ts`, `4 0 app/lib/api.ts`: the module and its `__tests__` sibling changed together | pass |
| Frozen-file grant (`AGENTS.md § Branching`) | `api.ts`: 4 added, 0 removed lines (numstat), exactly one function; `grep -c '^export function' app/lib/api.ts` → `10` at `8ea48ec` vs `9` at `b135d12`. `git diff b135d12..8ea48ec -- app/types/HabitTypes.ts package.json package-lock.json app/globals.css \| wc -l` → `0`. `git diff --name-only b135d12..8ea48ec` → only the two granted files | pass |
| `SSR-1`, `AUTH-1`, `PREFS-1` | not reachable from this slice: no component, page, effect, cookie or localStorage code changed (`git diff --name-only`) | n/a |

## Design and contract conformance

Against `docs/undo-today/design/2026-10-15-undo-today-design.md` § Interfaces and § Slices → 1:

- **Placement**: `uncompleteHabit` sits directly after `completeHabit` (`app/lib/api.ts:71-73`) at
  `app/lib/api.ts:75-77`, before `skipHabit` (now `:79-81`). Conforms.
- **Signature / generic / path / method**: `export function uncompleteHabit(id: number): Promise<Habit>`,
  `request<Habit>(\`/habits/${id}/complete\`, { method: "DELETE" })`, character for character the design's
  block. Conforms to the frozen server contract `DELETE /habits/{habit_id}/complete → 200 HabitOut`.
- **Test**: `uncompleteHabit issues a DELETE to the complete endpoint` is placed directly after
  `unskipHabit issues a DELETE to the skip endpoint` (`app/lib/__tests__/api.test.ts:169-185` → new case
  `:187-203`), uses `makeMockHabit({ id: 2, completed_today: false })`, a `{ ok: true, status: 200, json }`
  stub, `toEqual(updated)`, `stringContaining("/habits/2/complete")` and `objectContaining({ method: "DELETE" })`,
  exactly as specified. `uncompleteHabit` is imported alphabetically, between `skipHabit` and `unskipHabit`.
- **Contract pattern**: follows the twin `unskipHabit` (contract § The existing pattern); no type change; no
  inline `fetch`.
- **Deviations**: none.
- **Decisions**: the design lists "Decisions left to implementation: None"; the slice made none (its only
  content is the design's literal code). It touched no unsettled decision.
- **Observation, not a finding on the code**: the slice commit's trailer reads
  `Co-Authored-By: Claude Fable 5.1`, while the roster and this brief name the builder as **sonnet**. Git
  cannot prove which model built the slice; the header above records the roster's builder. The Lead may
  want to reconcile the trailer convention.

## Adversarial probes

Independent probes, written as a throwaway file `app/lib/__tests__/zz-verify-probe.test.ts` (not the
builder's test), run with `npx vitest run app/lib/__tests__/zz-verify-probe.test.ts` → `Tests 6 passed (6)`,
then deleted (`git status --porcelain` empty afterwards). Each probe re-imports `@/app/lib/api` after
`vi.resetModules()` so the base URL is read fresh.

| Probe | What it does | Result |
|---|---|---|
| P1 404 rejects | `fetch` stubbed to `{ ok: false, status: 404, json: () => ({detail: "Habit not found"}) }`; `uncompleteHabit(99)` | rejects with `Request to /habits/99/complete failed with status 404`; `json` never called. pass |
| P2 204 → `undefined` | `fetch` stubbed to `{ ok: true, status: 204 }` | resolves to `undefined`, `json` not called. This is `request()` behaviour (`app/lib/api.ts:13-15`): the declared `Promise<Habit>` is a lie on 204. The server contract returns **200**, so the slice is correct, but **slice 3's `handleUncomplete` must not be written to tolerate or rely on a 204**; if the server ever answered 204, `prev.map(h => h.id === id ? updated : h)` would put `undefined` in state |
| P3 exact URL and init | default base URL; call `uncompleteHabit(31)` and `unskipHabit(31)` | URL is exactly `http://localhost:8000/habits/31/complete`; replacing `/complete` with `/skip` gives `unskipHabit`'s URL exactly; init is exactly `{ method: "DELETE", headers: { "Content-Type": "application/json" } }`, equal to `unskipHabit`'s, no body. pass |
| P4 `NEXT_PUBLIC_API_BASE_URL` | `vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.probe.invalid")`, fresh import | `https://api.probe.invalid/habits/5/complete` and `https://api.probe.invalid/habits/5/skip`: built the same way as `unskipHabit`. pass (no network: `fetch` stubbed) |
| P5 500 rejects | `{ ok: false, status: 500 }` | rejects `/status 500/`. pass |
| P6 network failure | `fetch` rejects with `TypeError("Failed to fetch")` | the rejection propagates unchanged. pass |

Mutation testing of the builder's test. Each mutant replaced the one `return` line of `uncompleteHabit`
in `app/lib/api.ts`, ran `npx vitest run app/lib/__tests__/api.test.ts -t uncompleteHabit`, and was
restored with `git checkout -- app/lib/api.ts`:

| Mutant | Builder's test | Verifier probes |
|---|---|---|
| M1 method `POST` | **killed** (`1 failed \| 11 skipped`) | — |
| M2 path `/skip` | **killed** | — |
| M4 id `${id + 1}` | **killed** | — |
| M5 no `init` (default GET) | **killed** | — |
| M3 path `/completed` | **survives** (`1 passed \| 11 skipped`) | killed by P1, P3, P4 (`Failed Tests 3`) |
| M6 path `/v2/habits/…/complete` | **survives** | killed by P1, P3, P4 |

Finding (non-blocking): the builder's test asserts the URL with `expect.stringContaining("/habits/2/complete")`,
so a path that merely contains that substring (`/completed`, an extra prefix) passes it. This is exactly
what the design specified and the same weakness the twin `unskipHabit` test has; the implementation itself
is correct (P3 asserts the exact URL). A later hardening could assert the full URL; it is not required by
the design and is out of this slice's scope.

Restoration: after the last mutant, `md5 -q app/lib/api.ts` → `529fc302558b38eb650525c71bd31474`, identical to
`git show HEAD:app/lib/api.ts | md5 -q` → `529fc302558b38eb650525c71bd31474`; `git status --porcelain` empty
after deleting the probe file. No dev server, API or external service was started or called.

## Verdict

green
