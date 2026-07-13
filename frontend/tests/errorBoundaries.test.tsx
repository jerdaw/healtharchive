import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SegmentError from "@/app/[locale]/error";
import GlobalError, { GlobalErrorContent } from "@/app/global-error";
import { expectNoA11yViolations } from "./a11y-helper";

let localeParam = "en";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: localeParam }),
}));

function sentinelError(): Error & { digest?: string } {
  const error = new Error("SECRET_INTERNAL_FAILURE") as Error & { digest?: string };
  error.digest = "digest-private-123";
  return error;
}

describe("frontend error boundaries", () => {
  beforeEach(() => {
    localeParam = "en";
    vi.clearAllMocks();
  });

  it("renders English segment recovery actions without error detail", () => {
    const reset = vi.fn();

    render(<SegmentError error={sentinelError()} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "This page could not be displayed" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
    expect(document.body).not.toHaveTextContent("SECRET_INTERNAL_FAILURE");
    expect(document.body).not.toHaveTextContent("digest-private-123");
  });

  it("renders French segment recovery actions and localized home path", () => {
    localeParam = "fr";

    render(<SegmentError error={sentinelError()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Cette page n’a pas pu être affichée" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" })).toHaveAttribute("href", "/fr");
  });

  it("falls back to English for an unsupported segment locale", () => {
    localeParam = "de";

    render(<SegmentError error={sentinelError()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "This page could not be displayed" }),
    ).toBeInTheDocument();
  });

  it("renders a self-contained bilingual global document without error detail", () => {
    const markup = renderToStaticMarkup(<GlobalError error={sentinelError()} reset={vi.fn()} />);

    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain("<body");
    expect(markup).toContain("Something went wrong");
    expect(markup).toContain("Un problème est survenu");
    expect(markup).toContain('lang="fr-CA"');
    expect(markup).not.toContain("SECRET_INTERNAL_FAILURE");
    expect(markup).not.toContain("digest-private-123");
  });

  it("runs the global retry action", () => {
    const reset = vi.fn();

    render(<GlobalErrorContent reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again / Réessayer" }));

    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Return home / Accueil" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const segment = render(<SegmentError error={sentinelError()} reset={vi.fn()} />);
    await expectNoA11yViolations(segment.container);
    segment.unmount();

    const global = render(<GlobalErrorContent reset={vi.fn()} />);
    await expectNoA11yViolations(global.container);
  });
});
