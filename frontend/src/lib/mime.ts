export function isHtmlMimeType(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.split(";")[0]?.trim().toLowerCase();
  return normalized === "text/html" || normalized === "application/xhtml+xml";
}
