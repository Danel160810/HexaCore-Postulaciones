const TZ = "Europe/Madrid";

const dateTime = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });

/** "24 de septiembre de 2026, 16:36" */
export function fmtDateTime(d: Date | string) {
  return dateTime.format(new Date(d));
}

/** "24 sept 2026" */
export function fmtDate(d: Date | string) {
  return dateOnly.format(new Date(d));
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 3 horas", "en 2 días" */
export function fmtRelative(d: Date | string) {
  const diff = new Date(d).getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "ahora mismo";
}
