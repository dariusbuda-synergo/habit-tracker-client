import type { Habit } from "@/app/types/HabitTypes";
import HabitCard from "@/app/components/HabitCard";

interface HabitListProps {
  habits: Habit[];
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
  emptyMessage?: string;
}

export default function HabitList({
  habits,
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
  emptyMessage = "No habits yet — add one above to get started.",
}: HabitListProps) {
  if (habits.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onComplete={onComplete}
          onSkip={onSkip}
          onUnskip={onUnskip}
          onDelete={onDelete}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onDuplicate={onDuplicate}
          onPinToggle={onPinToggle}
          onPriorityChange={onPriorityChange}
          onUncomplete={onUncomplete}
        />
      ))}
    </ul>
  );
}
