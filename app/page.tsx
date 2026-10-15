"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import HabitForm from "@/app/components/HabitForm";
import HabitList from "@/app/components/HabitList";
import LogoutButton from "@/app/components/LogoutButton";
import ThemeToggle from "@/app/components/ThemeToggle";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  listHabits,
  skipHabit,
  uncompleteHabit,
  unskipHabit,
  updateHabit,
} from "@/app/lib/api";
import { downloadFile, habitsToCsv, habitsToJson } from "@/app/lib/export";
import { filterHabitsByName, sortHabits } from "@/app/lib/filterSort";
import type { HabitSortKey } from "@/app/lib/filterSort";
import { parseHabitsCsv } from "@/app/lib/import";
import { loadViewPrefs, saveViewPrefs } from "@/app/lib/viewPrefs";
import type { Habit } from "@/app/types/HabitTypes";
import { HABIT_CATEGORIES, PRIORITY_LEVELS } from "@/app/types/HabitTypes";

const SORT_OPTIONS: { value: HabitSortKey; label: string }[] = [
  { value: "name", label: "Name (A-Z)" },
  { value: "streak", label: "Streak (highest first)" },
  { value: "category", label: "Category" },
  { value: "priority", label: "Priority (highest first)" },
  { value: "target_per_week", label: "Weekly target (highest first)" },
];

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<HabitSortKey>("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingAll, setCompletingAll] = useState(false);
  const [prefsRestored, setPrefsRestored] = useState(false);
  const [importing, setImporting] = useState(false);
  const [todayLabel, setTodayLabel] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadHabits = useCallback(
    (category: string, includeArchived: boolean, priority: string) => {
      setLoading(true);
      setError(null);
      listHabits(category || undefined, includeArchived, priority || undefined)
        .then(setHabits)
        .catch(() => setError("Could not load habits. Is the API running?"))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    // Computed client-side only: the server render and the browser's first
    // render must produce identical HTML, but locale/timezone (and the exact
    // instant rendered) can differ between them, which was hard-failing
    // hydration with React error #418 -- see the identical, inline
    // `new Date().toLocaleDateString(...)` this used to be, below.
    setTodayLabel(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    const stored = loadViewPrefs();
    if (stored.categoryFilter !== undefined) setCategoryFilter(stored.categoryFilter);
    if (stored.priorityFilter !== undefined) setPriorityFilter(stored.priorityFilter);
    if (stored.showArchived !== undefined) setShowArchived(stored.showArchived);
    if (stored.searchQuery !== undefined) setSearchQuery(stored.searchQuery);
    if (stored.sortBy !== undefined) setSortBy(stored.sortBy);
    setPrefsRestored(true);
  }, []);

  useEffect(() => {
    if (!prefsRestored) return;
    saveViewPrefs({ categoryFilter, priorityFilter, showArchived, searchQuery, sortBy });
  }, [prefsRestored, categoryFilter, priorityFilter, showArchived, searchQuery, sortBy]);

  useEffect(() => {
    if (!prefsRestored) return;
    loadHabits(categoryFilter, showArchived, priorityFilter);
  }, [prefsRestored, categoryFilter, showArchived, priorityFilter, loadHabits]);

  async function handleCreate(name: string, category: string, targetPerWeek: number, notes: string) {
    const habit = await createHabit(name, category, targetPerWeek, notes);
    if (!categoryFilter || categoryFilter === habit.category) {
      setHabits((prev) => [...prev, habit]);
    }
  }

  async function handleComplete(id: number) {
    const updated = await completeHabit(id);
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }

  async function handleSkip(id: number) {
    const updated = await skipHabit(id);
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }

  async function handleUnskip(id: number) {
    const updated = await unskipHabit(id);
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }

  async function handleUncomplete(id: number) {
    try {
      const updated = await uncompleteHabit(id);
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
    } catch {
      await loadHabits(categoryFilter, showArchived, priorityFilter);
      setError("Could not undo that completion — refreshing the list.");
    }
  }

  async function handleDelete(id: number) {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleEdit(
    id: number,
    name: string,
    category: string,
    targetPerWeek: number,
    notes: string
  ) {
    const updated = await updateHabit(id, {
      name,
      category,
      target_per_week: targetPerWeek,
      notes,
    });
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }

  async function handleArchiveToggle(id: number, archived: boolean) {
    try {
      const updated = await updateHabit(id, { archived });
      if (archived && !showArchived) {
        setHabits((prev) => prev.filter((h) => h.id !== id));
      } else {
        setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      }
    } catch {
      setError("Could not update that habit — refreshing the list.");
      loadHabits(categoryFilter, showArchived, priorityFilter);
    }
  }

  async function handleDuplicate(id: number) {
    const source = habits.find((h) => h.id === id);
    if (!source) return;
    try {
      const copy = await createHabit(
        `${source.name} (copy)`,
        source.category,
        source.target_per_week,
        source.notes ?? undefined,
        source.priority
      );
      if (!categoryFilter || categoryFilter === copy.category) {
        setHabits((prev) => [...prev, copy]);
      }
    } catch {
      setError("Could not duplicate that habit — try again.");
    }
  }

  async function handlePinToggle(id: number, pinned: boolean) {
    try {
      const updated = await updateHabit(id, { pinned });
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
    } catch {
      setError("Could not update that habit — refreshing the list.");
      loadHabits(categoryFilter, showArchived, priorityFilter);
    }
  }

  async function handlePriorityChange(id: number, priority: string) {
    try {
      const updated = await updateHabit(id, { priority });
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
    } catch {
      setError("Could not update that habit — refreshing the list.");
      loadHabits(categoryFilter, showArchived, priorityFilter);
    }
  }

  function handleExportJson() {
    downloadFile(habitsToJson(habits), "habits.json", "application/json");
  }

  function handleExportCsv() {
    downloadFile(habitsToCsv(habits), "habits.csv", "text/csv");
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const { habits: toImport, skipped } = parseHabitsCsv(text);
      const results = await Promise.allSettled(
        toImport.map((h) => createHabit(h.name, h.category, h.target_per_week, h.notes, h.priority))
      );
      const created = results.filter((r): r is PromiseFulfilledResult<Habit> => r.status === "fulfilled");
      const failed = results.length - created.length;

      if (created.length > 0) {
        loadHabits(categoryFilter, showArchived, priorityFilter);
      }

      const parts = [`Imported ${created.length}/${toImport.length} habits`];
      if (skipped > 0) parts.push(`${skipped} row${skipped === 1 ? "" : "s"} skipped (missing name)`);
      if (failed > 0) parts.push(`${failed} failed`);
      setError(toImport.length === 0 && skipped === 0 ? "That file has no importable habits." : parts.join(" — "));
    } catch {
      setError("Could not read that file.");
    } finally {
      setImporting(false);
    }
  }

  function handleClearFilters() {
    setSearchQuery("");
    setCategoryFilter("");
    setPriorityFilter("");
    setShowArchived(false);
    setSortBy("name");
  }

  const filtersActive =
    searchQuery !== "" ||
    categoryFilter !== "" ||
    priorityFilter !== "" ||
    showArchived ||
    sortBy !== "name";

  const visibleHabits = sortHabits(filterHabitsByName(habits, searchQuery), sortBy);
  const pendingToday = visibleHabits.filter((h) => !h.completed_today && !h.archived);
  const activeHabits = visibleHabits.filter((h) => !h.archived);
  const doneToday = activeHabits.filter((h) => h.completed_today).length;

  async function handleCompleteAll() {
    setCompletingAll(true);
    try {
      const results = await Promise.allSettled(pendingToday.map((h) => completeHabit(h.id)));
      const updatesById = new Map(
        results
          .filter((r): r is PromiseFulfilledResult<Habit> => r.status === "fulfilled")
          .map((r) => [r.value.id, r.value])
      );
      setHabits((prev) => prev.map((h) => updatesById.get(h.id) ?? h));
      const failedCount = results.length - updatesById.size;
      setError(failedCount > 0 ? `Completed ${updatesById.size}/${results.length} habits — ${failedCount} failed. Try again.` : null);
    } finally {
      setCompletingAll(false);
    }
  }

  const controlInputClasses =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900";
  // whitespace-nowrap: "View stats" is two words -- without it, it wraps to two
  // lines while its single-word siblings (History, Archive) stay on one, making
  // that one pill visibly taller than the rest of the row.
  const secondaryButtonClasses =
    "whitespace-nowrap rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

  return (
    <div className="flex flex-1 justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <main className="flex w-full max-w-xl flex-col gap-6 px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent dark:from-emerald-400 dark:to-blue-400">
              Habit Tracker
            </h1>
            <p className="text-sm text-zinc-500">Build small daily habits, one day at a time.</p>
            <p className="text-xs text-zinc-400">{todayLabel}</p>
            {!loading && activeHabits.length > 0 && (
              <p className="text-xs text-zinc-400">
                {doneToday}/{activeHabits.length} done today
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link href="/history" className={secondaryButtonClasses}>
              History
            </Link>
            <Link href="/stats" className={secondaryButtonClasses}>
              View stats
            </Link>
            <Link href="/archive" className={secondaryButtonClasses}>
              Archive
            </Link>
            <Link href="/settings" className={secondaryButtonClasses}>
              Settings
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        <HabitForm onCreate={handleCreate} />

        <div className="flex items-center gap-2">
          <label htmlFor="habit-search" className="sr-only">
            Search habits by name
          </label>
          <input
            id="habit-search"
            type="search"
            placeholder="Search habits by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 ${controlInputClasses}`}
          />
          <label htmlFor="habit-sort" className="text-sm text-zinc-500">
            Sort by
          </label>
          <select
            id="habit-sort"
            aria-label="Sort habits by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as HabitSortKey)}
            className={controlInputClasses}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="category-filter" className="text-sm text-zinc-500">
              Filter by category
            </label>
            <select
              id="category-filter"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={controlInputClasses}
            >
              <option value="">All</option>
              {HABIT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="priority-filter" className="text-sm text-zinc-500">
              Filter by priority
            </label>
            <select
              id="priority-filter"
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={controlInputClasses}
            >
              <option value="">All</option>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-emerald-600"
            />
            Show archived
          </label>
          {filtersActive && (
            <button onClick={handleClearFilters} className={secondaryButtonClasses}>
              Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleCompleteAll}
              disabled={completingAll || pendingToday.length === 0}
              className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              {completingAll ? "Completing…" : `Complete all for today (${pendingToday.length})`}
            </button>
            <button
              onClick={handleExportJson}
              disabled={habits.length === 0}
              className={secondaryButtonClasses}
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCsv}
              disabled={habits.length === 0}
              className={secondaryButtonClasses}
            >
              Export CSV
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              disabled={importing}
              className={secondaryButtonClasses}
            >
              {importing ? "Importing…" : "Import CSV"}
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-zinc-500">Loading habits…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && (
          <HabitList
            habits={visibleHabits}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onUnskip={handleUnskip}
            onUncomplete={handleUncomplete}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onArchiveToggle={handleArchiveToggle}
            onDuplicate={handleDuplicate}
            onPinToggle={handlePinToggle}
            onPriorityChange={handlePriorityChange}
            emptyMessage={
              searchQuery
                ? `No habits match "${searchQuery}".`
                : categoryFilter
                  ? `No habits in the "${categoryFilter}" category yet.`
                  : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
