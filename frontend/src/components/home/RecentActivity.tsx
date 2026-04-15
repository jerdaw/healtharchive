"use client";

import { LocalizedLink as Link } from "@/components/i18n/LocalizedLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getHomeCopy } from "@/lib/homeCopy";

export type ActivityItem = {
  id: number;
  title: string;
  sourceName: string;
  timestamp: string;
  type: "capture" | "change";
};

type Props = {
  items: ActivityItem[];
};

function relativeTime(timestamp: string, locale: "en" | "fr"): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return locale === "fr" ? "à l'instant" : "just now";
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return locale === "fr" ? "à l'instant" : "just now";
  }
  if (minutes < 60) {
    return locale === "fr"
      ? `il y a ${minutes} min`
      : `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (hours < 24) {
    return locale === "fr" ? `il y a ${hours} h` : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days === 1) {
    return locale === "fr" ? "hier" : "yesterday";
  }
  return locale === "fr" ? `il y a ${days} jours` : `${days} day${days === 1 ? "" : "s"} ago`;
}

export function RecentActivity({ items }: Props) {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section>
      <h2 className="ha-section-heading">{copy.recentActivity.heading}</h2>

      {items.length === 0 ? (
        <p className="text-ha-muted mt-4 text-sm">{copy.recentActivity.noActivity}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="ha-card ha-card-tight-shadow flex items-center gap-3 px-4 py-3"
            >
              <span
                className={`ha-activity-dot ${
                  item.type === "capture" ? "ha-activity-dot-capture" : "ha-activity-dot-change"
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-ha-muted text-xs">
                  {item.sourceName}
                  {" \u00b7 "}
                  {item.type === "capture"
                    ? copy.recentActivity.captured
                    : copy.recentActivity.changed}
                  {" \u00b7 "}
                  {relativeTime(item.timestamp, locale)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4">
        <Link href="/changes" className="ha-link text-xs">
          {copy.recentActivity.seeAll}
        </Link>
      </p>
    </section>
  );
}
