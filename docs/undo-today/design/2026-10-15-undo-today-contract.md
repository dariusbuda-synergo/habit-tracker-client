# Change contract — undo-today (client companion)

> Fill every section. Cite `path:line` for every fact about existing code. Subsystem names and
> invariant codes come from the repository's `AGENTS.md`.

Feature: **Undo today's completion.** A habit marked done today can be un-marked the same day.
The API removes today's completion for that habit (idempotent; 404 for an unknown habit) and the
card's "Done today" state becomes an Undo action. Streaks and weekly counts follow from the stored
completions as they do today. Out of scope: undoing past days, undoing freezes (already exists),
bulk undo.

This is the client half of the contract, carried in this repository so that its pull request has its
own contract. The **primary contract**, which includes the API facts, the server invariants
(`DAY-1`, `STREAK-1`, `TIME-1`, `WEEK-1`, `OUT-1`, `DB-1`, `CORS-1`) and the endpoint shape, is
`habit-tracker-server/docs/undo-today/design/2026-10-15-undo-today-contract.md`
([relative link](../../../../habit-tracker-server/docs/undo-today/design/2026-10-15-undo-today-contract.md)).
Paths below without a repository prefix are in `habit-tracker-client`. Paths under `app/api/`,
`app/services/`, `app/schemas.py` and `app/models/` are in `habit-tracker-server`.

Sources: the codegraph index (client indexed 2026-10-15T06:33Z after `d9f7527`; server at
`ceea25a`). Line numbers come from repository reads of those revisions. JSX attributes, test bodies
and config files were read from the repository.

API facts this side depends on (details and citations in the primary contract):
- The server already returns `completed_today` on every habit (`app/schemas.py:54`, filled at `app/services/habit_service.py:238,251`). **No field is added to `HabitOut` or `HabitTypes.ts`.**
- Undo-freeze returns 200 with the updated `HabitOut` (`app/api/habits.py:73-80`). The undo-today endpoint's route, verb and response body are open questions 1 and 2 below.
- After an undo, the server recomputes `streak`, `longest_streak`, `completed_this_week` and `at_risk` from the stored rows. The current streak anchors on yesterday and does not reset (`app/services/habit_service.py:21-22`), and `at_risk` can turn true again (`:225-231`).


## Affected subsystems

From `habit-tracker-client/AGENTS.md § Subsystems`:

| Subsystem | Role in this change |
|---|---|
| `app/lib/api.ts` | **changes (frozen file)**: one new function for the new endpoint |
| `app/components/` (`HabitCard`, likely `HabitList`) | **changes**: the "Done today" state becomes an Undo action. `HabitList` forwards card callbacks (`app/components/HabitList.tsx:48-60`) |
| `app/page.tsx` | **changes**: one new handler that calls the API and replaces the habit in state |
| `app/archive/page.tsx` | **affected**: it renders the same `HabitList` with its own handler set (`app/archive/page.tsx:151-163`). It must change if `HabitList` gains a required prop |
| `app/types/HabitTypes.ts` | read only (frozen). `Habit.completed_today` already exists (`app/types/HabitTypes.ts:13`) |
| `app/history/page.tsx`, `app/stats/page.tsx` | read only. Both fetch once on mount (`app/history/page.tsx:16-21`, `app/stats/page.tsx:16-21`) and so reflect an undo on the next visit |
| `app/lib/export.ts` | read only. It exports `completed_today` as a column (`app/lib/export.ts:12`). No change |
| `test/mock-data.ts` | read only. `makeMockHabit` accepts `completed_today` overrides (`test/mock-data.ts:3-23`) |

## The existing pattern this change follows

**API function: the twin is `unskipHabit`** (`app/lib/api.ts:79-81`): `request<Habit>(\`/habits/${id}/skip\`, { method: "DELETE" })`.
- `completeHabit` is the inverse (`app/lib/api.ts:71-73`, `POST /habits/${id}/complete`).
- Every call goes through `request<T>()` (`app/lib/api.ts:5-17`). It throws on non-2xx (`:10-12`) and returns `undefined` on 204 (`:13-15`).
- `deleteHabit` is the only `Promise<void>` function (`app/lib/api.ts:83-85`).
- The test sibling is `app/lib/__tests__/api.test.ts`. The twin test is `unskipHabit issues a DELETE to the skip endpoint` (`:168-184`), which stubs `fetch`, asserts the URL substring and `method`, and asserts the parsed result.

