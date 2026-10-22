import { describe, expect, it } from "vitest";
import { filterTasks, searchTasks } from "./taskFiltering";
import type { Task } from "../types/task";

function task(title: string, extra: Partial<Task> = {}): Task {
  return {
    id: title, title, priority: "medium",
    completed: false, dueDate: null, archived: false,
    createdAt: "", updatedAt: "",
    ...extra,
  };
}
const titles = (tasks: Task[]) => tasks.map((t) => t.title);

// Same data I used in manual Test 18
const normal = task("Normal task");
const done = task("Done task", { completed: true });
const archivedActive = task("Archived active", { archived: true });
const archivedDone = task("Archived done", { archived: true, completed: true });
const all = [normal, done, archivedActive, archivedDone];

describe("filterTasks (TTB-5)", () => {
  it("All shows every task that isn't archived", () => {
    expect(titles(filterTasks(all, "all"))).toEqual(["Normal task", "Done task"]);
  });

  it("Active shows tasks that aren't archived or completed", () => {
    expect(titles(filterTasks(all, "active"))).toEqual(["Normal task"]);
  });

  it.fails("[BUG-07] Completed hides archived tasks", () => {
    expect(titles(filterTasks(all, "completed"))).toEqual(["Done task"]);
  });
});

describe("searchTasks (TTB-6)", () => {
  const tasks = [task("Client call"), task("Client meet"), task("Team Lunch")];

  it("an empty search shows everything", () => {
    expect(searchTasks(tasks, "")).toEqual(tasks);
  });

  it("matches text anywhere in the title", () => {
    expect(titles(searchTasks(tasks, "Lun"))).toEqual(["Team Lunch"]);
  });

  it("shows nothing when no title matches", () => {
    expect(searchTasks(tasks, "zzz")).toEqual([]);
  });

  it.fails("[BUG-08] lowercase 'client' finds 'Client' tasks", () => {
    expect(titles(searchTasks(tasks, "client"))).toEqual(["Client call", "Client meet"]);
  });

  it.fails("[BUG-08] uppercase 'TEAM' finds 'Team Lunch'", () => {
    expect(titles(searchTasks(tasks, "TEAM"))).toEqual(["Team Lunch"]);
  });
});