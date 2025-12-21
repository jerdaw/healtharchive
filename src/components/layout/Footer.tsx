import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ha-shell-footer">
      <div className="ha-container space-y-4 py-6 text-xs text-ha-muted sm:flex sm:flex-col">
        <div className="space-y-1">
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-800">
              Independence and affiliation
            </span>
            : HealthArchive.ca is an independent project and is not affiliated
            with, endorsed by, or associated with the Public Health Agency of
            Canada, Health Canada, or any other government agency.
          </p>
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-800">
              Interpretation and use
            </span>
            : Archived content is provided for reference and research purposes
            only and may be incomplete, outdated, or superseded. Nothing on
            this site should be interpreted as medical advice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/governance">
            Governance
          </Link>
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/status">
            Status
          </Link>
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/impact">
            Impact
          </Link>
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/terms">
            Terms
          </Link>
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/privacy">
            Privacy
          </Link>
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/changelog">
            Changelog
          </Link>
          <Link className="font-medium text-ha-accent hover:text-blue-700" href="/report">
            Report an issue
          </Link>
        </div>
        <div className="flex flex-col gap-1 text-[11px] text-ha-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} HealthArchive.ca Project.{" "}
            <span className="font-medium text-slate-800">
              Not an official government website.
            </span>
          </p>
          <p className="text-[11px]">
            This site is{" "}
            <span className="font-medium text-amber-800">in development</span>.
            {" "}Coverage, data, and functionality are incomplete and subject to
            change.
          </p>
        </div>
      </div>
    </footer>
  );
}
