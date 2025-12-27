import { describe, expect, it } from "vitest";

import { generateMetadata as homeMetadata } from "@/app/[locale]/page";
import { generateMetadata as archiveMetadata } from "@/app/[locale]/archive/page";
import { generateMetadata as browseMetadata } from "@/app/[locale]/browse/[id]/page";
import { generateMetadata as snapshotMetadata } from "@/app/[locale]/snapshot/[id]/page";

describe("locale metadata alternates", () => {
  it("sets canonical + hreflang for the home page", async () => {
    const meta = await homeMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.alternates?.canonical).toBe("/");
    expect(meta.alternates?.languages?.["en-CA"]).toBe("/");
    expect(meta.alternates?.languages?.["fr-CA"]).toBe("/fr");
  });

  it("sets canonical + hreflang for archive routes", async () => {
    const meta = await archiveMetadata({ params: Promise.resolve({ locale: "fr" }) });
    expect(meta.alternates?.canonical).toBe("/fr/archive");
    expect(meta.alternates?.languages?.["en-CA"]).toBe("/archive");
    expect(meta.alternates?.languages?.["fr-CA"]).toBe("/fr/archive");
  });

  it("sets canonical + hreflang for snapshot detail routes", async () => {
    const meta = await snapshotMetadata({ params: Promise.resolve({ locale: "en", id: "123" }) });
    expect(meta.alternates?.canonical).toBe("/snapshot/123");
    expect(meta.alternates?.languages?.["en-CA"]).toBe("/snapshot/123");
    expect(meta.alternates?.languages?.["fr-CA"]).toBe("/fr/snapshot/123");
  });

  it("sets canonical + hreflang for browse routes", async () => {
    const meta = await browseMetadata({ params: Promise.resolve({ locale: "fr", id: "456" }) });
    expect(meta.alternates?.canonical).toBe("/fr/snapshot/456");
    expect(meta.alternates?.languages?.["en-CA"]).toBe("/snapshot/456");
    expect(meta.alternates?.languages?.["fr-CA"]).toBe("/fr/snapshot/456");
  });
});
