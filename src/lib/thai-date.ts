/** Helpers for local-day `YYYY-MM-DD` keys and Thai (Buddhist era) display. */

export function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string) {
  return new Date(`${key}T00:00:00`);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** dd/mm/yyyy in the Buddhist era, e.g. 13/10/2569. */
export function formatThaiDate(key: string) {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${Number(year) + 543}`;
}

/** Whole days from today to the given key (0 = today). */
export function daysFromToday(key: string) {
  const today = fromDateKey(toDateKey(new Date()));
  return Math.round((fromDateKey(key).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}
