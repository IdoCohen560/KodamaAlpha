/**
 * Seasonal event definitions + date checks.
 */

export interface SeasonalEvent {
  id: string;
  name: string;
  check: () => boolean;
  xpMultiplier?: number;
  xpReason?: string;
  description: string;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: "friday-13",
    name: "Cursed Day",
    check: () => { const d = new Date(); return d.getDay() === 5 && d.getDate() === 13; },
    xpMultiplier: 2,
    xpReason: "bug-fix",
    description: "Bugs fixed today give 2x XP. Spooky art mode.",
  },
  {
    id: "pi-day",
    name: "Pi Time",
    check: () => { const d = new Date(); return d.getMonth() === 2 && d.getDate() === 14; },
    xpMultiplier: 2,
    xpReason: "commit",
    description: "Commits at 3:14 give 2x XP.",
  },
  {
    id: "hacktoberfest",
    name: "Hacktoberfest",
    check: () => new Date().getMonth() === 9,
    description: "October! Open source contributions welcome.",
  },
  {
    id: "leap-day",
    name: "Temporal Anomaly",
    check: () => { const d = new Date(); return d.getMonth() === 1 && d.getDate() === 29; },
    description: "Feb 29. Legendary bestiary entries available.",
  },
  {
    id: "holiday",
    name: "Holiday Season",
    check: () => { const d = new Date(); return d.getMonth() === 11 && d.getDate() >= 20 && d.getDate() <= 31; },
    description: "Happy holidays! Companion wears a festive hat.",
  },
];

export function getActiveEvents(): SeasonalEvent[] {
  return SEASONAL_EVENTS.filter(e => e.check());
}

export function isHatchDay(hatchedAt: number): boolean {
  const hatch = new Date(hatchedAt);
  const now = new Date();
  return hatch.getMonth() === now.getMonth() && hatch.getDate() === now.getDate() && hatch.getFullYear() !== now.getFullYear();
}
