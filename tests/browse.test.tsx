import { vi } from "vitest";
import BrowseSnapshotPage from "@/app/[locale]/browse/[id]/page";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("/browse/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects English browse URLs to the canonical snapshot route", async () => {
    await expect(async () => {
      await BrowseSnapshotPage({ params: Promise.resolve({ id: "45" }) });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/snapshot/45");
  });

  it("redirects French browse URLs to the canonical snapshot route", async () => {
    await expect(async () => {
      await BrowseSnapshotPage({ params: Promise.resolve({ id: "45", locale: "fr" }) });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/fr/snapshot/45");
  });
});
