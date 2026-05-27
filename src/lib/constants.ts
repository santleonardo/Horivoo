// ================================================================
// HORIVOO — Constants & Helpers
// ================================================================

export const SCHEDULE = {
  manha: { label: "Manhã", icon: "☀️", hours: ["08:00", "09:00", "10:00", "11:00"] },
  tarde: { label: "Tarde", icon: "🌤️", hours: ["13:00", "14:00", "15:00", "16:00", "17:00"] },
  noite: { label: "Noite", icon: "🌙", hours: ["18:00", "19:00", "20:00", "21:00"] },
} as const;

export const DAYS = [
  { key: "segunda", label: "Seg", full: "Segunda" },
  { key: "terca", label: "Ter", full: "Terça" },
  { key: "quarta", label: "Qua", full: "Quarta" },
  { key: "quinta", label: "Qui", full: "Quinta" },
  { key: "sexta", label: "Sex", full: "Sexta" },
  { key: "sabado", label: "Sáb", full: "Sábado" },
  { key: "domingo", label: "Dom", full: "Domingo" },
] as const;

export const TOTAL_HOURS_PER_DAY =
  SCHEDULE.manha.hours.length +
  SCHEDULE.tarde.hours.length +
  SCHEDULE.noite.hours.length;

export const TOTAL_SLOTS = DAYS.length * TOTAL_HOURS_PER_DAY;

/**
 * Classifies a time string into a period of day.
 */
export function getPeriodForTime(hourStr: string): "manha" | "tarde" | "noite" {
  const h = parseInt(hourStr.split(":")[0], 10);
  if (h >= 6 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

/**
 * Compares two "HH:MM" time strings for chronological sorting.
 */
export function compareHours(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

export type MergedSchedule = Record<
  "manha" | "tarde" | "noite",
  { label: string; icon: string; hours: string[] }
>;

/**
 * Merges fixed schedule hours with custom hours from the database,
 * grouped by period and sorted chronologically.
 */
export function buildMergedSchedule(
  blocked: Array<{ day: string; hour: string }> = [],
  booked: Array<{ day: string; hour: string }> = []
): MergedSchedule {
  const merged: MergedSchedule = {
    manha: { label: "Manhã", icon: "☀️", hours: [...SCHEDULE.manha.hours] },
    tarde: { label: "Tarde", icon: "🌤️", hours: [...SCHEDULE.tarde.hours] },
    noite: { label: "Noite", icon: "🌙", hours: [...SCHEDULE.noite.hours] },
  };

  const allHours = new Set<string>();
  blocked.forEach((s) => allHours.add(s.hour));
  booked.forEach((b) => allHours.add(b.hour));

  const scheduleHours = new Set([
    ...SCHEDULE.manha.hours,
    ...SCHEDULE.tarde.hours,
    ...SCHEDULE.noite.hours,
  ]);

  allHours.forEach((hour) => {
    if (!scheduleHours.has(hour)) {
      const period = getPeriodForTime(hour);
      if (!merged[period].hours.includes(hour)) {
        merged[period].hours.push(hour);
      }
    }
  });

  Object.values(merged).forEach((period) => {
    period.hours.sort(compareHours);
  });

  return merged;
}

/**
 * Returns the full day label from a day key.
 */
export function getDayFull(dayKey: string): string {
  const day = DAYS.find((d) => d.key === dayKey);
  return day ? day.full : dayKey;
}
