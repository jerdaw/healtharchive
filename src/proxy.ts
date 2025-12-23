import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { defaultLocale, isLocale } from "@/lib/i18n";

function stripLeadingLocale(pathname: string): string {
  return pathname.replace(/^\/(en|fr)(?=\/|$)/, "");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect default-locale URLs that include the `/en` prefix to the canonical
  // unprefixed form.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
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
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
