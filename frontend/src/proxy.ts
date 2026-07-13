import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { defaultLocale, isLocale } from "@/lib/i18n";

export const LOCALE_REWRITE_HEADER = "x-healtharchive-locale-rewrite";

function stripLeadingLocale(pathname: string): string {
  return pathname.replace(/^\/(en|fr)(?=\/|$)/, "");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect default-locale URLs that include the `/en` prefix to the canonical
  // unprefixed form.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    if (request.headers.get(LOCALE_REWRITE_HEADER) === "1") {
      const headers = new Headers(request.headers);
      headers.delete(LOCALE_REWRITE_HEADER);
      return NextResponse.next({ request: { headers } });
    }

    const url = request.nextUrl.clone();
    url.pathname = stripLeadingLocale(pathname) || "/";
    return NextResponse.redirect(url);
  }

  const firstSegment = pathname.split("/")[1] ?? "";
  if (isLocale(firstSegment)) {
    return NextResponse.next();
  }

  // Rewrite all non-localized paths to the default locale.
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_REWRITE_HEADER, "1");
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
