"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Browse" },
  { href: "/methods", label: "Methods" },
  { href: "/researchers", label: "Researchers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    const root = document.documentElement;
    return root.dataset.theme === "dark" ? "dark" : "light";
  });
  const [shrink, setShrink] = useState(0);

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
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-4 no-underline hover:no-underline"
          >
            <Image
              src="/healtharchive-logo.webp"
              alt="HealthArchive.ca logo"
              width={72}
              height={60}
              className="ha-header-logo w-auto transform translate-y-[1px] transition-transform duration-150 ease-out group-hover:scale-105"
              priority
            />
            <div className="ha-header-text flex flex-col leading-tight">
              <span className="ha-header-title text-2xl md:text-3xl font-semibold tracking-tight">
                HealthArchive.ca
              </span>
              <span className="ha-header-subtitle text-[11px] md:text-xs font-medium">
                Independent archive of Canadian public health information
              </span>
            </div>
          </Link>
          <span className="ml-2 hidden items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 lg:inline-flex">
            Early demo
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-3 text-xs lg:text-sm font-semibold text-ha-muted lg:flex"
            aria-label="Primary"
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-2.5 py-1 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-ha-muted hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="ha-theme-toggle hidden lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Toggle color theme"
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
            className="inline-flex items-center justify-center rounded-full border border-ha-border bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:hidden"
            aria-label={mobileOpen ? "Close main navigation" : "Open main navigation"}
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
              role="img"
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
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav
            id="primary-navigation"
            className="ha-container flex flex-col gap-3 py-3 text-sm font-semibold text-ha-muted"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-ha-muted hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-ha-muted">Appearance</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="ha-theme-toggle inline-flex lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11588f] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="Toggle color theme"
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
