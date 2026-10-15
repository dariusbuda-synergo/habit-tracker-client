import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HabitList from "@/app/components/HabitList";
import { MOCK_HABITS, makeMockHabit } from "@/test/mock-data";

describe("HabitList", () => {
  it("shows an empty state when there are no habits", () => {
    render(<HabitList habits={[]} onComplete={vi.fn()} onSkip={vi.fn()} onUnskip={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onArchiveToggle={vi.fn()} onDuplicate={vi.fn()} />);
    expect(screen.getByText(/no habits yet/i)).toBeInTheDocument();
  });

  it("renders one card per habit", () => {
    render(
      <HabitList habits={MOCK_HABITS} onComplete={vi.fn()} onSkip={vi.fn()} onUnskip={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onArchiveToggle={vi.fn()} onDuplicate={vi.fn()} />
    );
    expect(screen.getByText("Drink water")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("shows a custom empty message when one is provided", () => {
    render(
      <HabitList
        habits={[]}
        onComplete={vi.fn()} onSkip={vi.fn()} onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()} onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
        emptyMessage='No habits in the "Health" category yet.'
      />
    );
    expect(screen.getByText('No habits in the "Health" category yet.')).toBeInTheDocument();
    expect(screen.queryByText(/no habits yet — add one above/i)).not.toBeInTheDocument();
  });

  it("forwards onUncomplete to each card", async () => {
    const onUncomplete = vi.fn();
    render(
      <HabitList
        habits={[makeMockHabit({ id: 4, name: "Read", completed_today: true })]}
        onComplete={vi.fn()} onSkip={vi.fn()} onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()} onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
        onUncomplete={onUncomplete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(onUncomplete).toHaveBeenCalledWith(4);
  });
});
