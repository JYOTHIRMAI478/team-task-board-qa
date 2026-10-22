import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// TTB-9 failure path.
// Instead of editing SIMULATE_FAILURE in the code, we replace the API for these
// tests: loading works, but every save fails.
vi.mock("./api/fakeTaskApi", () => ({
  getTasks: vi.fn(async () => [
    {
      id: "1", title: "TEST", priority: "medium",
      completed: false, dueDate: null, archived: false,
      createdAt: "", updatedAt: "",
    },
  ]),
  createTask: vi.fn(async () => { throw new Error("Simulated save failure."); }),
  updateTask: vi.fn(async () => { throw new Error("Simulated save failure."); }),
  deleteTask: vi.fn(async () => { throw new Error("Simulated save failure."); }),
}));

// The app logs errors to the console; hide them to keep the output clean
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function openApp() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("TEST");
  return user;
}

const testRow = () => screen.getByText("TEST").closest("li") as HTMLElement;

describe("Failed saves (TTB-9)", () => {
  it("a failed delete shows a red banner and keeps the task", async () => {
    const user = await openApp();
    await user.click(within(testRow()).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Failed to delete task.")).toHaveClass("error");
    expect(screen.getByText("TEST")).toBeInTheDocument();
  });

  it("a failed edit shows a red banner and keeps the old title", async () => {
    const user = await openApp();
    await user.click(within(testRow()).getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Edit title"), " v2");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Failed to update task.")).toHaveClass("error");
    expect(screen.getByText("TEST")).toBeInTheDocument();
  });

  it.fails("[BUG-03] a failed create shows a red banner, not 'Task added.'", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Task title"), "Fail test");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() => expect(document.querySelector(".banner")).not.toBeNull());
    expect(document.querySelector(".banner")).toHaveClass("error");
  });

  it.fails("[BUG-09] a failed create keeps the typed title so the user can retry", async () => {
    const user = await openApp();
    await user.type(screen.getByLabelText("Task title"), "Fail test");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() => expect(document.querySelector(".banner")).not.toBeNull());
    expect(screen.getByLabelText("Task title")).toHaveValue("Fail test");
  });
});