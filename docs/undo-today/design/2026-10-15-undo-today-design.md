# Design — undo-today (client companion)

> Consumes the approved contract at
> `habit-tracker-server/docs/undo-today/design/2026-10-15-undo-today-contract.md` (primary) and its
> client companion `docs/undo-today/design/2026-10-15-undo-today-contract.md` in this repository.
> Does not re-derive their facts; `path:line` citations below are the contract's (client at `d9f7527`).

This is the client half of the design, carried in this repository so that its pull request has its
own design. The **primary design**, with the shared shape, the server interfaces, the server slices
and every settled decision (D1–D7 from the Contract gate, A1–A7 from the architect), is
`habit-tracker-server/docs/undo-today/design/2026-10-15-undo-today-design.md`
([relative link](../../../../habit-tracker-server/docs/undo-today/design/2026-10-15-undo-today-design.md)).
Paths below without a repository prefix are in `habit-tracker-client`.

Roster: `balanced`. Decisions that bind this side, restated from the primary:

- D1/D2: the client calls `DELETE /habits/{id}/complete` and receives `200` with the updated `Habit`
  (`HabitOut`), also when the habit was not completed today; `404` for an unknown habit.
- D4: Undo appears on the habit card only; complete-all (`app/page.tsx:255-270`) and history are untouched.
- D5: Undo is disabled on an archived card, like "Mark done" (`app/components/HabitCard.tsx:238`).
- D6: no confirmation; the page handler uses `try/catch`, sets the error banner and reloads, like
  `handlePinToggle` (`app/page.tsx:172-180`).
- D7: no sound, no animation.
- A1 names: `uncompleteHabit`, `onUncomplete`, `handleUncomplete`. A2: `onUncomplete` is optional.
  A3: `app/archive/page.tsx` is not changed. A4: one toggling button. A5: the rewrite of
  `HabitCard.test.tsx:153-167`. A7: the banner text.

## Shape of the change

```
HabitCard [Undo] ──onUncomplete?(id)──► HabitList ──forwards──► app/page.tsx handleUncomplete(id)
                                                                   │ try
                                                                   ▼
                                       app/lib/api.ts uncompleteHabit(id) ─ request<Habit> ─► DELETE /habits/{id}/complete
                                                                   │ 200 Habit
                                       setHabits(prev.map(h => h.id === id ? updated : h))
                                                                   │ catch
                                       setError(A7 text); loadHabits(categoryFilter, showArchived, priorityFilter)
```

- The card's completed state becomes an Undo action instead of a disabled "Done today" label. After a
  successful undo the returned `Habit` has `completed_today: false`, so the same button shows
  "Mark done" again, the freeze control re-enables (`app/components/HabitCard.tsx:245`), and the streak
  line, weekly progress, "Due today" badge, header "x/y done today" and complete-all count update from
  state (`app/page.tsx:251,253`).
- `completed_today` keeps coming from the API (`SSR-1`); no client date logic.
- No type change (`TYPES-1`): `Habit.completed_today` exists (`app/types/HabitTypes.ts:13`).
- Not changed: `app/types/HabitTypes.ts`, `package.json`, `package-lock.json`, `app/globals.css`,
  `app/archive/page.tsx`, `app/history/page.tsx`, `app/stats/page.tsx`, `app/lib/export.ts`,
  `test/mock-data.ts`.

## Interfaces

### Consumed (frozen once `verify-server-undo-today-2` is green)

```
DELETE /habits/{habit_id}/complete   →  200 HabitOut  |  404 {"detail": "Habit not found"}
```

Full definition in the primary design, § Interfaces, "The frozen cross-repository contract".

### `app/lib/api.ts` (frozen file; the Lead grants client slice 1 this one edit)

Directly after `completeHabit` (`:71-73`):

```ts
export function uncompleteHabit(id: number): Promise<Habit> {
  return request<Habit>(`/habits/${id}/complete`, { method: "DELETE" });
}
```

Through `request()` (`API-1`); a non-2xx (404) throws (`:10-12`).

### `app/components/HabitCard.tsx`

`HabitCardProps` (`:20-37`) gains, after `onPriorityChange?` (`:36`):

```ts
  onUncomplete?: (id: number) => void;
```

and the component destructures `onUncomplete`. **Optional** (A2): a required prop breaks
`npx tsc --noEmit` on the 19 `<HabitCard` renders in `HabitCard.test.tsx`, the 3 `<HabitList` renders in
`HabitList.test.tsx` and `app/archive/page.tsx:151-163`. Without it, the Undo control renders disabled.

The primary button (`:236-242`) becomes, following the freeze toggle at `:243-252`:

