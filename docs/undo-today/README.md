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
- [undo-today-client-3.verify.md](evidence/undo-today-client-3.verify.md): verification of client slice 3 (`handleUncomplete` on the home page and the list rendered whenever not loading, commit `bb39da4`); builder sonnet, verifier opus; verdict green
- [undo-today-feature.review.md](evidence/undo-today-feature.review.md): feature review of the whole client branch (`d9f7527..11a90ca`: slices 1-3 against every contract invariant, every settled decision and the two post-design human decisions, mechanical gate re-run on the head, 15 cross-slice probes, 8 mutants); builders sonnet, verifiers opus, reviewer fable; verdict green

## guides

(none yet)
