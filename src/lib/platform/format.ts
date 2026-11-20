const utc = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatUtc(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) return "Not recorded";
  return `${utc.format(new Date(millis))} UTC`;
}
