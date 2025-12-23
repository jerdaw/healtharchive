"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n";
import { pickLocalized, type Localized } from "@/lib/localized";

type IssueCategory = {
  value: string;
  label: Localized<string>;
  helper: Localized<string>;
};

const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    value: "broken_snapshot",
    label: { en: "Broken snapshot or replay", fr: "Capture ou relecture défectueuse" },
    helper: {
      en: "The snapshot viewer is blank, errors, or does not load correctly.",
      fr: "Le visualiseur de captures est vide, affiche une erreur ou ne se charge pas correctement.",
    },
  },
  {
    value: "incorrect_metadata",
    label: { en: "Incorrect metadata", fr: "Métadonnées incorrectes" },
    helper: {
      en: "The capture date, source label, or original URL looks wrong.",
      fr: "La date de capture, l’étiquette de source ou l’URL d’origine semble incorrecte.",
    },
  },
  {
    value: "missing_snapshot",
    label: {
      en: "Missing snapshot / request a capture",
      fr: "Capture manquante / demander une capture",
    },
    helper: {
      en: "A page you expected is not in the archive yet.",
      fr: "Une page attendue n’est pas encore dans l’archive.",
    },
  },
  {
    value: "takedown",
    label: {
      en: "Takedown or content concern",
      fr: "Demande de retrait ou préoccupation de contenu",
    },
    helper: {
      en: "Request review or restriction for a specific snapshot.",
      fr: "Demander une révision ou une restriction pour une capture précise.",
    },
  },
  {
    value: "general_feedback",
    label: { en: "General feedback", fr: "Commentaires généraux" },
    helper: {
      en: "Share ideas or general feedback about the project.",
      fr: "Partager des idées ou des commentaires généraux sur le projet.",
    },
  },
];

type IssueReportPayload = {
  category: string;
  description: string;
  snapshotId?: number | null;
  originalUrl?: string | null;
  reporterEmail?: string | null;
  pageUrl?: string | null;
  website?: string | null;
};

type ReportIssueFormProps = {
  initialSnapshotId?: number | null;
  initialOriginalUrl?: string | null;
  initialPageUrl?: string | null;
};

