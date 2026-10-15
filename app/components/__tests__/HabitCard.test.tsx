import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HabitCard from "@/app/components/HabitCard";
import { makeMockHabit } from "@/test/mock-data";

describe("HabitCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the habit name, category, and streak", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Meditate", category: "Health", streak: 5 })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByText("Meditate")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText(/5 days streak/)).toBeInTheDocument();
  });

  it("shows a due-today badge when the habit is at risk", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Meditate", at_risk: true })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByText(/due today/i)).toBeInTheDocument();
  });

  it("does not show the due-today badge when the habit is not at risk", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Meditate", at_risk: false })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.queryByText(/due today/i)).not.toBeInTheDocument();
  });

  it("shows a start-your-streak prompt when there is no streak yet", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Meditate", streak: 0 })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByText(/start your streak today/i)).toBeInTheDocument();
    expect(screen.queryByText(/day.*streak/)).not.toBeInTheDocument();
  });

  it("shows weekly progress toward the habit's target", () => {
    render(
      <HabitCard
        habit={makeMockHabit({
          name: "Run",
          target_per_week: 3,
          completed_this_week: 2,
        })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByText("2/3 this week")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: /run weekly progress/i });
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "3");
  });

  it("shows a goal reached badge once the weekly target is met", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Run", target_per_week: 3, completed_this_week: 3 })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByText(/goal reached/i)).toBeInTheDocument();
    expect(screen.queryByText("3/3 this week")).not.toBeInTheDocument();
  });

  it("does not show the goal reached badge before the target is met", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Run", target_per_week: 3, completed_this_week: 2 })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.queryByText("🎉 Goal reached")).not.toBeInTheDocument();
  });

  it("calls onComplete with the habit id when marking done", async () => {
    const onComplete = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 7, completed_today: false })}
        onComplete={onComplete}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /mark done/i }));
    expect(onComplete).toHaveBeenCalledWith(7);
  });

  it("offers an enabled Undo instead of a disabled button once completed today", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ completed_today: true })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
        onUncomplete={vi.fn()}
      />
    );
    const undo = screen.getByRole("button", { name: /undo/i });
    expect(undo).not.toBeDisabled();
    expect(undo).toHaveTextContent("Undo");
    expect(screen.queryByRole("button", { name: /done today/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark done/i })).toBeNull();
  });

  it("calls onUncomplete with the habit id when undoing today's completion", async () => {
    const onComplete = vi.fn();
    const onUncomplete = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 7, completed_today: true })}
        onComplete={onComplete}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
        onUncomplete={onUncomplete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(onUncomplete).toHaveBeenCalledWith(7);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("disables Undo for an archived habit completed today", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ completed_today: true, archived: true })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
        onUncomplete={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });

  it("disables Undo when no onUncomplete handler is passed", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ completed_today: true })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });

  it("calls onDelete with the habit id once the user confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 3, name: "Stretch" })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete stretch/i }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Stretch"));
    expect(onDelete).toHaveBeenCalledWith(3);
  });

  it("calls onDuplicate with the habit id when Duplicate is clicked", async () => {
    const onDuplicate = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 7, name: "Stretch" })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={onDuplicate}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /duplicate stretch/i }));
    expect(onDuplicate).toHaveBeenCalledWith(7);
  });

  it("does not call onDelete when the user cancels the confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDelete = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 3, name: "Stretch" })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete stretch/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("switches to an edit form when Edit is clicked", async () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Stretch" })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /edit stretch/i }));
    expect(screen.getByLabelText(/edit name for stretch/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("calls onEdit with the updated fields on save", async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <HabitCard
        habit={makeMockHabit({ id: 5, name: "Stretch", category: "General", target_per_week: 7 })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /edit stretch/i }));
    const nameInput = screen.getByLabelText(/edit name for stretch/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Stretch daily");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onEdit).toHaveBeenCalledWith(5, "Stretch daily", "General", 7, "");
  });

  it("shows a frozen badge when the habit is skipped today", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Meditate", skipped_today: true })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByText(/frozen today/i)).toBeInTheDocument();
  });

  it("calls onSkip with the habit id when freezing", async () => {
    const onSkip = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 8, skipped_today: false })}
        onComplete={vi.fn()}
        onSkip={onSkip}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /freeze/i }));
    expect(onSkip).toHaveBeenCalledWith(8);
  });

  it("calls onUnskip with the habit id when already frozen", async () => {
    const onUnskip = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ id: 8, skipped_today: true })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={onUnskip}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /unfreeze/i }));
    expect(onUnskip).toHaveBeenCalledWith(8);
  });

  it("disables the freeze button once already completed today", () => {
    render(
      <HabitCard
        habit={makeMockHabit({ completed_today: true, skipped_today: false })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /freeze/i })).toBeDisabled();
  });

  it("returns to the normal view without calling onEdit when cancelled", async () => {
    const onEdit = vi.fn();
    render(
      <HabitCard
        habit={makeMockHabit({ name: "Stretch" })}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        onUnskip={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        onArchiveToggle={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /edit stretch/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /edit stretch/i })).toBeInTheDocument();
  });
});
