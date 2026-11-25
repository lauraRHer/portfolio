/** "2026-11-12" → "12 nov 2026" / "12 Nov 2026". Fixed UTC so server and client agree. */
export function formatPostDate(date: string, locale: string, opts: { year?: boolean } = {}): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(opts.year === false ? {} : { year: "numeric" }),
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(".", "");
}