function buildMailto(locale: Locale, payload: IssueReportPayload, categoryLabel: string): string {
  const labels =
    locale === "fr"
      ? {
          category: "Catégorie",
          snapshotId: "ID de capture",
          originalUrl: "URL d’origine",
          pageUrl: "URL de la page",
          notProvided: "(non fourni)",
          description: "Description",
        }
      : {
          category: "Category",
          snapshotId: "Snapshot ID",
          originalUrl: "Original URL",
          pageUrl: "Page URL",
          notProvided: "(not provided)",
          description: "Description",
        };

  const lines = [
    `${labels.category}: ${categoryLabel}`,
    payload.snapshotId
      ? `${labels.snapshotId}: ${payload.snapshotId}`
      : `${labels.snapshotId}: ${labels.notProvided}`,
    payload.originalUrl
      ? `${labels.originalUrl}: ${payload.originalUrl}`
      : `${labels.originalUrl}: ${labels.notProvided}`,
    payload.pageUrl
      ? `${labels.pageUrl}: ${payload.pageUrl}`
      : `${labels.pageUrl}: ${labels.notProvided}`,
    "",
    `${labels.description}:`,
    payload.description,
  ];

  const subject =
    locale === "fr"
      ? `Signalement HealthArchive : ${categoryLabel}`
      : `HealthArchive issue report: ${categoryLabel}`;
  const body = lines.join("\n");
  return `mailto:contact@healtharchive.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ReportIssueForm({
  initialSnapshotId,
  initialOriginalUrl,
  initialPageUrl,
}: ReportIssueFormProps) {
  const locale = useLocale();
  const inputClassName =
    "w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]";
  const textareaClassName =
    "w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]";

  const [category, setCategory] = useState<string>(
    ISSUE_CATEGORIES[0]?.value ?? "general_feedback",
  );
  const [description, setDescription] = useState<string>("");
  const [snapshotId, setSnapshotId] = useState<string>(
    initialSnapshotId ? String(initialSnapshotId) : "",
  );
  const [originalUrl, setOriginalUrl] = useState<string>(initialOriginalUrl ?? "");
  const [reporterEmail, setReporterEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorKey, setErrorKey] = useState<"too_short" | "submit_failed" | null>(null);
  const [fallbackMailto, setFallbackMailto] = useState<string | null>(null);

  const categoryLabel = useMemo(() => {
    const fallbackLabel = { en: "Issue", fr: "Signalement" } as const;
    const match = ISSUE_CATEGORIES.find((item) => item.value === category);
    return match ? pickLocalized(locale, match.label) : pickLocalized(locale, fallbackLabel);
  }, [category, locale]);

  const selectedCategoryHelper = useMemo(() => {
    const match = ISSUE_CATEGORIES.find((item) => item.value === category);
    return match ? pickLocalized(locale, match.helper) : null;
  }, [category, locale]);

  const errorMessage = useMemo(() => {
    if (!errorKey) return null;
    if (errorKey === "too_short") {
      return locale === "fr"
        ? "Veuillez fournir au moins 20 caractères pour décrire le problème."
        : "Please provide at least 20 characters describing the issue.";
    }

    return locale === "fr"
      ? "Le signalement n’a pas pu être envoyé automatiquement."
      : "The report could not be submitted automatically.";
  }, [errorKey, locale]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setFallbackMailto(null);

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 20) {
      setErrorKey("too_short");
      return;
    }

    const snapshotIdValue = snapshotId && /^\d+$/.test(snapshotId) ? Number(snapshotId) : null;

    const payload: IssueReportPayload = {
      category,
      description: trimmedDescription,
      snapshotId: snapshotIdValue,
      originalUrl: originalUrl.trim() || null,
      reporterEmail: reporterEmail.trim() || null,
      pageUrl: initialPageUrl ?? null,
      website: website.trim() || null,
    };

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = (await res.json()) as { reportId?: number | null };
      setSubmittedId(data.reportId ?? null);
      setIsSubmitted(true);
    } catch {
      setErrorKey("submit_failed");
      setFallbackMailto(buildMailto(locale, payload, categoryLabel));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="ha-callout">
        <h3 className="ha-callout-title">
          {locale === "fr" ? "Signalement reçu" : "Report received"}
        </h3>
        <p className="mt-2 text-xs leading-relaxed sm:text-sm">
          {locale === "fr"
            ? "Merci pour votre signalement. Nous l’examinerons et ferons un suivi si vous avez fourni une adresse courriel."
            : "Thank you for the report. We will review it and follow up if you provided an email address."}
        </p>
        {submittedId != null && (
          <p className="mt-3 text-xs leading-relaxed sm:text-sm">
            {locale === "fr" ? "Identifiant de référence" : "Reference ID"}:{" "}
            <span className="font-semibold">#{submittedId}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="ha-card space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900" htmlFor="category">
            {locale === "fr" ? "Catégorie du problème" : "Issue category"}
          </label>
          <select
            id="category"
            className="ha-select w-full"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {ISSUE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {pickLocalized(locale, item.label)}
              </option>
            ))}
          </select>
          {selectedCategoryHelper && (
            <p className="text-ha-muted text-xs">{selectedCategoryHelper}</p>
          )}
        </div>

        <div className="ha-grid-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="snapshotId">
              {locale === "fr" ? "ID de capture (facultatif)" : "Snapshot ID (optional)"}
            </label>
            <input
              id="snapshotId"
              name="snapshotId"
              inputMode="numeric"
              className={inputClassName}
              value={snapshotId}
              onChange={(event) => setSnapshotId(event.target.value)}
              placeholder="12345"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="reporterEmail">
              {locale === "fr" ? "Courriel (facultatif)" : "Email (optional)"}
            </label>
            <input
              id="reporterEmail"
              name="reporterEmail"
              type="email"
              className={inputClassName}
              value={reporterEmail}
              onChange={(event) => setReporterEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900" htmlFor="originalUrl">
            {locale === "fr" ? "URL d’origine (facultatif)" : "Original URL (optional)"}
          </label>
          <input
            id="originalUrl"
            name="originalUrl"
            type="url"
            className={inputClassName}
            value={originalUrl}
            onChange={(event) => setOriginalUrl(event.target.value)}
            placeholder="https://www.canada.ca/..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900" htmlFor="description">
            {locale === "fr" ? "Quel est le problème ?" : "What is the issue?"}
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              locale === "fr"
                ? "Incluez suffisamment de détails pour que nous puissions reproduire le problème."
                : "Include enough detail for us to reproduce the problem."
            }
          />
          <p className="text-ha-muted text-xs">
            {locale === "fr"
              ? "Veuillez ne pas inclure d’informations personnelles ou médicales. Minimum : 20 caractères."
              : "Please do not include personal or personal health information. Minimum 20 characters."}
          </p>
        </div>

        <div className="hidden">
          <label htmlFor="website">{locale === "fr" ? "Site web" : "Website"}</label>
          <input
            id="website"
            name="website"
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="ha-callout">
          <h3 className="ha-callout-title">
            {locale === "fr" ? "Problème d’envoi" : "Submission issue"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">{errorMessage}</p>
          {fallbackMailto && (
            <p className="mt-3 text-xs leading-relaxed sm:text-sm">
              {locale === "fr"
                ? "Vous pouvez plutôt envoyer un courriel : "
                : "You can email the report instead: "}{" "}
              <a href={fallbackMailto} className="text-ha-accent font-medium hover:text-blue-700">
                {locale === "fr" ? "ouvrir un courriel prérempli" : "open a pre-filled email"}
              </a>
              .
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="ha-btn-primary" disabled={isSubmitting}>
          {isSubmitting
            ? locale === "fr"
              ? "Envoi..."
              : "Submitting..."
            : locale === "fr"
              ? "Envoyer le signalement"
              : "Submit report"}
        </button>
        <p className="text-ha-muted text-xs">
          {locale === "fr"
            ? "Nous visons à accuser réception des signalements dans un délai de 7 jours."
            : "We aim to acknowledge reports within 7 days."}
        </p>
      </div>
    </form>
  );
}