**Card: the "Done today" button and the freeze/undo-freeze toggle** (`app/components/HabitCard.tsx:236-252`):
- The primary button calls `onComplete(habit.id)` (`:237`), is `disabled={habit.completed_today || habit.archived}` (`:238`), and has the label `{habit.completed_today ? "Done today" : "Mark done"}` (`:241`). Today "Done today" is a **disabled** label, not an action.
- The freeze control is the precedent for a state-dependent toggle on one button:
  - `onClick={() => (habit.skipped_today ? onUnskip(habit.id) : onSkip(habit.id))}` (`:244`).
  - its `aria-label` switches between `Unfreeze ${name}` and `Freeze ${name} for today` (`:246-248`).
  - its classes switch to the sky "active" palette while frozen (`:249`), and its text is `Unfreeze` / `🧊 Freeze` (`:251`).
  - it is disabled while `completed_today` (`:245`). After an undo, the freeze control becomes available again with no extra code.
- Callbacks are props typed `(id: number) => void` (`app/components/HabitCard.tsx:22-24`). Two later additions are optional (`onPinToggle?`, `onPriorityChange?`, `:35-36`) and render their control only when passed (`:141`, `:157`).
- `HabitList` declares the same callbacks (`app/components/HabitList.tsx:4-22`) and passes them through (`:48-60`).

**Page refresh after a mutation** (`app/page.tsx`):
- `handleComplete`, `handleSkip` and `handleUnskip` (`app/page.tsx:103-116`) all `await` the API function and then replace the one habit in state with the returned summary: `setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)))`. There is no list refetch and no `try/catch`.
- The newer handlers `handlePinToggle` and `handlePriorityChange` wrap the same update in `try/catch`. On failure they `setError(...)` and fall back to `loadHabits(...)` (`app/page.tsx:172-190`).
- Header counts and the complete-all button are derived from state on each render. `pendingToday` is `!h.completed_today && !h.archived` (`app/page.tsx:251`) and `doneToday` counts `completed_today` (`:253`). They follow an updated summary without extra code.
- `app/archive/page.tsx:37-50` duplicates the same three handlers.

**Tests (`TEST-1` siblings)**:
- `app/components/__tests__/HabitCard.test.tsx`:
  - `calls onComplete with the habit id when marking done` (`:135-151`)
  - **`disables the button once already completed today`** (`:153-167`), which asserts that the `/done today/i` button is disabled. This feature intentionally reverses that test's expectation.
  - the freeze and unfreeze tests (`:282-316`)
  - `disables the freeze button once already completed today` (`:318-332`)
- `app/components/__tests__/HabitList.test.tsx` renders `HabitList` with only the required callbacks (`:8`, `:14`, `:22-29`).
- `app/lib/__tests__/api.test.ts:132-184`.
- There is no test for `app/page.tsx` or `app/archive/page.tsx`. The only page test is `app/login/__tests__/page.test.tsx`.

**Completion sound and animation**: none exists to mirror. The settings page stores
`habit-sound-enabled` (`app/settings/page.tsx:34`, `:38-41`, `:160-175`), but nothing else in
`app/` reads it (`habit-tracker-client/docs/settings/README.md` agrees: stored, not acted on). The
only completion "animation" is the progress-bar width transition (`app/components/HabitCard.tsx:218`).
That transition animates in reverse when `completed_this_week` drops.

## Invariants to preserve

From `habit-tracker-client/AGENTS.md § Invariants`:

- `TYPES-1`: `HabitTypes.ts` must mirror `HabitOut` field for field. No field is needed: `Habit.completed_today` (`app/types/HabitTypes.ts:13`) already mirrors `HabitOut.completed_today` (`app/schemas.py:54`). The risk is adding a client-only or server-only field (for example `can_undo`) on one side, which breaks the mirror. A new field must be added to both repositories in this feature, or not at all.
- `API-1`: all network access goes through `request()` in `app/lib/api.ts`. The new call must be a function in `app/lib/api.ts` that uses `request()` (`app/lib/api.ts:5-17`). It must not be an inline `fetch` in the page or the card. Note that if the server answers 204, `request` returns `undefined` (`:13-15`). The page's replace-in-state pattern (`app/page.tsx:103-116`) would then have nothing to put in state, so the response shape (open question 2) decides which page pattern applies.
- `SSR-1`: browser-only state is read only after mount. Whether a habit is done today must keep coming from the API's `completed_today`. If the client derived it (for example by comparing `completed_days` with `new Date()` in the browser), it would add browser-only `Date` logic in render, which `SSR-1` forbids outside a `useEffect` (precedent: `app/page.tsx:61-74`). It would also disagree with the server's `date.today()` (server `TIME-1`).
- `TEST-1`: every new or changed module under `app/lib` or `app/components` needs a `__tests__` sibling.
  - Changing `api.ts` requires `app/lib/__tests__/api.test.ts`.
  - Changing `HabitCard.tsx` requires `app/components/__tests__/HabitCard.test.tsx`, where `:153-167` must be rewritten, not deleted.
  - Changing `HabitList.tsx` requires `app/components/__tests__/HabitList.test.tsx`.
  - Also note: `tsconfig.json` includes `**/*.tsx`, so `npx tsc --noEmit` type-checks the tests. A new **required** callback prop on `HabitCard` or `HabitList` turns every existing render in those two test files into a type error. There are 19 `<HabitCard` renders in `HabitCard.test.tsx` and three `<HabitList` renders in `HabitList.test.tsx`. The same applies to `app/archive/page.tsx:151-163`. The optional-prop precedent is `app/components/HabitCard.tsx:35-36`.
  - A Testing Library side note: the current tests use `getByRole("button", { name: /done today/i })` (`:166`) and `/mark done/i` (`:149`). `getByRole` throws on multiple matches, so the accessible names of the new control and any remaining "done" label must not both match the same pattern.
- `PREFS-1`: preferences stay in localStorage and are never sent to the API. This is only at risk if the design wires the sound preference. A completion or undo sound would read `habit-sound-enabled` client-side only.
- `AUTH-1`: unaffected. No new route or page.
- Mechanical gate, lint: the baseline has 9 errors (`AGENTS.md § Mechanical gate`). A slice must not add to that count. The relevant rule is `react-hooks/set-state-in-effect`, which applies only if the change adds state in an effect. The existing mutation handlers do not use effects (`app/page.tsx:103-116`).

## Data and interfaces touched

- **Endpoint consumed**: the new server endpoint (defined in the primary contract, server section "Data and interfaces touched"). Today the client
  consumes `POST /habits/{id}/complete` (`app/lib/api.ts:71-73`), `POST /habits/{id}/skip`
  (`:75-77`) and `DELETE /habits/{id}/skip` (`:79-81`).
- **Types**: `Habit` (`app/types/HabitTypes.ts:1-18`), unchanged. `HabitStats` (`:20-31`), unchanged.
- **Component props**: `HabitCardProps` (`app/components/HabitCard.tsx:20-37`) and `HabitListProps`
  (`app/components/HabitList.tsx:4-22`) gain whatever callback the design chooses.
- **localStorage, cookies, configuration**: none.

## What changes

Behaviour: on a habit completed today, the card's "Done today" state is an Undo action instead of a
disabled label. Activating it calls the new endpoint and replaces the habit with the returned summary.
The card then shows "Mark done" again and the freeze control becomes available again (`:245`). The
streak line (`app/components/HabitCard.tsx:200-207`), the weekly progress (`:208-231`), the "Due today"
badge (`:181-189`), the header "x/y done today" (`app/page.tsx:253`, `:290-294`) and the complete-all
count (`:251`, `:405`) all update from the returned summary.

