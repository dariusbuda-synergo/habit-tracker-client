# undo-today

Undo today's completion: on a habit completed today, the card's "Done today" state becomes an Undo
action that calls the new API endpoint and replaces the habit with the returned summary. Code:
`app/lib/api.ts`, `app/components/{HabitCard,HabitList}.tsx`, `app/page.tsx` (`app/archive/page.tsx`
is not changed, see the design). Tests: the `__tests__` siblings of each. Invariants `TYPES-1`, `API-1`,
`SSR-1`, `TEST-1` in `AGENTS.md`. Server half and primary contract:
`../habit-tracker-server/docs/undo-today/`.

Related area: `../habits/` (the home page, complete and freeze).

## design

- [2026-10-15-undo-today-contract.md](design/2026-10-15-undo-today-contract.md): change contract, client companion (links the server's primary contract for the API facts)
- [2026-10-15-undo-today-design.md](design/2026-10-15-undo-today-design.md): design, client companion (client interfaces and the three client slices in full; links the server's primary design for the shared shape)

## evidence

- [undo-today-client-1.verify.md](evidence/undo-today-client-1.verify.md): verification of client slice 1 (`uncompleteHabit` in `app/lib/api.ts`, commit `8ea48ec`); builder sonnet, verifier opus; verdict green
- [undo-today-client-2.verify.md](evidence/undo-today-client-2.verify.md): verification of client slice 2 (`onUncomplete` prop and the Undo control on `HabitCard`, forwarded through `HabitList`, commit `a5be0ea`); builder sonnet, verifier opus; verdict green

## guides

(none yet)
