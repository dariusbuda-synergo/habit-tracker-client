import type { Habit, HabitStats } from "@/app/types/HabitTypes";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function listHabits(
  category?: string,
  includeArchived = false,
  priority?: string
): Promise<Habit[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (includeArchived) params.set("include_archived", "true");
  if (priority) params.set("priority", priority);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<Habit[]>(`/habits${query}`);
}

export function listCategories(): Promise<string[]> {
  return request<string[]>("/habits/categories");
}

export function getHabitStats(): Promise<HabitStats> {
  return request<HabitStats>("/habits/stats");
}

export function createHabit(
  name: string,
  category: string,
  targetPerWeek: number,
  notes?: string,
  priority?: string
): Promise<Habit> {
  return request<Habit>("/habits", {
    method: "POST",
    body: JSON.stringify({ name, category, target_per_week: targetPerWeek, notes, priority }),
  });
}

export function updateHabit(
  id: number,
  updates: Partial<{
    name: string;
    category: string;
    priority: string;
    target_per_week: number;
    notes: string;
    archived: boolean;
    pinned: boolean;
  }>
): Promise<Habit> {
  return request<Habit>(`/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function completeHabit(id: number): Promise<Habit> {
  return request<Habit>(`/habits/${id}/complete`, { method: "POST" });
}

export function uncompleteHabit(id: number): Promise<Habit> {
  return request<Habit>(`/habits/${id}/complete`, { method: "DELETE" });
}

export function skipHabit(id: number): Promise<Habit> {
  return request<Habit>(`/habits/${id}/skip`, { method: "POST" });
}

export function unskipHabit(id: number): Promise<Habit> {
  return request<Habit>(`/habits/${id}/skip`, { method: "DELETE" });
}

export function deleteHabit(id: number): Promise<void> {
  return request<void>(`/habits/${id}`, { method: "DELETE" });
}
