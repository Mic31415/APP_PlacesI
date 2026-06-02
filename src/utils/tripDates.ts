// Date/time helpers for the Trips itinerary. All trip dates are stored as
// start-of-day local timestamps (same convention as DatePickerModal), so day
// math here is plain local-calendar arithmetic.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const startOfDay = (d: Date | number): number => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export interface TripDay {
  index: number; // 0-based day number
  timestamp: number; // start-of-day timestamp for this day
  label: string; // e.g. "Day 1"
  dateLabel: string; // e.g. "Mon 12 Sep"
}

/** Inclusive whole-day count between two start-of-day timestamps. */
export const dayCount = (start: number, end: number): number => {
  const s = startOfDay(start);
  const e = startOfDay(end);
  return Math.max(1, Math.round((e - s) / MS_PER_DAY) + 1);
};

/** The ordered list of days in a trip (inclusive of start and end). */
export const enumerateDays = (start: number, end: number): TripDay[] => {
  const count = dayCount(start, end);
  const s = startOfDay(start);
  const days: TripDay[] = [];
  for (let i = 0; i < count; i++) {
    const ts = s + i * MS_PER_DAY;
    days.push({
      index: i,
      timestamp: ts,
      label: `Day ${i + 1}`,
      dateLabel: formatShortDate(ts),
    });
  }
  return days;
};

/** "Mon 12 Sep" */
export const formatShortDate = (ts: number): string => {
  const d = new Date(ts);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

/** "12–22 Sep 2026", collapsing shared month/year. */
export const formatDateRange = (start: number, end: number): string => {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  }
  if (sameYear) {
    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
};

/** Minutes-from-midnight → "9:05 AM". Clamps to a valid 0–1439 range so a
 * stray value (e.g. from a future import) can never render as "-1:-1". */
export const formatTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "";
  const clamped = Math.min(1439, Math.max(0, Math.round(minutes)));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
};
