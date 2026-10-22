import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { Task } from "./types/task";

const KEY = "team-task-board:tasks";

// Put tasks into storage before the app loads, like the DevTools trick
function seed(tasks: Partial<Task>[]) {
  const full = tasks.map((t, i) => ({
    id: String(i), title: `Task ${i}`, priority: "medium",
    completed: false, dueDate: null, archived: false,
    createdAt: "", updatedAt: "", ...t,
  }));
  localStorage.setItem(KEY, JSON.stringify(full));
}

// Read what's saved in storage
const saved = (): Task[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");

// Open the app and wait until it has finished loading
async function openApp() {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Add task" })).toBeEnabled()
  );
  return user;
}

// Find the row for a task title
const row = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

// Titles currently shown, in order
const shownTitles = () =>
  screen.queryAllByRole("listitem").map((li) => li.querySelector(".title")?.textContent);

describe("Create a task (TTB-1)", () => {
  it("adds the task, clears the form, shows a green banner and saves it", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Task title"), "Team Meeting");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(await screen.findByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByLabelText("Task title")).toHaveValue("");
    expect(screen.getByLabelText("Priority")).toHaveValue("medium");
    expect(screen.getByText("Task added.")).toHaveClass("success");
    expect(saved()[0].title).toBe("Team Meeting");
  });

  it("shows 'Title is required.' for an empty title", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(saved()).toEqual([]);
  });

  it.fails("[BUG-05] rejects a title with only spaces", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Task title"), "   ");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
  });
});

describe("Edit a task (TTB-2)", () => {
  it("opens pre-filled, and Save updates and saves the title", async () => {
    seed([{ title: "Meeting with Client", priority: "high" }]);
    const user = await openApp();
    await screen.findByText("Meeting with Client");

    await user.click(within(row("Meeting with Client")).getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Edit title")).toHaveValue("Meeting with Client");
    expect(screen.getByLabelText("Edit priority")).toHaveValue("high");

    await user.clear(screen.getByLabelText("Edit title"));
    await user.type(screen.getByLabelText("Edit title"), "Meeting with Client(Bella)");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Meeting with Client(Bella)")).toBeInTheDocument();
    expect(saved()[0].title).toBe("Meeting with Client(Bella)");
  });

  it("Cancel throws away the change", async () => {
    seed([{ title: "Keep me" }]);
    const user = await openApp();
    await screen.findByText("Keep me");

    await user.click(within(row("Keep me")).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Edit title"));
    await user.type(screen.getByLabelText("Edit title"), "Cancel test");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Keep me")).toBeInTheDocument();
    expect(saved()[0].title).toBe("Keep me");
  });
});

describe("Delete a task (TTB-3)", () => {
  it("removes the task and shows the empty message", async () => {
    seed([{ title: "Only task" }]);
    const user = await openApp();
    await screen.findByText("Only task");

    await user.click(within(row("Only task")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("No tasks to show.")).toBeInTheDocument();
  });
});

describe("Complete a task (TTB-4, TTB-5)", () => {
  it("ticking a task shows it as completed on screen", async () => {
    seed([{ title: "Women's Meet" }]);
    const user = await openApp();
    await screen.findByText("Women's Meet");

    await user.click(screen.getByRole("checkbox"));
    expect(row("Women's Meet")).toHaveClass("completed");
  });

  it.fails("[BUG-02] ticking a task saves it as completed", async () => {
    seed([{ title: "Women's Meet" }]);
    const user = await openApp();
    await screen.findByText("Women's Meet");

    await user.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(saved()[0].completed).toBe(true));
  });

  it.fails("[BUG-02] a ticked task disappears from the Active filter", async () => {
    seed([{ title: "Women's Meet" }]);
    const user = await openApp();
    await screen.findByText("Women's Meet");

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("tab", { name: "Active" }));
    await waitFor(() => expect(screen.queryByText("Women's Meet")).not.toBeInTheDocument());
  });
});

describe("Sort by priority (TTB-7)", () => {
  it.fails("[BUG-04] the list shows High > Medium > Low", async () => {
    seed([
      { title: "TASK A", priority: "low" },
      { title: "TASK B", priority: "medium" },
      { title: "TASK C", priority: "high" },
    ]);
    await openApp();
    await screen.findByText("TASK A");
    expect(shownTitles()).toEqual(["TASK C", "TASK B", "TASK A"]);
  });
});