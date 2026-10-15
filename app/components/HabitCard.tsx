"use client";

import { useState } from "react";
import { getCategoryBadgeClasses } from "@/app/lib/categoryColors";
import { getPriorityBadgeClasses, nextPriority } from "@/app/lib/priorityColors";
import type { Habit } from "@/app/types/HabitTypes";
import { HABIT_CATEGORIES, STREAK_MILESTONES, WEEKLY_TARGET_OPTIONS } from "@/app/types/HabitTypes";

function milestoneReached(streak: number): number | null {
  return STREAK_MILESTONES.find((milestone) => streak >= milestone) ?? null;
}

const INPUT_CLASSES =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900";
// py-1.5 matches the primary "Mark done" button's vertical padding so every
// button in the action row sits at the same height, not just the same baseline.
const GHOST_BUTTON_CLASSES =
  "rounded-full px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

interface HabitCardProps {
  habit: Habit;
  onComplete: (id: number) => void;
  onSkip: (id: number) => void;
  onUnskip: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (
    id: number,
    name: string,
    category: string,
    targetPerWeek: number,
    notes: string
  ) => Promise<void>;
  onArchiveToggle: (id: number, archived: boolean) => void;
  onDuplicate: (id: number) => void;
  onPinToggle?: (id: number, pinned: boolean) => void;
  onPriorityChange?: (id: number, priority: string) => void;
  onUncomplete?: (id: number) => void;
}

export default function HabitCard({
  habit,
  onComplete,
  onSkip,
  onUnskip,
  onDelete,
  onEdit,
  onArchiveToggle,
  onDuplicate,
  onPinToggle,
  onPriorityChange,
  onUncomplete,
}: HabitCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);
  const [category, setCategory] = useState(habit.category);
  const [targetPerWeek, setTargetPerWeek] = useState(habit.target_per_week);
  const [notes, setNotes] = useState(habit.notes ?? "");
  const [saving, setSaving] = useState(false);

  const goalReached = habit.completed_this_week >= habit.target_per_week;

  function startEditing() {
    setName(habit.name);
    setCategory(habit.category);
    setTargetPerWeek(habit.target_per_week);
    setNotes(habit.notes ?? "");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onEdit(habit.id, trimmed, category, targetPerWeek, notes.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-emerald-500/50 bg-white px-4 py-4 shadow-sm dark:bg-zinc-900/40">
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input
            aria-label={`Edit name for ${habit.name}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`min-w-[140px] flex-1 ${INPUT_CLASSES}`}
          />
          <select
            aria-label={`Edit category for ${habit.name}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={INPUT_CLASSES}
          >
            {HABIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label={`Edit times per week for ${habit.name}`}
            value={targetPerWeek}
            onChange={(e) => setTargetPerWeek(Number(e.target.value))}
            className={INPUT_CLASSES}
          >
            {WEEKLY_TARGET_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}x / week
              </option>
            ))}
          </select>
          <input
            aria-label={`Edit notes for ${habit.name}`}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`basis-full ${INPUT_CLASSES}`}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
          >
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={GHOST_BUTTON_CLASSES}>
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {onPinToggle && (
            <button
              onClick={() => onPinToggle(habit.id, !habit.pinned)}
              aria-label={habit.pinned ? `Unpin ${habit.name}` : `Pin ${habit.name}`}
              aria-pressed={habit.pinned}
              className={`shrink-0 leading-none ${habit.pinned ? "text-amber-500" : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-500"}`}
            >
              {habit.pinned ? "★" : "☆"}
            </button>
          )}
          <p className="font-medium">{habit.name}</p>
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryBadgeClasses(habit.category)}`}
          >
            {habit.category}
          </span>
          {onPriorityChange ? (
            <button
              onClick={() => onPriorityChange(habit.id, nextPriority(habit.priority))}
              aria-label={`Cycle priority for ${habit.name}, currently ${habit.priority}`}
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${getPriorityBadgeClasses(habit.priority)}`}
            >
              {habit.priority}
            </button>
          ) : (
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityBadgeClasses(habit.priority)}`}
            >
              {habit.priority}
            </span>
          )}
          {milestoneReached(habit.streak) && (
            <span
              role="status"
              aria-label={`${habit.name} reached a ${milestoneReached(habit.streak)}-day streak milestone`}
              className="shrink-0 whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
            >
              🏆 {milestoneReached(habit.streak)}-day streak
            </span>
          )}
          {habit.at_risk && (
            <span
              role="status"
              aria-label={`${habit.name} is at risk of missing its weekly goal`}
              className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            >
              ⏰ Due today
            </span>
          )}
          {habit.skipped_today && (
            <span
              role="status"
              aria-label={`${habit.name} is frozen today`}
              className="shrink-0 whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
            >
              🧊 Frozen today
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {habit.streak === 0
            ? "Start your streak today!"
            : `🔥 ${habit.streak} day${habit.streak === 1 ? "" : "s"} streak`}
          {habit.longest_streak > habit.streak && (
            <span className="text-zinc-400"> · best: {habit.longest_streak}</span>
          )}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div
            role="progressbar"
            aria-label={`${habit.name} weekly progress`}
            aria-valuenow={habit.completed_this_week}
            aria-valuemin={0}
            aria-valuemax={habit.target_per_week}
            className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${goalReached ? "bg-amber-500" : "bg-emerald-600"}`}
              style={{
                width: `${Math.min(
                  100,
                  (habit.completed_this_week / habit.target_per_week) * 100
                )}%`,
              }}
            />
          </div>
          <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
            {goalReached
              ? "🎉 Weekly goal reached"
              : `${habit.completed_this_week}/${habit.target_per_week} this week`}
          </span>
        </div>
        {habit.notes && <p className="mt-1 text-xs text-zinc-500 italic">{habit.notes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:shrink-0 sm:justify-end">
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
        <button
          onClick={() => (habit.skipped_today ? onUnskip(habit.id) : onSkip(habit.id))}
          disabled={habit.completed_today || habit.archived}
          aria-label={
            habit.skipped_today ? `Unfreeze ${habit.name}` : `Freeze ${habit.name} for today`
          }
          className={`${GHOST_BUTTON_CLASSES} ${habit.skipped_today ? "bg-sky-100 text-sky-700 hover:bg-sky-200 hover:text-sky-800 dark:bg-sky-900/40 dark:text-sky-400" : ""}`}
        >
          {habit.skipped_today ? "Unfreeze" : "🧊 Freeze"}
        </button>
        <button onClick={startEditing} aria-label={`Edit ${habit.name}`} className={GHOST_BUTTON_CLASSES}>
          Edit
        </button>
        <button
          onClick={() => onDuplicate(habit.id)}
          aria-label={`Duplicate ${habit.name}`}
          className={GHOST_BUTTON_CLASSES}
        >
          Duplicate
        </button>
        <button
          onClick={() => onArchiveToggle(habit.id, !habit.archived)}
          aria-label={`${habit.archived ? "Unarchive" : "Archive"} ${habit.name}`}
          className={GHOST_BUTTON_CLASSES}
        >
          {habit.archived ? "Unarchive" : "Archive"}
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Delete "${habit.name}"? This can't be undone.`)) {
              onDelete(habit.id);
            }
          }}
          aria-label={`Delete ${habit.name}`}
          className="rounded-full px-3 py-1 text-sm text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