```tsx
<button
  onClick={() => (habit.completed_today ? onUncomplete?.(habit.id) : onComplete(habit.id))}
  disabled={habit.archived || (habit.completed_today && !onUncomplete)}
  aria-label={habit.completed_today ? `Undo today's completion of ${habit.name}` : undefined}
  className={
    habit.completed_today
      ? "rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-200 disabled:opacity-50 disabled:hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
      : "rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
  }
>
  {habit.completed_today ? "Undo" : "Mark done"}
</button>
```

| State | Visible text | Accessible name | Enabled when | Click |
|---|---|---|---|---|
| not completed today | `Mark done` | `Mark done` (no `aria-label`, as today) | `!habit.archived` | `onComplete(habit.id)` |
| completed today | `Undo` | `Undo today's completion of <name>` | `!habit.archived && onUncomplete` passed | `onUncomplete(habit.id)` |

The second string in `className` is the existing one, unchanged. The `Undo` palette mirrors the freeze
toggle's active palette (`:249`) in emerald; it is plain Tailwind in the component, no `globals.css`.

Testing Library: the accessible name `Undo today's completion of <name>` matches none of `/mark done/i`,
`/done today/i`, `/freeze/i`, `/unfreeze/i`; and no other card control's name contains "undo" (the card's
names read Edit…, Pin/Unpin, Cycle priority…, Freeze/Unfreeze, Duplicate, Archive/Unarchive, Delete).
New tests query `getByRole("button", { name: /undo/i })`. The apostrophe is inside a template string in an
attribute, not JSX text, so `react/no-unescaped-entities` does not apply.

### `app/components/HabitList.tsx`

`HabitListProps` (`:4-22`) gains `onUncomplete?: (id: number) => void;` after `onPriorityChange?`; the
component destructures it and passes `onUncomplete={onUncomplete}` to each `HabitCard` (`:48-60`), after
`onPriorityChange`.

### `app/page.tsx`

Import `uncompleteHabit` in the `@/app/lib/api` import block (alphabetical, between `skipHabit` and
`unskipHabit`). Directly after `handleUnskip` (`:113-116`):

```ts
async function handleUncomplete(id: number) {
  try {
    const updated = await uncompleteHabit(id);
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
  } catch {
    setError("Could not undo that completion — refreshing the list.");
    loadHabits(categoryFilter, showArchived, priorityFilter);
  }
}
```

and on the `HabitList` at `:441-459`, after `onUnskip={handleUnskip}`: `onUncomplete={handleUncomplete}`.
No `window.confirm` (D6). `app/archive/page.tsx` passes nothing (A3).

## Slices, in order

Three client slices, after the two server slices in the primary design. Each is one commit
`undo-today slice N: <what>` on `feature/undo-today` in `.claude/worktrees/undo-today`. None is
helper-eligible: every slice touches product code.

**Cross-repository edge.** `build-client-undo-today-1` ⊣ `verify-server-undo-today-2` (green). The frozen
contract between the repositories is the route and the `HabitOut` response.

Client gate for every slice: `npm test`, `npx tsc --noEmit` (clean), `npm run lint` (at most 9 errors, the
baseline; none in a file the slice touched), `npm run build`. Test-count deltas are relative to the count
the verifier observes on the previous head (the base for slice 1).

1. **`build-client-undo-today-1` — `uncompleteHabit` in `app/lib/api.ts`.** Depends on
   `verify-server-undo-today-2` green. **The Lead grants this slice an edit to the frozen
   `app/lib/api.ts`**: the one function above, nothing else in the file.
   - Files: `app/lib/api.ts`, `app/lib/__tests__/api.test.ts`.
   - Test added, directly after `unskipHabit issues a DELETE to the skip endpoint` (`:168-184`) and
     modelled on it: `uncompleteHabit issues a DELETE to the complete endpoint` — `updated =
     makeMockHabit({ id: 2, completed_today: false })`; `fetch` stubbed to `{ ok: true, status: 200,
     json: async () => updated }`; `await uncompleteHabit(2)` equals `updated`; `fetch` called with
     `expect.stringContaining("/habits/2/complete")` and `expect.objectContaining({ method: "DELETE" })`.
     Add `uncompleteHabit` to the import list (alphabetical, before `unskipHabit`).
   - Verifier knows it is done when: the gate passes with +1 test; `git diff` touches only the two files
     and `api.ts` gains exactly one function using `request<Habit>` (`API-1`); `HabitTypes.ts`,
     `package*.json` unchanged. The existing `throws when the response is not ok` test (`:197`) covers the
     404 path through `request()`.

