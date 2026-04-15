"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

const navItems = [
  { href: "/", label: { en: "Home", fr: "Accueil" } },
  { href: "/archive", label: { en: "Archive", fr: "Parcourir" } },
  { href: "/changes", label: { en: "Changes", fr: "Changements" } },
  { href: "/methods", label: { en: "Methods", fr: "Méthodes" } },
  { href: "/researchers", label: { en: "Researchers", fr: "Recherche" } },
  { href: "/about", label: { en: "About", fr: "À propos" } },
  { href: "/contact", label: { en: "Contact", fr: "Contact" } },
];

function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|fr)(?=\/|$)/, "");
  return stripped || "/";
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function Header() {
  const locale = useLocale();
  const pathname = usePathname();
  const normalizedPathname = stripLocalePrefix(pathname);
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync theme with localStorage/system preference on mount
    const root = document.documentElement;
    const storageKey = "ha-theme";
    const stored = window.localStorage.getItem(storageKey);
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const isActive = stored === "dark" || (!stored && prefersDark);

    if (isActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme("dark");
      // Ensure DOM is in sync (in case hydration stripped the attribute)
      if (root.getAttribute("data-theme") !== "dark") {
        root.setAttribute("data-theme", "dark");
      }
    } else {
      setTheme("light");
      if (root.hasAttribute("data-theme")) {
        root.removeAttribute("data-theme");
      }
    }
  }, []);
  const [shrink, setShrink] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(
    null,
  );
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const headerBarRef = useRef<HTMLDivElement | null>(null);

  const { englishHref, frenchHref } = (() => {
    const canonicalPath = stripLocalePrefix(pathname);
    const englishPath = canonicalPath;
    const frenchPath = canonicalPath === "/" ? "/fr" : `/fr${canonicalPath}`;
    return {
      englishHref: queryString ? `${englishPath}?${queryString}` : englishPath,
      frenchHref: queryString ? `${frenchPath}?${queryString}` : frenchPath,
    };
  })();
  const languageSwitchHref = locale === "fr" ? englishHref : frenchHref;
  const languageSwitchLabel = locale === "fr" ? "EN" : "FR";
  const languageSwitchAriaLabel = locale === "fr" ? "Passer à l'anglais" : "Switch to French";
  const primaryNavAriaLabel = locale === "fr" ? "Navigation principale" : "Primary";
  const themeToggleAriaLabel =
    locale === "fr"
      ? theme === "dark"
        ? "Passer au thème clair"
        : "Passer au thème sombre"
      : theme === "dark"
        ? "Switch to light theme"
        : "Switch to dark theme";
  const mobileNavAriaLabel = mobileOpen
    ? locale === "fr"
      ? "Fermer la navigation principale"
      : "Close main navigation"
    : locale === "fr"
      ? "Ouvrir la navigation principale"
      : "Open main navigation";

  const mobileMenuIconSizePx = `${Math.max(11.25, Math.min(20, 20 - 8.75 * shrink))}px`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      const y = window.scrollY;
      const next = Math.min(1, Math.max(0, y / 120));
      setShrink(next);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    if (navRect.width === 0) return;
    const activeItem = navItems.find((item) => isActivePath(normalizedPathname, item.href));
    if (!activeItem) return;
    const link = linkRefs.current[activeItem.href];
    if (!link) return;
    const linkRect = link.getBoundingClientRect();
    setIndicatorStyle({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    });
    setIndicatorVisible(true);
  }, [normalizedPathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const nav = navRef.current;
      if (!nav) return;
      const navRect = nav.getBoundingClientRect();
      if (navRect.width === 0) return;
      const activeItem = navItems.find((item) => isActivePath(normalizedPathname, item.href));
      if (!activeItem) return;
      const link = linkRefs.current[activeItem.href];
      if (!link) return;
      const linkRect = link.getBoundingClientRect();
      setIndicatorStyle({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
      });
      setIndicatorVisible(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [normalizedPathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        (mobilePanelRef.current && mobilePanelRef.current.contains(target)) ||
        (mobileToggleRef.current && mobileToggleRef.current.contains(target))
      ) {
        return;
      }
      setMobileOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const headerBar = headerBarRef.current;
    if (!headerBar) return;

    const syncHeaderHeight = () => {
      const { height } = headerBar.getBoundingClientRect();
      if (height > 0) {
        root.style.setProperty("--ha-shell-header-height", `${Math.ceil(height)}px`);
      }
    };

    syncHeaderHeight();

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncHeaderHeight);
    observer?.observe(headerBar);
    window.addEventListener("resize", syncHeaderHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, [locale, theme]);

  function moveIndicatorToHref(href: string) {
    if (typeof window === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    if (navRect.width === 0) return;
    const link = linkRefs.current[href];
    if (!link) return;
    const linkRect = link.getBoundingClientRect();
    setIndicatorStyle({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    });
    setIndicatorVisible(true);
  }

  function toggleTheme() {
    const root = document.documentElement;
    const current = root.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";

    if (next === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    setTheme(next);

    try {
      window.localStorage.setItem("ha-theme", next);
    } catch {
      // ignore
    }
  }

  return (
    <header className="ha-shell-header fixed inset-x-0 top-0 z-40">
      <div
        ref={headerBarRef}
        className="ha-shell-header-inner ha-container flex items-center justify-between gap-4"
        style={{ ["--ha-header-shrink" as string]: shrink }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link href="/" className="group ha-header-link flex min-w-0 items-center gap-4">
            <Image
              src="/healtharchive-logo.webp"
              alt={locale === "fr" ? "Logo de HealthArchive.ca" : "HealthArchive.ca logo"}
              width={72}
              height={60}
              className="ha-header-logo w-auto translate-y-[1px] transform transition-transform duration-150 ease-out group-hover:scale-105"
              priority
            />
            <div className="ha-header-text flex min-w-0 flex-col leading-tight">
              <span
                className="ha-header-title font-libre-baskerville text-2xl font-bold md:text-3xl"
                style={{
                  fontFamily: "var(--font-libre-baskerville), serif",
                  textShadow: "0.3px 0 0 currentColor",
                  transform: "translateY(calc(var(--ha-header-shrink, 0) * 2px))",
                }}
              >
                HealthArchive.ca
              </span>
              <span className="ha-header-subtitle text-[11px] font-medium md:text-xs">
                {locale === "fr"
                  ? "Archive indépendante du contenu Web de santé publique au Canada"
                  : "Independent archive of Canadian public health web content"}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Desktop nav */}
          <nav
            ref={navRef}
            className="text-ha-muted relative hidden items-center gap-2 text-xs font-semibold md:flex lg:gap-3 lg:text-sm"
            aria-label={primaryNavAriaLabel}
            onMouseLeave={() => {
              const activeItem = navItems.find((item) =>
                isActivePath(normalizedPathname, item.href),
              );
              if (activeItem) {
                moveIndicatorToHref(activeItem.href);
              }
            }}
          >
            {indicatorStyle && (
              <span
                className={`ha-nav-active-indicator ${
                  indicatorVisible ? "ha-nav-active-indicator--visible" : ""
                }`}
                style={{
                  width: `${indicatorStyle.width}px`,
                  left: `${indicatorStyle.left}px`,
                }}
              />
            )}
            {navItems.map((item) => {
              const active = isActivePath(normalizedPathname, item.href);
              const isBrowse = item.href === "/archive";
              const baseClasses = ["ha-nav-link"];
              if (active) {
                baseClasses.push("ha-nav-link--active");
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={baseClasses.join(" ")}
                  ref={(element) => {
                    if (element) {
                      linkRefs.current[item.href] = element;
                    }
                  }}
                  onMouseEnter={() => moveIndicatorToHref(item.href)}
                  onFocus={() => moveIndicatorToHref(item.href)}
                >
                  {isBrowse && (
                    <span className="ha-nav-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 20 20"
                        className="h-[1.05rem] w-[1.05rem]"
                        aria-hidden="true"
                      >
                        <path
                          d="M8.5 3.5a5 5 0 0 1 3.9 8.1l2.7 2.7a.75.75 0 1 1-1.06 1.06l-2.7-2.7A5 5 0 1 1 8.5 3.5zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                  )}
                  {locale === "fr" ? item.label.fr : item.label.en}
                </Link>
              );
            })}
          </nav>

          <div className="ha-utility-switch hidden md:inline-flex">
            <NextLink
              href={languageSwitchHref}
              aria-label={languageSwitchAriaLabel}
              className="ha-utility-switch-item ha-utility-switch-item--locale"
            >
              <span aria-hidden="true">{languageSwitchLabel}</span>
              <span className="sr-only">{languageSwitchAriaLabel}</span>
            </NextLink>
            <button
              type="button"
              onClick={toggleTheme}
              className="ha-utility-switch-item ha-utility-switch-item--icon"
              aria-label={themeToggleAriaLabel}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M12 2.5v2.5M12 19v2.5M4.22 4.22l1.77 1.77M17.99 17.99l1.77 1.77M2.5 12h2.5M19 12h2.5M4.22 19.78l1.77-1.77M17.99 6.01l1.77-1.77"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 12.79A9 9 0 0 1 12.21 3 7 7 0 0 0 12 17a7 7 0 0 0 9-4.21z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="sr-only">{themeToggleAriaLabel}</span>
            </button>
          </div>

          <div className="ha-utility-switch ha-utility-switch--mobile inline-flex md:hidden">
            <NextLink
              href={languageSwitchHref}
              aria-label={languageSwitchAriaLabel}
              className="ha-utility-switch-item ha-utility-switch-item--locale"
            >
              <span aria-hidden="true">{languageSwitchLabel}</span>
              <span className="sr-only">{languageSwitchAriaLabel}</span>
            </NextLink>
            <button
              type="button"
              onClick={toggleTheme}
              className="ha-utility-switch-item ha-utility-switch-item--icon"
              aria-label={themeToggleAriaLabel}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M12 2.5v2.5M12 19v2.5M4.22 4.22l1.77 1.77M17.99 17.99l1.77 1.77M2.5 12h2.5M19 12h2.5M4.22 19.78l1.77-1.77M17.99 6.01l1.77-1.77"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 12.79A9 9 0 0 1 12.21 3 7 7 0 0 0 12 17a7 7 0 0 0 9-4.21z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="sr-only">{themeToggleAriaLabel}</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="ha-mobile-menu-toggle border-ha-border inline-flex items-center justify-center rounded-full border bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none md:hidden"
            aria-label={mobileNavAriaLabel}
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            ref={mobileToggleRef}
          >
            <span className="sr-only">
              {locale === "fr" ? "Basculer la navigation" : "Toggle navigation"}
            </span>
            <svg
              className="ha-mobile-menu-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              role="img"
              style={{ width: mobileMenuIconSizePx, height: mobileMenuIconSizePx }}
            >
              {mobileOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <div ref={mobilePanelRef} className="border-t border-slate-200 bg-white md:hidden">
          <nav
            id="primary-navigation"
            className="ha-container text-ha-muted flex flex-col gap-3 py-3 text-sm font-semibold"
            aria-label={primaryNavAriaLabel}
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isActivePath(normalizedPathname, item.href);
                const isBrowse = item.href === "/archive";
                const baseClasses = ["ha-nav-link"];
                if (active) {
                  baseClasses.push("ha-nav-link--active");
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={baseClasses.join(" ")}
                    onClick={() => setMobileOpen(false)}
                  >
                    {isBrowse && (
                      <span className="ha-nav-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 20 20"
                          className="h-[1.05rem] w-[1.05rem]"
                          aria-hidden="true"
                        >
                          <path
                            d="M8.5 3.5a5 5 0 0 1 3.9 8.1l2.7 2.7a.75.75 0 1 1-1.06 1.06l-2.7-2.7A5 5 0 1 1 8.5 3.5zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    )}
                    {locale === "fr" ? item.label.fr : item.label.en}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
