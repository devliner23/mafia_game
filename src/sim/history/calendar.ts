/**
 * THE CALENDAR — the bridge between "week 41" and "the second week of October
 * 1957".
 *
 * The simulation still counts in weeks, because every rule in the engine is
 * written in weeks and none of them should have to care. This module is the
 * only translator. Everything the player reads as a date, and every historical
 * event that fires, goes through here.
 *
 * Money goes through here too. A $1,800 shakedown is a reasonable week's work
 * in 1985 and an absurd one in 1931, so payouts are authored once in 1985
 * dollars and converted into the money of the year being played. Without this
 * the eras all feel the same, which is the failure mode that makes historical
 * settings decorative.
 */

import type { YM } from "./houses";

export const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

export const ymToDate = ([y, m]: YM): Date => new Date(Date.UTC(y, m - 1, 1));

/** Chronological compare. Negative if a is earlier. */
export const ymCompare = (a: YM, b: YM): number => a[0] - b[0] || a[1] - b[1];

export const ymWithin = (x: YM, from: YM, to: YM | null): boolean =>
  ymCompare(x, from) >= 0 && (to === null || ymCompare(x, to) < 0);

export const ymLabel = ([y, m]: YM): string => `${MONTHS[m - 1]} ${y}`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Week 1 is the week of the era's opening date. Weeks are exactly seven days,
 * so this never drifts and never needs a calendar library.
 */
export function weekToDate(startISO: string, week: number): Date {
  return new Date(Date.parse(startISO) + (week - 1) * MS_WEEK);
}

export function dateToWeek(startISO: string, iso: string): number {
  return Math.floor((Date.parse(iso) - Date.parse(startISO)) / MS_WEEK) + 1;
}

/** "12 October 1957" — the form a newspaper of the period would have used. */
export function longDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "week of 12 Oct 1957" — the header form, short enough for the status bar. */
export function weekLabel(startISO: string, week: number): string {
  const d = weekToDate(startISO, week);
  return `${MONTHS[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export const yearOf = (startISO: string, week: number): number =>
  weekToDate(startISO, week).getUTCFullYear();

/* ------------------------------------------------------------------- money */

/**
 * US CPI, 1982-84 = 100, annual average. Used only as a ratio, so the base is
 * arbitrary; 1985 is the authoring year for every payout in the content files.
 * Figures are rounded — this is a feel dial, not an economics model.
 */
const CPI: Record<number, number> = {
  1920: 20.0, 1924: 17.1, 1926: 17.7, 1929: 17.1, 1930: 16.7, 1931: 15.2,
  1933: 13.0, 1935: 13.7, 1940: 14.0, 1946: 19.5, 1950: 24.1, 1953: 26.7,
  1957: 28.1, 1960: 29.6, 1963: 30.6, 1967: 33.4, 1970: 38.8, 1972: 41.8,
  1976: 56.9, 1979: 72.6, 1981: 90.9, 1985: 107.6, 1987: 113.6, 1990: 130.7,
  1992: 140.3, 2004: 188.9,
};

const AUTHORING_YEAR = 1985;
const AUTHORING_YEAR_CPI = CPI[AUTHORING_YEAR]!;

/** Nearest tabulated CPI, clamped to the ends of the table. */
export function cpiFor(year: number): number {
  const years = Object.keys(CPI).map(Number).sort((a, b) => a - b);
  let best = years[0]!;
  for (const y of years) if (Math.abs(y - year) < Math.abs(best - year)) best = y;
  return CPI[best]!;
}

export interface Currency {
  code: string;
  /** Prefix for the numeral. */
  symbol: string;
  /** Units of this currency per US dollar, in the era being played. */
  perUsd: number;
  /** Lire figures want no decimals and thousands separators; dollars want both. */
  round: number;
}

export const USD = (perUsd = 1): Currency => ({ code: "USD", symbol: "$", perUsd, round: 1 });
export const LIRE = (perUsd: number): Currency => ({ code: "ITL", symbol: "£", perUsd, round: 10_000 });

/**
 * Convert a 1985-dollar figure into the money of the year, then into the
 * local currency, then round to something a person would actually say out loud.
 */
export function periodMoney(usd1985: number, year: number, currency: Currency): number {
  const local = usd1985 * (cpiFor(year) / AUTHORING_YEAR_CPI) * currency.perUsd;
  const step = currency.round > 1 ? currency.round : local > 20_000 ? 500 : local > 2_000 ? 50 : 5;
  return Math.max(step, Math.round(local / step) * step);
}

export function formatMoney(amount: number, currency: Currency): string {
  return `${currency.symbol}${Math.round(amount).toLocaleString("en-US")}`;
}