"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";

const navItems = [
  { href: "/", label: { en: "Home", fr: "Accueil" } },
  { href: "/archive", label: { en: "Browse", fr: "Parcourir" } },
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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    const root = document.documentElement;
    return root.dataset.theme === "dark" ? "dark" : "light";
  });
  const [shrink, setShrink] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(
    null,
  );
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);

  const languageSwitchHref = (() => {
    const canonicalPath = stripLocalePrefix(pathname);
    const targetPath =
      locale === "fr" ? canonicalPath : canonicalPath === "/" ? "/fr" : `/fr${canonicalPath}`;
    return queryString ? `${targetPath}?${queryString}` : targetPath;
  })();
  const languageSwitchLabel = locale === "fr" ? "English" : "Français";
  const languageSwitchAriaLabel = locale === "fr" ? "Switch to English" : "Passer au français";
  const primaryNavAriaLabel = locale === "fr" ? "Navigation principale" : "Primary";
  const themeToggleAriaLabel =
    locale === "fr" ? "Changer le thème de couleurs" : "Toggle color theme";
  const mobileNavAriaLabel = mobileOpen
    ? locale === "fr"
      ? "Fermer la navigation principale"
      : "Close main navigation"
    : locale === "fr"
      ? "Ouvrir la navigation principale"
      : "Open main navigation";

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
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      const root = document.documentElement;
      root.dataset.theme = next;
      window.localStorage.setItem("ha-theme", next);
    } catch {
      // ignore
    }
  }

  return (
    <header className="ha-shell-header fixed inset-x-0 top-0 z-40">
      <div
        className="ha-shell-header-inner ha-container flex items-center justify-between gap-4"
        style={{ ["--ha-header-shrink" as string]: shrink }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/" className="group ha-header-link flex items-center gap-4">
            <Image
              src="/healtharchive-logo.webp"
              alt={locale === "fr" ? "Logo de HealthArchive.ca" : "HealthArchive.ca logo"}
              width={72}
              height={60}
              className="ha-header-logo w-auto translate-y-[1px] transform transition-transform duration-150 ease-out group-hover:scale-105"
              priority
            />
            <div className="ha-header-text flex flex-col leading-tight">
              <span className="ha-header-title text-2xl font-semibold tracking-tight md:text-3xl">
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

        <div className="flex flex-shrink-0 items-center gap-2">
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

          {/* Theme toggle */}
          <NextLink
            href={languageSwitchHref}
            aria-label={languageSwitchAriaLabel}
            className="ha-btn-secondary hidden text-xs md:inline-flex"
          >
            {languageSwitchLabel}
          </NextLink>
          <button
            type="button"
            onClick={toggleTheme}
            className="ha-theme-toggle hidden focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none md:inline-flex"
            aria-label={themeToggleAriaLabel}
          >
            <span className="ha-theme-toggle-track">
              {/* Sun icon (left) */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="ha-theme-toggle-icon ha-theme-toggle-icon-sun"
              >
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path
                  d="M12 2.5v2.5M12 19v2.5M4.22 4.22l1.77 1.77M17.99 17.99l1.77 1.77M2.5 12h2.5M19 12h2.5M4.22 19.78l1.77-1.77M17.99 6.01l1.77-1.77"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              {/* Moon icon (right) */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="ha-theme-toggle-icon ha-theme-toggle-icon-moon"
              >
                <path
                  d="M21 12.79A9 9 0 0 1 12.21 3 7 7 0 0 0 12 17a7 7 0 0 0 9-4.21z"
                  fill="currentColor"
                />
              </svg>
              {/* Thumb */}
              <span className="ha-theme-toggle-thumb" />
            </span>
          </button>

          {/* Mobile menu button */}
          <button
            type="button"
            className="border-ha-border inline-flex items-center justify-center rounded-full border bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none md:hidden"
            aria-label={mobileNavAriaLabel}
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            ref={mobileToggleRef}
          >
            <span className="sr-only">
              {locale === "fr" ? "Basculer la navigation" : "Toggle navigation"}
            </span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" role="img">
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
            <div className="pt-2">
              <NextLink
                href={languageSwitchHref}
                aria-label={languageSwitchAriaLabel}
                className="ha-btn-secondary w-full justify-center text-xs"
                onClick={() => setMobileOpen(false)}
              >
                {languageSwitchLabel}
              </NextLink>
            </div>
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={toggleTheme}
                className="ha-theme-toggle inline-flex focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none lg:hidden"
                aria-label={themeToggleAriaLabel}
              >
                <span className="ha-theme-toggle-track">
                  {/* Sun icon (left) */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="ha-theme-toggle-icon ha-theme-toggle-icon-sun"
                  >
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path
                      d="M12 2.5v2.5M12 19v2.5M4.22 4.22l1.77 1.77M17.99 17.99l1.77 1.77M2.5 12h2.5M19 12h2.5M4.22 19.78l1.77-1.77M17.99 6.01l1.77-1.77"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Moon icon (right) */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="ha-theme-toggle-icon ha-theme-toggle-icon-moon"
                  >
                    <path
                      d="M21 12.79A9 9 0 0 1 12.21 3 7 7 0 0 0 12 17a7 7 0 0 0 9-4.21z"
                      fill="currentColor"
                    />
                  </svg>
                  {/* Thumb */}
                  <span className="ha-theme-toggle-thumb" />
                </span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
