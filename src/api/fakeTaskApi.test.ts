import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTask, deleteTask, getTasks, updateTask } from "./fakeTaskApi";
import type { Task } from "../types/task";

const KEY = "team-task-board:tasks";

// Read what's actually saved in localStorage
const saved = (): Task[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");

function task(title: string): Task {
  return {
    id: title, title, priority: "medium",
    completed: false, dueDate: null, archived: false,
    createdAt: "", updatedAt: "",
  };
}

// The API waits 200ms on every call. Fake timers skip the wait,
// so the tests run instantly.
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

async function finish<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe("fakeTaskApi (TTB-8)", () => {
  it("first load with nothing saved returns an empty list", async () => {
    expect(await finish(getTasks())).toEqual([]);
  });

  it("broken saved data doesn't crash the app", async () => {
    localStorage.setItem(KEY, "not valid json");
    expect(await finish(getTasks())).toEqual([]);
  });

  it("createTask saves the new task", async () => {
    const created = await finish(
      createTask({ title: "TEST", priority: "high", dueDate: null })
    );
    expect(created.title).toBe("TEST");
    expect(created.completed).toBe(false);
    expect(saved()).toEqual([created]);
  });

  it("updateTask saves the change and updates updatedAt", async () => {
    localStorage.setItem(KEY, JSON.stringify([task("Old title")]));
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));

    const updated = await finish(updateTask("Old title", { title: "New title" }));

    expect(updated.title).toBe("New title");
    expect(updated.updatedAt).toBe("2026-10-22T12:00:00.000Z");
    expect(saved()[0].title).toBe("New title");
  });

  it("updateTask fails for a task that doesn't exist", async () => {
    await expect(updateTask("missing", { title: "x" })).rejects.toThrow(/not found/);
  });

  it("deleteTask returns the remaining tasks", async () => {
    localStorage.setItem(KEY, JSON.stringify([task("Keep"), task("Delete me")]));
    const remaining = await finish(deleteTask("Delete me"));
    expect(remaining.map((t) => t.title)).toEqual(["Keep"]);
  });

  // Known bug: the list on screen is updated, but storage is not
  it.fails("[BUG-01] deleteTask saves the deletion to localStorage", async () => {
    localStorage.setItem(KEY, JSON.stringify([task("Keep"), task("Delete me")]));
    await finish(deleteTask("Delete me"));
    expect(saved().map((t) => t.title)).toEqual(["Keep"]);
  });
});