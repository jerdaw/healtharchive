import "@testing-library/jest-dom/vitest";
import { vi, expect } from "vitest";
import * as matchers from "vitest-axe/matchers";

// Extend expect with accessibility matchers
expect.extend(matchers);

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => null),
});

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Libre_Baskerville: vi.fn(() => ({
    className: "mock-libre-baskerville",
    variable: "--font-libre-baskerville",
    style: { fontFamily: "Libre Baskerville" },
  })),
}));