Files:
- `app/lib/api.ts` (**frozen**): one new function modelled on `unskipHabit` (`:79-81`).
- `app/components/HabitCard.tsx`: the primary button's `disabled` / `onClick` / label for the `completed_today` case (`:236-242`), plus a new callback prop.
- `app/components/HabitList.tsx`: forward the new callback (`:4-22`, `:48-60`).
- `app/page.tsx`: one new handler next to `handleUnskip` (`:113-116`), passed to `HabitList` (`:441-459`).
- `app/archive/page.tsx`: pass a handler too, or not. This depends on whether the prop is required and on open question 5. Archived cards keep the complete button disabled (`app/components/HabitCard.tsx:238`).
- Tests:
  - `app/lib/__tests__/api.test.ts`: a new case modelled on `:168-184`.
  - `app/components/__tests__/HabitCard.test.tsx`: rewrite `:153-167`; add "calls the undo callback with the habit id when done today"; keep `:318-332`.
  - `app/components/__tests__/HabitList.test.tsx`: if its props change.

Frozen files (`AGENTS.md § Branching`: `package.json`, `package-lock.json`,
`app/types/HabitTypes.ts`, `app/lib/api.ts`, `app/globals.css`):
- **The feature must touch `app/lib/api.ts`**. This is a Lead-owned change during fan-out.
- It does not need `app/types/HabitTypes.ts`, `app/globals.css` or the package files.

Mechanical gate (`AGENTS.md § Mechanical gate`): `npm test`, `npx tsc --noEmit`, `npm run lint`
(no new errors over the 9-error baseline), `npm run build`.

---

## Frozen-file impact (both repositories)

| Repository | Frozen file | Touched? |
|---|---|---|
| server | `app/models/habit.py` | no: `Completion` exists (`app/models/habit.py:29-37`) |
| server | `app/schemas.py` | no: `HabitOut.completed_today` exists (`app/schemas.py:54`) |
| server | `requirements*.txt` | no |
| client | `app/lib/api.ts` | **yes**: one new endpoint function |
| client | `app/types/HabitTypes.ts` | no: `Habit.completed_today` exists (`app/types/HabitTypes.ts:13`) |
| client | `package*.json`, `app/globals.css` | no |

## Open questions

1. **Route and verb.** Should it be `DELETE /habits/{id}/complete`, mirroring undo-freeze's `DELETE /habits/{id}/skip` (`app/api/habits.py:73`)? Or a distinct path such as `POST /habits/{id}/uncomplete`?
2. **Response body.** Should it return `200` with the updated `HabitOut`, like complete, skip and unskip (`app/api/habits.py:57,70,80`), which lets the page keep its replace-in-state pattern? Or `204`, like `DELETE /habits/{id}` (`:102`), which forces a refetch on the client (`app/lib/api.ts:13-15`)?
3. **Freeze after undo.** Completing a frozen day deletes the freeze (`app/services/habit_service.py:122-124`). Should undo leave the day "neither" (the simplest option, consistent with `DAY-1`), or restore the freeze that the completion replaced? Restoring it would need a record of the prior state that does not exist today.
4. **Complete-all and other views.** Should undo appear only on the card? It could also appear as an undo for the complete-all action (`app/page.tsx:255-270`), which looks like bulk undo and is out of scope as stated, or in the history strip (`app/history/page.tsx`), which is read-only today.
5. **Archived habits.** Archived cards disable "Mark done" (`app/components/HabitCard.tsx:238`) and appear on `/archive` (`app/archive/page.tsx:151-163`). Should Undo also be disabled for an archived habit that was completed today? Should the server refuse it? The complete endpoint does not check `archived` (`app/api/habits.py:50-57`).
6. **Confirmation and feedback.** Should Undo act immediately, like Unfreeze (`app/components/HabitCard.tsx:244`), or ask first, like Remove (`:272`)? Should a failed undo show an error and reload (`app/page.tsx:172-190`), or follow the unguarded complete and freeze handlers (`:103-116`)?
7. **Sound or animation counterpart.** The completion-sound preference is stored but never played (`app/settings/page.tsx:160-175`), so no completion feedback exists to mirror. Is "no counterpart" acceptable for this feature?
