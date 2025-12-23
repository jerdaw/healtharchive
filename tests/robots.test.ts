import { describe, expect, it } from "vitest";

import { generateMetadata } from "@/app/[locale]/layout";

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
