"use client";

import type { LinkProps } from "next/link";
import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import { localizeHref } from "@/lib/i18n";

import { useLocale } from "./LocaleProvider";

type LocalizedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  LinkProps & {
    children: ReactNode;
  };

export const LocalizedLink = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
  function LocalizedLink({ href, ...rest }, ref) {
    const locale = useLocale();

    if (typeof href === "string") {
      return <Link ref={ref} href={localizeHref(locale, href)} {...rest} />;
    }

    if (typeof href.pathname === "string") {
      return (
        <Link
          ref={ref}
          href={{ ...href, pathname: localizeHref(locale, href.pathname) }}
          {...rest}
        />
      );
    }

    return <Link ref={ref} href={href} {...rest} />;
  },
);
