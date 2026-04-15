import { render } from "@testing-library/react";
import { describe, it, beforeEach, vi } from "vitest";
import { expectNoA11yViolations } from "../a11y-helper";
import AboutPage from "@/app/[locale]/about/page";
import MethodsPage from "@/app/[locale]/methods/page";
import ContactPage from "@/app/[locale]/contact/page";
import ResearchersPage from "@/app/[locale]/researchers/page";

describe("Static pages accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("About page", () => {
    it("should have no accessibility violations (English)", async () => {
      const ui = await AboutPage({ params: Promise.resolve({ locale: "en" }) });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });

    it("should have no accessibility violations (French)", async () => {
      const ui = await AboutPage({ params: Promise.resolve({ locale: "fr" }) });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });
  });

  describe("Methods page", () => {
    it("should have no accessibility violations (English)", async () => {
      const ui = await MethodsPage({ params: Promise.resolve({ locale: "en" }) });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });

    it("should have no accessibility violations (French)", async () => {
      const ui = await MethodsPage({ params: Promise.resolve({ locale: "fr" }) });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });
  });

  describe("Contact page", () => {
    it("should have no accessibility violations (English)", async () => {
      const ui = await ContactPage({ params: Promise.resolve({ locale: "en" }) });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });

    it("should have no accessibility violations (French)", async () => {
      const ui = await ContactPage({ params: Promise.resolve({ locale: "fr" }) });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });

    it("should have accessible contact information", async () => {
      const ui = await ContactPage({ params: Promise.resolve({ locale: "en" }) });
      const { container } = render(ui);

      // Email links should be accessible
      const emailLinks = container.querySelectorAll('a[href^="mailto:"]');
      emailLinks.forEach((link) => {
        expect(link.textContent).toBeTruthy();
      });

      await expectNoA11yViolations(container);
    });
  });

  describe("Researchers page", () => {
    it("should have no accessibility violations (English)", async () => {
      const ui = await ResearchersPage({
        params: Promise.resolve({ locale: "en" }),
      });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });

    it("should have no accessibility violations (French)", async () => {
      const ui = await ResearchersPage({
        params: Promise.resolve({ locale: "fr" }),
      });
      const { container } = render(ui);
      await expectNoA11yViolations(container);
    });
  });

  describe("Heading hierarchy", () => {
    it("should have proper heading hierarchy on about page", async () => {
      const ui = await AboutPage({ params: Promise.resolve({ locale: "en" }) });
      const { container } = render(ui);

      const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const levels = Array.from(headings).map((h) => parseInt(h.tagName[1]));

      // Should start with h1
      expect(levels[0]).toBe(1);

      // No level should jump more than 1
      for (let i = 1; i < levels.length; i++) {
        const jump = levels[i] - levels[i - 1];
        expect(jump).toBeLessThanOrEqual(1);
      }
    });
  });
});
