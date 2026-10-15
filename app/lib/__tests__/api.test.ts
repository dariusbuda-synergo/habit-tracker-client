import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  getHabitStats,
  listCategories,
  listHabits,
  skipHabit,
  uncompleteHabit,
  unskipHabit,
  updateHabit,
} from "@/app/lib/api";
import { MOCK_HABITS, makeMockHabit, makeMockStats } from "@/test/mock-data";

describe("habits api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listHabits fetches and parses the habit list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_HABITS,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listHabits();

    expect(result).toEqual(MOCK_HABITS);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits"),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it("createHabit posts the name, category, and weekly target as JSON", async () => {
    const created = makeMockHabit({
      id: 9,
      name: "Journal",
      category: "Personal",
      target_per_week: 5,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => created,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createHabit("Journal", "Personal", 5);

    expect(result).toEqual(created);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Journal",
      category: "Personal",
      target_per_week: 5,
    });
  });

  it("listHabits includes the category as a query param when given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_HABITS,
    });
    vi.stubGlobal("fetch", fetchMock);

    await listHabits("Health");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits?category=Health"),
      expect.anything()
    );
  });

  it("listCategories fetches the distinct category list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ["Health", "Learning"],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listCategories();

    expect(result).toEqual(["Health", "Learning"]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/categories"),
      expect.anything()
    );
  });

  it("getHabitStats fetches the aggregate stats", async () => {
    const stats = makeMockStats();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => stats,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getHabitStats();

    expect(result).toEqual(stats);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/stats"),
      expect.anything()
    );
  });

  it("updateHabit patches the given fields as JSON", async () => {
    const updated = makeMockHabit({ id: 6, name: "Journal daily", category: "Personal" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateHabit(6, { name: "Journal daily", category: "Personal" });

    expect(result).toEqual(updated);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/habits/6");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ name: "Journal daily", category: "Personal" });
  });

  it("completeHabit posts to the complete endpoint", async () => {
    const updated = makeMockHabit({ id: 2, completed_today: true, streak: 1 });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await completeHabit(2);

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/2/complete"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("skipHabit posts to the skip endpoint", async () => {
    const updated = makeMockHabit({ id: 2, skipped_today: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await skipHabit(2);

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/2/skip"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("unskipHabit issues a DELETE to the skip endpoint", async () => {
    const updated = makeMockHabit({ id: 2, skipped_today: false });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await unskipHabit(2);

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/2/skip"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("uncompleteHabit issues a DELETE to the complete endpoint", async () => {
    const updated = makeMockHabit({ id: 2, completed_today: false });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uncompleteHabit(2);

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/2/complete"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("deleteHabit issues a DELETE and resolves without a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteHabit(4)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/habits/4"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listHabits()).rejects.toThrow(/500/);
  });
});
