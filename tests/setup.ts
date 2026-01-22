import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Libre_Baskerville: vi.fn(() => ({
    className: "mock-libre-baskerville",
    variable: "--font-libre-baskerville",
    style: { fontFamily: "Libre Baskerville" },
  })),
}));
