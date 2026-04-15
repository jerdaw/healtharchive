import { describe, expect, it } from "vitest";

import { generateMetadata } from "@/app/[locale]/layout";
import robots from "@/app/robots";

describe("locale robots metadata", () => {
  it("marks French pages as noindex while alpha", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "fr" }) });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it("does not force noindex for English pages", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.robots).toBeUndefined();
  });
});

describe("robots route", () => {
  it("disallows crawl of compare-live endpoints", () => {
    const rules = robots().rules;
    expect(rules).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: ["/compare-live", "/fr/compare-live"],
    });
  });
});
