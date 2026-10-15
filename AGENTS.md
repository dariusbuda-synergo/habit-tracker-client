@../dev-agent-kit/WORKSPACE.md

# habit-tracker-client — agent guide

Compact map for agents working in this repository. Do not repeat what the code shows; point at
the file. Rationale lives in `docs/<feature>/guides/`. The four headed sections below are read
by the dev-agent-kit orchestration skill and checked by `bin/check`; keep their exact headings.

## What this is

A Next.js 16 (App Router) + React 19 + Tailwind 4 single-user UI for the habit API in the
sibling `../habit-tracker-server`. Every page is a client component that fetches through
`app/lib/api.ts` from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). Runs on
:3000 locally; a Vercel deployment is the other origin the server allows.

## Subsystems

| Path | Responsibility |
|---|---|
| `middleware.ts` | redirects every route except `/login` to `/login` unless the `habit_auth` cookie is `1` |
| `app/login/page.tsx` | the hardcoded sign-in; sets the cookie |
| `app/layout.tsx` | fonts, metadata, inline theme bootstrap script |
| `app/page.tsx` | home: list, create, filters, sort, search, complete-all, export/import |
| `app/history/page.tsx`, `app/stats/page.tsx`, `app/archive/page.tsx`, `app/settings/page.tsx` | secondary pages, one concern each |
| `app/components/` | `HabitCard`, `HabitForm`, `HabitList`, `HistoryStrip`, `StatCard`, `StatsSummary`, `ThemeToggle`, `LogoutButton` |
| `app/lib/api.ts` | the only `fetch`; one function per endpoint |
| `app/lib/{filterSort,history,export,import}.ts` | pure helpers over `Habit[]` |
| `app/lib/{viewPrefs,settingsPrefs}.ts` | localStorage preferences |
| `app/lib/{categoryColors,priorityColors}.ts` | Tailwind class maps per category / priority |
| `app/types/HabitTypes.ts` | `Habit`, `HabitStats` and the fixed option lists |
| `test/mock-data.ts`, `vitest.config.ts`, `vitest.setup.ts` | fixtures; jsdom, `@` alias, jest-dom |

## Invariants

- `TYPES-1` `app/types/HabitTypes.ts` mirrors the server's `HabitOut` / `HabitStats` field for field; a field is added on both sides in the same feature.
- `API-1` All network access goes through `request()` in `app/lib/api.ts`; non-2xx throws, 204 returns `undefined`.
- `SSR-1` Browser-only state (localStorage, `Date` formatting, `document` classes) is read in a `useEffect` after mount, never as initial state: the server render and the first client render must match. This is the accepted reason for the `set-state-in-effect` lint baseline below.
- `AUTH-1` Access control is the `habit_auth=1` cookie checked in `middleware.ts`; the credentials are constants in `app/login/page.tsx`. There is no server-side auth.
- `PREFS-1` Preferences live only in localStorage under the keys in `viewPrefs.ts`, `settingsPrefs.ts` and `settings/page.tsx`; they are never sent to the API, and the server does not honour them (see the server's `WEEK-1`).
- `TEST-1` A new or changed module under `app/lib` or `app/components` ships with a `__tests__` sibling; tests render in jsdom with Testing Library and the `@` alias from `vitest.config.ts`.

## Mechanical gate

```
npm test             # vitest run: 14 files, 79 passed on main f96ef02 (2026-10-15); no CI workflow exists
npx tsc --noEmit     # clean on main f96ef02
npm run lint         # BASELINE RED on main f96ef02: 9 errors (7 react-hooks/set-state-in-effect, 2 react/no-unescaped-entities in app/settings/page.tsx:106); a slice must not add to that count
npm run build
app/lib/__tests__/api.test.ts for any change to app/lib/api.ts; app/components/__tests__/HabitCard.test.tsx for any change to HabitCard.tsx
```

## Branching

Default branch `main`. Feature branches, PRs into `main`, merge commits (`main` already carries
merge commits from feature branches). Frozen during fan-out (Lead-owned; builders request changes by message): `package.json`,
`package-lock.json`, `app/types/HabitTypes.ts`, `app/lib/api.ts`, `app/globals.css`. Roster is
not pinned; name it at kickoff.

## Build, run, test

```
npm install
cp .env.local.example .env.local      # NEXT_PUBLIC_API_BASE_URL, defaults to http://localhost:8000
npm run dev                           # http://localhost:3000; the API must be up
npm test && npx tsc --noEmit && npm run lint && npm run build
```

## Maintaining this file

Keep it a map. Prefer pruning over appending. Move rationale to `docs/<feature>/guides/` and link it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