2. **`build-client-undo-today-2` — the card's Undo control, forwarded through `HabitList`.**
   - Files: `app/components/HabitCard.tsx`, `app/components/HabitList.tsx`,
     `app/components/__tests__/HabitCard.test.tsx`, `app/components/__tests__/HabitList.test.tsx`.
   - Tests in `HabitCard.test.tsx` (every render passes the same seven required callbacks as the existing
     tests):
     - **Rewritten in place** (A5): `disables the button once already completed today` (`:153-167`)
       becomes `offers an enabled Undo instead of a disabled button once completed today`: render
       `makeMockHabit({ completed_today: true })` with `onUncomplete={vi.fn()}`; assert
       `getByRole("button", { name: /undo/i })` is not disabled and has text content `Undo`; assert
       `queryByRole("button", { name: /done today/i })` and `queryByRole("button", { name: /mark done/i })`
       are both `null`.
     - Added after it: `calls onUncomplete with the habit id when undoing today's completion`: habit
       `{ id: 7, completed_today: true }`, `onComplete` and `onUncomplete` as separate `vi.fn()`; click
       `/undo/i`; `onUncomplete` called with `7`, `onComplete` not called.
     - Added: `disables Undo for an archived habit completed today`: habit
       `{ completed_today: true, archived: true }` with `onUncomplete={vi.fn()}`; `/undo/i` is disabled (D5).
     - Added: `disables Undo when no onUncomplete handler is passed`: habit `{ completed_today: true }`
       without `onUncomplete`; `/undo/i` is disabled (A2, A3).
     - Unchanged and must still pass: `calls onComplete with the habit id when marking done` (`:135-151`),
       the freeze/unfreeze tests (`:282-316`), `disables the freeze button once already completed today`
       (`:318-332`).
   - Test in `HabitList.test.tsx`: `forwards onUncomplete to each card`: render
     `habits={[makeMockHabit({ id: 4, name: "Read", completed_today: true })]}` with the seven required
     callbacks and `onUncomplete={onUncomplete}`; `await userEvent.click(getByRole("button", { name: /undo/i }))`;
     `onUncomplete` called with `4`. Add the imports `userEvent` from `@testing-library/user-event` and
     `makeMockHabit` from `@/test/mock-data` (extend the existing `MOCK_HABITS` import). The three existing
     renders are not edited.
   - Verifier knows it is done when: the gate passes with +4 tests (the rewrite keeps the count);
     `npx tsc --noEmit` is clean with no existing render edited (proves the prop is optional); `git diff`
     touches only the four files; `app/archive/page.tsx` and `app/globals.css` unchanged. Probe: render an
     archived, completed habit without `onUncomplete` and confirm Undo is disabled and clicking calls nothing.

3. **`build-client-undo-today-3` — `handleUncomplete` on the home page.**
   - Files: `app/page.tsx` only.
   - Tests: none added. `TEST-1` covers `app/lib` and `app/components`; `app/page.tsx` has no test sibling
     today.
   - Verifier knows it is done when: the full gate passes with the same test count as slice 2; the diff is
     the import, the handler above (message exactly `Could not undo that completion — refreshing the list.`)
     and one `onUncomplete={handleUncomplete}` prop; complete-all (`:255-270`) untouched (D4); no
     `window.confirm` (D6); `app/archive/page.tsx` untouched (A3). Optional live probe: run the server on
     its `feature/undo-today` branch and this client, complete a habit, press Undo, and see "Mark done"
     return, the freeze control enabled, and the header count drop by one.

## Decisions left to implementation

None.

## Risks

- **The error banner may never show.** `loadHabits` calls `setError(null)` synchronously (`app/page.tsx:52`),
  so the message set just before it in the `catch` is likely overwritten in the same render batch; the user
  sees a reload, not a message. `handlePinToggle` behaves the same today. D6 mandates that pattern, so slice
  3 copies it; fixing it is out of scope. Flagged for the Design gate.
- **"Done today" wording leaves the card.** A4 replaces it with `Undo` in the emerald palette. If the human
  wants "done" kept visibly, it is a slice 2 label change and must not put "done today" in the accessible
  name.
- **A required prop by mistake** shows as `tsc` errors in both component test files and
  `app/archive/page.tsx`; slice 2's verifier checks no existing render was edited.
- **Browser vs server "today".** Undo pressed just after the server's midnight deletes nothing and returns
  200 with `completed_today: false`; the card simply shows "Mark done". Same exposure as complete and freeze.
- **Lint baseline drift.** Nothing adds an effect; any new error in a touched file fails the slice even if
  the total stays at 9.
