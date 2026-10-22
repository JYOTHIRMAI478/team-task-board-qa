import { describe, expect, it } from "vitest";
import { validateTaskInput } from "./taskValidation";
import type { TaskInput, TaskPriority } from "../types/task";

// Builds a YYYY-MM-DD date in local time, like the date picker does
function localDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const valid: TaskInput = { title: "Write report", priority: "medium", dueDate: null };

describe("validateTaskInput (TTB-1, TTB-2)", () => {
  it("accepts a valid task with no due date", () => {
    expect(validateTaskInput(valid)).toEqual({ valid: true });
  });

  it("rejects an empty title", () => {
    expect(validateTaskInput({ ...valid, title: "" })).toEqual({
      valid: false,
      error: "Title is required.",
    });
  });

  it("rejects a priority that isn't low, medium or high", () => {
    const result = validateTaskInput({ ...valid, priority: "urgent" as TaskPriority });
    expect(result.valid).toBe(false);
  });

  it("rejects a date that isn't a real date", () => {
    expect(validateTaskInput({ ...valid, dueDate: "not-a-date" }).valid).toBe(false);
  });

  it("accepts today's date (boundary)", () => {
    expect(validateTaskInput({ ...valid, dueDate: localDate(0) }).valid).toBe(true);
  });

  it("accepts a future date", () => {
    expect(validateTaskInput({ ...valid, dueDate: localDate(30) }).valid).toBe(true);
  });

  // Known bugs
  it.fails("[BUG-05] rejects a title with only spaces", () => {
    expect(validateTaskInput({ ...valid, title: "   " }).valid).toBe(false);
  });

  it.fails("[BUG-06] rejects a past due date (yesterday)", () => {
    expect(validateTaskInput({ ...valid, dueDate: localDate(-1) }).valid).toBe(false);
  });
});