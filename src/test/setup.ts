import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Start every test with empty storage, and remove the rendered app after each test
beforeEach(() => localStorage.clear());
afterEach(() => cleanup());