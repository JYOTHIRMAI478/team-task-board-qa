import { describe, expect, it } from "vitest";
import { sortTasksByPriority } from "./taskSorting";
import type { Task, TaskPriority } from "../types/task";

function task(title: string, priority: TaskPriority): Task {
  return {
    id: title, title, priority,
    completed: false, dueDate: null, archived: false,
    createdAt: "", updatedAt: "",
  };
}
const titles = (tasks: Task[]) => tasks.map((t) => t.title);

describe("sortTasksByPriority (TTB-7)", () => {
  it("keeps tasks with the same priority in the order they were added", () => {
    const tasks = [task("A", "high"), task("B", "high"), task("C", "high")];
    expect(titles(sortTasksByPriority(tasks))).toEqual(["A", "B", "C"]);
  });

  it("does not change the original list (saved order stays the same)", () => {
    const tasks = [task("A", "low"), task("B", "high")];
    sortTasksByPriority(tasks);
    expect(titles(tasks)).toEqual(["A", "B"]);
  });

  // Known bug: priorities are sorted alphabetically (high, low, medium)
  it.fails("[BUG-04] ticket example 1: Low A, Medium B, High C -> C, B, A", () => {
    const tasks = [task("A", "low"), task("B", "medium"), task("C", "high")];
    expect(titles(sortTasksByPriority(tasks))).toEqual(["C", "B", "A"]);
  });

  it.fails("[BUG-04] ticket example 2: already-ordered list stays the same", () => {
    const tasks = [task("A", "high"), task("B", "high"), task("C", "medium"), task("D", "low")];
    expect(titles(sortTasksByPriority(tasks))).toEqual(["A", "B", "C", "D"]);
  });

  it.fails("[BUG-04] ticket example 3: mixed list sorts High > Medium > Low", () => {
    const tasks = [
      task("A", "low"), task("B", "high"), task("C", "low"),
      task("D", "medium"), task("E", "high"),
    ];
    expect(titles(sortTasksByPriority(tasks))).toEqual(["B", "E", "D", "A", "C"]);
  });
});