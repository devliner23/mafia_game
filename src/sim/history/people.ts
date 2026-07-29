/**
 * THE PEOPLE.
 *
 * The corpus seats about a dozen real men. This file generates the other
 * hundred and forty, and it is the difference between a historical setting and
 * a historical skin.
 *
 * The test I wrote it against: pull a soldier at random out of a 1931 roster
 * and a soldier at random out of a 1987 roster, print both, and you should be
 * able to tell which is which without being told the year. Not because one has
 * a fedora in his description — because he is fifty-one and born in Sciacca and
 * illiterate and did eleven months on Blackwell's Island for a Black Hand
 * letter, and the other is thirty-four, born in Howard Beach, has been an
 * associate for nine years waiting for books that were shut, and is quietly
 * doing cocaine his capo has forbidden.
 *
 * Four things vary by era, and all four are load-bearing rather than cosmetic:
 *
 *   AGE AND GENERATION  Ages come from the rank, birth years from the date, and
 *   what a man lived through falls out of the arithmetic. Nobody has to author
 *   "veteran of the Pacific" — a man born in 1921 who is thirty in 1951 either
 *   served or has a reason he did not.
 *
 *   WHERE HE IS FROM    Seventy per cent of made men in 1930 New York were born
 *   in Italy. By 1976 it is under ten. That single number changes how a roster
 *   reads more than any adjective would, and it is the reason the discretion
 *   baseline slides across the century.
 *
 *   WHAT HE IS HIDING   The secret table is era-weighted. A man secretly
 *   talking to the government is close to impossible in 1931 and unremarkable
 *   in 1990. Narcotics is a secret precisely in the years the families banned
 *   it and their soldiers did it anyway.
 *
 *   HOW LONG HE HAS WAITED  This is the one that bites. In the closed-books
 *   eras, associates are generated with the years they have actually been
 *   standing around — a decade and a half of it, by 1972 — and those years are
 *   converted into grudges. The bitterness in a 1970 roster is not flavour
 *   text. It is a number, and it came from a real administrative decision made
 *   in December 1957.
 */

import type { Rng } from "../rng";
import type { Crew, Rank } from "../types";
import { eraById, settingById, type Era } from "./eras";
import type { SettingId } from "./houses";

/* ------------------------------------------------------------------ the shape */

export type Heritage = "sicilian" | "italian" | "other";

export interface Demographics {
  /** Age windows by rank, at the era's opening date. */
  ages: Record<Rank, readonly [number, number]>;
  /** Share of made men born outside the country. */
  foreignBorn: number;
  /** Weighted ethnic mix. Keys are display labels; heritage is derived. */
  ethnicity: readonly { label: string; heritage: Heritage; weight: number }[];
  /** Legitimate work on paper. Every man has one; it is where the heat lands. */
  fronts: readonly string[];
  /** Weighted secrets. Ids match the Secret union in types.ts. */
  secrets: readonly { id: string; weight: number }[];
  /**
   * Years an associate has typically been waiting. In an open-books era this is
   * short. In a closed-books era it is however long the books have been shut,
   * and that is where the resentment in the roster comes from.
   */
  waiting: readonly [number, number];
  /** Baseline shift on discretion, driven by how total the code is that year. */
  discretionShift: number;
  note: string;
}

export interface Trait {
  id: string;
  name: string;
  /** One clause. Shown on the man's card; never longer than this. */
  blurb: string;
  weight: number;
  /** Filters. Absent means "anywhere this makes sense". */
  eras?: readonly string[];
  settings?: readonly SettingId[];
  years?: readonly [number, number];
  ranks?: readonly Rank[];
  heritage?: readonly Heritage[];
  /** Only for men born outside the country, or only for men born here. */
  foreignBorn?: boolean;
  effects: Partial<Record<"competence" | "loyalty" | "ambition" | "discretion" | "knowledge" | "earnings", number>>;
}

/* ------------------------------------------------- demographics, by era */

const NY_EARLY: Demographics = {
  ages: { boss: [46, 62], underboss: [42, 58], capo: [34, 52], soldier: [24, 44], associate: [18, 32] },
  foreignBorn: 0.7,
  ethnicity: [
    { label: "Sicilian", heritage: "sicilian", weight: 62 },
    { label: "Neapolitan", heritage: "italian", weight: 18 },
    { label: "Calabrian", heritage: "italian", weight: 12 },
    { label: "American-born Italian", heritage: "italian", weight: 8 },
  ],
  fronts: [
    "olive oil importing", "a coal and ice yard", "a cartage outfit", "a barber shop",
    "cheese wholesaling", "a soda parlour", "the longshoremen's local", "an undertaker's",
    "a cigar store", "a bakery on the avenue", "a poolroom", "a fruit stand",
  ],
  secrets: [
    { id: "none", weight: 52 },
    { id: "gambling_debts", weight: 16 },
    { id: "skimming", weight: 14 },
    { id: "a_body_of_their_own", weight: 17 },
    { id: "talking_to_feds", weight: 1 },
  ],
  waiting: [1, 4],
  discretionShift: 8,
  note: "Two thirds of the made men were born in Italy and a third of them cannot read English. Nobody has ever heard of anyone cooperating.",
};

const NY_MIDCENTURY: Demographics = {
  ages: { boss: [50, 66], underboss: [46, 62], capo: [38, 56], soldier: [28, 48], associate: [20, 36] },
  foreignBorn: 0.3,
  ethnicity: [
    { label: "Sicilian", heritage: "sicilian", weight: 44 },
    { label: "Neapolitan", heritage: "italian", weight: 24 },
    { label: "Calabrian", heritage: "italian", weight: 14 },
    { label: "American-born Italian", heritage: "italian", weight: 18 },
  ],
  fronts: [
    "a vending machine route", "a dress contracting shop", "a trucking company",
    "a linen supply", "a restaurant on Mulberry", "a funeral parlour", "a candy store",
    "a union delegate's desk", "a bar and grill", "a car dealership", "a produce terminal",
  ],
  secrets: [
    { id: "none", weight: 46 },
    { id: "gambling_debts", weight: 18 },
    { id: "skimming", weight: 14 },
    { id: "a_body_of_their_own", weight: 13 },
    { id: "in_the_junk", weight: 8 },
    { id: "talking_to_feds", weight: 1 },
  ],
  waiting: [2, 6],
  discretionShift: 5,
  note: "The generation that came up under Prohibition is running things and the generation that fought a war is under them. Narcotics is banned and everybody's cousin is in it.",
};

const NY_CLOSED_BOOKS: Demographics = {
  ages: { boss: [54, 70], underboss: [48, 64], capo: [42, 60], soldier: [34, 56], associate: [26, 46] },
  foreignBorn: 0.15,
  ethnicity: [
    { label: "Sicilian", heritage: "sicilian", weight: 30 },
    { label: "Neapolitan", heritage: "italian", weight: 22 },
    { label: "Calabrian", heritage: "italian", weight: 12 },
    { label: "American-born Italian", heritage: "italian", weight: 30 },
    { label: "Irish", heritage: "other", weight: 3 },
    { label: "Jewish", heritage: "other", weight: 3 },
  ],
  fronts: [
    "a car service", "a meat wholesaler", "an air freight agency", "a pizzeria",
    "a juice bar on the boulevard", "a carting company", "a nightclub", "a body shop",
    "a luncheonette", "a garment trucking outfit", "a social club with a coffee machine",
  ],
  secrets: [
    { id: "none", weight: 38 },
    { id: "gambling_debts", weight: 20 },
    { id: "skimming", weight: 15 },
    { id: "a_body_of_their_own", weight: 12 },
    { id: "in_the_junk", weight: 11 },
    { id: "talking_to_feds", weight: 4 },
  ],
  // Nobody has been made since December 1957. The men waiting have been waiting.
  waiting: [8, 17],
  discretionShift: 0,
  note: "An ageing roster with nothing coming up beneath it. The associates are grown men with children who have been told 'soon' for fifteen years.",
};

const NY_MODERN: Demographics = {
  ages: { boss: [50, 68], underboss: [46, 62], capo: [38, 58], soldier: [30, 52], associate: [21, 40] },
  foreignBorn: 0.08,
  ethnicity: [
    { label: "American-born Italian", heritage: "italian", weight: 52 },
    { label: "Sicilian", heritage: "sicilian", weight: 16 },
    { label: "Neapolitan", heritage: "italian", weight: 14 },
    { label: "Calabrian", heritage: "italian", weight: 8 },
    { label: "Irish", heritage: "other", weight: 5 },
    { label: "Jewish", heritage: "other", weight: 5 },
  ],
  fronts: [
    "a concrete supplier", "a waste hauling route", "a social club", "a catering hall",
    "an auto body shop", "an asbestos removal firm", "a sanitation local", "a restaurant in Bay Ridge",
    "a construction consultancy", "a car wash", "a discount carpet warehouse", "a video store",
  ],
  secrets: [
    { id: "none", weight: 32 },
    { id: "gambling_debts", weight: 21 },
    { id: "skimming", weight: 15 },
    { id: "in_the_junk", weight: 14 },
    { id: "a_body_of_their_own", weight: 8 },
    { id: "talking_to_feds", weight: 10 },
  ],
  waiting: [2, 7],
  discretionShift: -6,
  note: "Suburban, second and third generation, and the first roster in which a man at the table might genuinely already be a witness.",
};

const CHICAGO_1920s: Demographics = {
  ages: { boss: [30, 48], underboss: [28, 44], capo: [26, 42], soldier: [21, 38], associate: [17, 30] },
  foreignBorn: 0.42,
  ethnicity: [
    { label: "Sicilian", heritage: "sicilian", weight: 22 },
    { label: "Neapolitan", heritage: "italian", weight: 16 },
    { label: "Irish", heritage: "other", weight: 28 },
    { label: "Polish", heritage: "other", weight: 16 },
    { label: "Jewish", heritage: "other", weight: 12 },
    { label: "German", heritage: "other", weight: 6 },
  ],
  fronts: [
    "a brewery on the West Side", "a soft drink distributorship", "a laundry",
    "a saloon with the shutters down", "a cleaners and dyers shop", "a florist's",
    "a cartage company", "a roadhouse out past the county line", "a cigar stand",
    "a ward office", "a taxi garage",
  ],
  secrets: [
    { id: "none", weight: 40 },
    { id: "gambling_debts", weight: 14 },
    { id: "skimming", weight: 16 },
    { id: "a_body_of_their_own", weight: 26 },
    { id: "talking_to_feds", weight: 4 },
  ],
  waiting: [0, 3],
  discretionShift: -10,
  note: "Astonishingly young — the men running this city are in their thirties — and not remotely Sicilian. There is no code here to be broken, only a payroll to be on.",
};

const PALERMO: Demographics = {
  ages: { boss: [44, 64], underboss: [40, 58], capo: [34, 54], soldier: [24, 46], associate: [18, 32] },
  foreignBorn: 0,
  ethnicity: [
    { label: "Palermitano", heritage: "sicilian", weight: 58 },
    { label: "from the province", heritage: "sicilian", weight: 34 },
    { label: "Sicilian, raised abroad", heritage: "sicilian", weight: 8 },
  ],
  fronts: [
    "a building firm", "a citrus grove at Ciaculli", "a butcher's shop", "a petrol station",
    "a private clinic", "a haulage yard", "a hardware warehouse", "a bar in the piazza",
    "a quarry", "a cattle dealership", "an estate agency",
  ],
  secrets: [
    { id: "none", weight: 54 },
    { id: "a_body_of_their_own", weight: 22 },
    { id: "skimming", weight: 10 },
    { id: "in_the_junk", weight: 10 },
    { id: "gambling_debts", weight: 3 },
    { id: "talking_to_feds", weight: 1 },
  ],
  waiting: [2, 8],
  discretionShift: 14,
  note: "A man is watched for years before anyone speaks to him, and the pledge is for life. Until 1984 there is effectively no such thing as a witness.",
};

const PALERMO_AFTER: Demographics = {
  ...PALERMO,
  secrets: [
    { id: "none", weight: 42 },
    { id: "a_body_of_their_own", weight: 22 },
    { id: "skimming", weight: 10 },
    { id: "in_the_junk", weight: 12 },
    { id: "gambling_debts", weight: 4 },
    { id: "talking_to_feds", weight: 10 },
  ],
  discretionShift: 9,
  note: "The same clan discipline, minus the certainty. Everyone now knows a man who talked, and every one of them was supposed to be beyond it.",
};

export const DEMOGRAPHICS: Record<string, Demographics> = {
  nyc_1930_war: NY_EARLY,
  nyc_1931_commission: NY_EARLY,
  nyc_1950_apalachin: NY_MIDCENTURY,
  nyc_1963_valachi: NY_CLOSED_BOOKS,
  nyc_1976_rico: NY_MODERN,
  nyc_1987_fall: NY_MODERN,
  chi_1924_beer_war: CHICAGO_1920s,
  pal_1978_mattanza: PALERMO,
  pal_1984_maxiprocesso: PALERMO_AFTER,
};

/* ------------------------------------------------------------------- service */

/**
 * What he was the right age for. Derived rather than authored, so it is always
 * consistent with the birth year and never has to be maintained.
 */
interface War {
  label: string;
  /** Years the conflict took men. */
  window: readonly [number, number];
  /** Birth years that were called. */
  born: readonly [number, number];
  settings: readonly SettingId[];
  chance: number;
}

const WARS: readonly War[] = [
  { label: "the Great War", window: [1917, 1918], born: [1885, 1900], settings: ["nyc", "chicago"], chance: 0.22 },
  { label: "the Pacific", window: [1941, 1945], born: [1908, 1927], settings: ["nyc", "chicago"], chance: 0.26 },
  { label: "Europe", window: [1941, 1945], born: [1908, 1927], settings: ["nyc", "chicago"], chance: 0.24 },
  { label: "Korea", window: [1950, 1953], born: [1925, 1935], settings: ["nyc", "chicago"], chance: 0.24 },
  { label: "Vietnam", window: [1965, 1973], born: [1940, 1953], settings: ["nyc", "chicago"], chance: 0.12 },
  // Sicilians of the right age were conscripted; a good many deserted in 1943.
  { label: "the Italian army", window: [1940, 1943], born: [1905, 1925], settings: ["palermo"], chance: 0.5 },
];

function serviceFor(rng: Rng, born: number, year: number, setting: SettingId): string | null {
  const eligible = WARS.filter(
    (w) =>
      w.settings.includes(setting) &&
      born >= w.born[0] &&
      born <= w.born[1] &&
      year > w.window[0],
  );
  if (eligible.length === 0) return null;
  const w = rng.pick(eligible);
  // A criminal record was itself a common reason not to be taken.
  return rng.chance(w.chance) ? w.label : null;
}

/* -------------------------------------------------------------------- traits */

/**
 * One to three per man. Every trait moves at least one number, because a trait
 * that only prints is a costume. Weights are relative within whatever survives
 * the filters.
 */
export const TRAITS: readonly Trait[] = [
  /* --- the old country ------------------------------------------------ */
  {
    id: "greenhorn",
    name: "Greenhorn",
    blurb: "Barely any English; deals only with men from the same town.",
    weight: 14,
    foreignBorn: true,
    years: [1900, 1955],
    effects: { discretion: 12, competence: -6, loyalty: 8, ambition: -6 },
  },
  {
    id: "black_hand",
    name: "Came up on letters",
    blurb: "Learned the business writing extortion notes with a hand and a dagger drawn at the bottom.",
    weight: 9,
    years: [1900, 1940],
    ranks: ["capo", "underboss", "boss", "soldier"],
    effects: { competence: 6, discretion: -4, earnings: 4 },
  },
  {
    id: "zip",
    name: "Zip",
    blurb: "Brought over from Sicily for the heroin work; keeps entirely to his own.",
    weight: 8,
    settings: ["nyc"],
    years: [1968, 1990],
    foreignBorn: true,
    effects: { discretion: 16, loyalty: 12, competence: 6, knowledge: -8 },
  },
  {
    id: "old_country_made",
    name: "Made in Sicily",
    blurb: "Was already a man of honour before he ever saw this city.",
    weight: 6,
    heritage: ["sicilian"],
    foreignBorn: true,
    ranks: ["soldier", "capo", "underboss"],
    effects: { discretion: 14, loyalty: 10, ambition: 4 },
  },

  /* --- the trade ------------------------------------------------------ */
  {
    id: "wheel",
    name: "Drives",
    blurb: "Has never been stopped in his life and knows every scale house on the route.",
    weight: 10,
    years: [1920, 1936],
    effects: { competence: 8, earnings: 6, knowledge: -4 },
  },
  {
    id: "brewer",
    name: "Knows beer",
    blurb: "Can run a brewery, and the alky cookers in three streets answer to him.",
    weight: 10,
    years: [1920, 1934],
    effects: { earnings: 12, competence: 6 },
  },
  {
    id: "slugger",
    name: "Union slugger",
    blurb: "Twenty years of organising by other means. The locals know the face.",
    weight: 11,
    years: [1920, 1975],
    effects: { competence: 6, earnings: 6, discretion: -6 },
  },
  {
    id: "bank",
    name: "Runs a bank",
    blurb: "Holds the policy bank for the neighbourhood; the numbers all pass his desk.",
    weight: 11,
    years: [1925, 1980],
    effects: { earnings: 14, knowledge: 8, competence: 4 },
  },
  {
    id: "shylock",
    name: "Money on the street",
    blurb: "Has more out on the street than he keeps in the house.",
    weight: 13,
    effects: { earnings: 12, competence: 4 },
  },
  {
    id: "hijack",
    name: "Works the freight",
    blurb: "Knows what is in the container before it is off the aircraft.",
    weight: 10,
    settings: ["nyc"],
    years: [1958, 1992],
    effects: { earnings: 12, competence: 6, discretion: -4 },
  },
  {
    id: "concrete",
    name: "In the concrete",
    blurb: "Nothing gets poured on his side of the borough without his number on it.",
    weight: 11,
    years: [1975, 1993],
    ranks: ["capo", "underboss", "boss", "soldier"],
    effects: { earnings: 18, knowledge: 10, discretion: 4 },
  },
  {
    id: "appalto",
    name: "Holds the tenders",
    blurb: "Every public contract in the mandamento is decided before it is advertised.",
    weight: 12,
    settings: ["palermo"],
    ranks: ["capo", "underboss", "boss"],
    effects: { earnings: 18, knowledge: 10, discretion: 6 },
  },
  {
    id: "raffineria",
    name: "Minds a refinery",
    blurb: "Knows where the morphine base is cooked and which chemist flies in for it.",
    weight: 9,
    settings: ["palermo"],
    years: [1975, 1990],
    effects: { earnings: 20, knowledge: 14, discretion: -4 },
  },

  /* --- the work nobody discusses -------------------------------------- */
  {
    id: "shooter",
    name: "Does the work",
    blurb: "Called on when something has to be done, and has never once discussed it.",
    weight: 12,
    ranks: ["soldier", "capo", "associate"],
    effects: { competence: 10, discretion: 8, loyalty: 6, earnings: -6 },
  },
  {
    id: "thompson",
    name: "Machine gun",
    blurb: "One of the few in the city who can actually handle one.",
    weight: 8,
    settings: ["chicago"],
    years: [1924, 1935],
    effects: { competence: 12, discretion: -8 },
  },
  {
    id: "bombs",
    name: "Pineapples",
    blurb: "Handles the black powder work on primary nights.",
    weight: 7,
    settings: ["chicago"],
    years: [1924, 1932],
    effects: { competence: 8, discretion: -10, earnings: 4 },
  },
  {
    id: "latitante",
    name: "Fugitive",
    blurb: "Has not slept at his own address in years; moves between farms.",
    weight: 8,
    settings: ["palermo"],
    ranks: ["capo", "underboss", "boss"],
    effects: { discretion: 16, knowledge: 8, earnings: -8, competence: 4 },
  },

  /* --- the state ------------------------------------------------------ */
  {
    id: "priors",
    name: "Been down",
    blurb: "Two bids upstate. Came out with more friends than he went in with.",
    weight: 14,
    effects: { loyalty: 8, knowledge: 6, competence: 4, discretion: 4 },
  },
  {
    id: "kefauver",
    name: "Sat before the committee",
    blurb: "Took the fifth on television and has not been left alone since.",
    weight: 7,
    settings: ["nyc", "chicago"],
    years: [1950, 1963],
    ranks: ["capo", "underboss", "boss"],
    effects: { knowledge: 10, discretion: -8, earnings: -4 },
  },
  {
    id: "named",
    name: "Named in the hearings",
    blurb: "His name was read into the record in 1963 and it has been in a file ever since.",
    weight: 9,
    settings: ["nyc"],
    years: [1963, 1980],
    effects: { knowledge: 8, discretion: -10 },
  },
  {
    id: "grand_jury",
    name: "Grand jury regular",
    blurb: "Subpoenaed so often the marshals know his coffee order. Has never said a word.",
    weight: 10,
    years: [1965, 1993],
    effects: { loyalty: 10, discretion: 6, earnings: -6 },
  },
  {
    id: "tapes",
    name: "On tape somewhere",
    blurb: "Talks in the club, talks in the car, talks on the phone in his own kitchen.",
    weight: 12,
    settings: ["nyc", "chicago"],
    years: [1970, 1993],
    effects: { discretion: -18, knowledge: 6 },
  },
  {
    id: "intercettato",
    name: "Intercepted",
    blurb: "Spoke on a telephone once, in 1985, and it has been played back to him since.",
    weight: 8,
    settings: ["palermo"],
    years: [1985, 1993],
    effects: { discretion: -12, knowledge: 6 },
  },
  {
    id: "ucciardone",
    name: "Did time in the Ucciardone",
    blurb: "Came out better connected than half the men who never went in.",
    weight: 10,
    settings: ["palermo"],
    effects: { loyalty: 8, knowledge: 10, discretion: 6 },
  },
  {
    id: "on_the_pad",
    name: "Owns a precinct",
    blurb: "Pays a captain monthly and gets a phone call before any raid.",
    weight: 10,
    years: [1920, 1972],
    ranks: ["capo", "underboss", "boss"],
    effects: { discretion: 10, earnings: -4, knowledge: 8 },
  },

  /* --- the man himself ------------------------------------------------ */
  {
    id: "flashy",
    name: "Likes the papers",
    blurb: "Tailored, photographed, quoted. Everyone above him has told him to stop.",
    weight: 9,
    years: [1928, 1993],
    effects: { discretion: -16, ambition: 12, earnings: 6 },
  },
  {
    id: "riservato",
    name: "Reserved",
    blurb: "Says nothing that is not necessary, to anyone, including his wife.",
    weight: 12,
    effects: { discretion: 18, ambition: -6, knowledge: -4 },
  },
  {
    id: "drinker",
    name: "Drinks",
    blurb: "Fine until about ten at night, and then not.",
    weight: 10,
    effects: { discretion: -14, competence: -6, loyalty: -4 },
  },
  {
    id: "degenerate",
    name: "Bets his own money",
    blurb: "Owes men in two other houses and is careful that nobody in this one knows.",
    weight: 11,
    effects: { loyalty: -10, discretion: -6, earnings: -8, ambition: 6 },
  },
  {
    id: "earner",
    name: "Earner",
    blurb: "Has never once come up short, which buys a great deal of forgiveness.",
    weight: 12,
    effects: { earnings: 20, competence: 8, ambition: 6 },
  },
  {
    id: "hothead",
    name: "Hothead",
    blurb: "Has put two men in hospital over things that did not require it.",
    weight: 11,
    effects: { discretion: -12, ambition: 10, competence: 4, loyalty: -6 },
  },
  {
    id: "blood",
    name: "Family in the house",
    blurb: "His father, his uncle and his brother-in-law are all in this.",
    weight: 12,
    effects: { loyalty: 14, knowledge: 6, ambition: 4 },
  },
  {
    id: "schooled",
    name: "Had schooling",
    blurb: "Reads a balance sheet, which in this business is close to a superpower.",
    weight: 8,
    years: [1945, 1993],
    effects: { competence: 10, earnings: 10, knowledge: 6 },
  },
  {
    id: "illiterate",
    name: "Cannot read",
    blurb: "Keeps everything in his head, which has advantages nobody planned for.",
    weight: 9,
    years: [1900, 1955],
    effects: { discretion: 10, competence: -8, earnings: -6 },
  },
  {
    id: "old_man",
    name: "Of the old school",
    blurb: "Was made before the war and thinks nothing since has been done properly.",
    weight: 10,
    ranks: ["capo", "underboss", "boss"],
    effects: { loyalty: 10, discretion: 8, ambition: -10, competence: -4 },
  },
  {
    id: "waiting",
    name: "Passed over",
    blurb: "Has been told 'soon' by three different capos and has stopped believing it.",
    weight: 13,
    ranks: ["associate", "soldier"],
    effects: { loyalty: -14, ambition: 14, discretion: -6 },
  },
  {
    id: "coke",
    name: "Using",
    blurb: "Not selling it — using it, which his capo would consider worse.",
    weight: 10,
    years: [1978, 1993],
    effects: { discretion: -16, competence: -8, loyalty: -8, earnings: 6 },
  },
  {
    id: "gym",
    name: "Kid from the club",
    blurb: "Came up around the social club running errands from the age of twelve.",
    weight: 11,
    ranks: ["associate", "soldier"],
    effects: { loyalty: 12, knowledge: -6, ambition: 8 },
  },
  {
    id: "politician",
    name: "Knows the ward",
    blurb: "Delivered a precinct twice and can still get a licence signed.",
    weight: 9,
    settings: ["chicago", "nyc"],
    years: [1920, 1965],
    effects: { earnings: 10, discretion: 8, knowledge: 6 },
  },
  {
    id: "cousin_brooklyn",
    name: "Cousin in Brooklyn",
    blurb: "Half the family emigrated; the other half handles this end of the route.",
    weight: 10,
    settings: ["palermo"],
    effects: { earnings: 12, knowledge: 8 },
  },
  {
    id: "campagna",
    name: "Off the land",
    blurb: "Grew up in a hill town and is regarded by the city men as a peasant, to their cost.",
    weight: 11,
    settings: ["palermo"],
    effects: { loyalty: 10, discretion: 10, ambition: 10, competence: -4 },
  },
];

/* ------------------------------------------------------------------ the maker */

export interface PersonContext {
  era: Era;
  /** The year the run opens. */
  year: number;
  rank: Rank;
  /** Real men from the corpus keep their name and get a lighter touch. */
  historical?: boolean;
  isPlayer?: boolean;
}

export interface PersonFacts {
  born: number;
  age: number;
  bornAbroad: boolean;
  ethnicity: string;
  heritage: Heritage;
  front: string;
  service: string | null;
  traits: string[];
  /** Years spent as an associate before being made. Zero if never made. */
  waited: number;
}

/**
 * Duplicated from the setting table rather than imported, to keep this module
 * free of a cycle. If it drifts, checkPeople() says so.
 */
const MADE_REQUIRES: Record<SettingId, "sicilian" | "italian" | "none"> = {
  nyc: "italian",
  chicago: "none",
  palermo: "sicilian",
};

const pickWeighted = <T extends { weight: number }>(rng: Rng, pool: readonly T[]): T => {
  const total = pool.reduce((n, x) => n + x.weight, 0);
  let roll = rng.next() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1]!;
};

export const demographicsFor = (era: Era): Demographics =>
  DEMOGRAPHICS[era.id] ?? NY_MODERN;

/**
 * Everything about a man that the year decides. Called immediately after
 * makeCrew, and mutates the Crew in place — the stat effects have to land on
 * the same object the rest of the simulation reads, or the traits are wallpaper.
 */
export function dress(rng: Rng, crew: Crew, ctx: PersonContext): PersonFacts {
  const demo = demographicsFor(ctx.era);
  const setting = ctx.era.setting;

  const [minAge, maxAge] = demo.ages[ctx.rank];
  const age = rng.int(minAge, maxAge);
  const born = ctx.year - age;

  // The mix is drawn from, but not blindly: in a setting where initiation
  // requires the right parentage, a man above associate cannot be of the wrong
  // one. An Irish soldier in a New York family is not a diversity of outcome,
  // it is a factual error — those men existed in numbers, and every one of them
  // stayed an associate for life.
  const requires = MADE_REQUIRES[setting];
  const eligibleEthnicity =
    requires === "none" || ctx.rank === "associate"
      ? demo.ethnicity
      : demo.ethnicity.filter((e) =>
          requires === "sicilian" ? e.heritage === "sicilian" : e.heritage !== "other",
        );
  const eth = pickWeighted(rng, eligibleEthnicity.length > 0 ? eligibleEthnicity : demo.ethnicity);
  // An American-born label cannot also be foreign-born, whatever the share says.
  const couldBeForeign = !eth.label.startsWith("American") && setting !== "palermo";
  const bornAbroad = couldBeForeign && rng.chance(demo.foreignBorn);

  const front = rng.pick(demo.fronts);
  const service = serviceFor(rng, born, ctx.year, setting);

  // Traits: filtered hard, then drawn without replacement.
  const eligible = TRAITS.filter(
    (t) =>
      (!t.settings || t.settings.includes(setting)) &&
      (!t.eras || t.eras.includes(ctx.era.id)) &&
      (!t.years || (ctx.year >= t.years[0] && ctx.year <= t.years[1])) &&
      (!t.ranks || t.ranks.includes(ctx.rank)) &&
      (!t.heritage || t.heritage.includes(eth.heritage)) &&
      (t.foreignBorn === undefined || t.foreignBorn === bornAbroad),
  );

  const wanted = ctx.isPlayer ? 1 : rng.int(1, 3);
  const traits: Trait[] = [];
  const pool = [...eligible];
  for (let i = 0; i < wanted && pool.length > 0; i++) {
    const t = pickWeighted(rng, pool);
    traits.push(t);
    pool.splice(pool.indexOf(t), 1);
  }

  // Apply. The era's own discretion baseline goes on first, so a 1931 roster is
  // quieter than a 1987 one before any individual has a personality.
  crew.discretion = clamp(crew.discretion + demo.discretionShift);
  if (bornAbroad) {
    crew.discretion = clamp(crew.discretion + 6);
    crew.loyalty = clamp(crew.loyalty + 5);
  }
  if (service) crew.competence = clamp(crew.competence + 4);

  for (const t of traits) {
    crew.competence = clamp(crew.competence + (t.effects.competence ?? 0));
    crew.loyalty = clamp(crew.loyalty + (t.effects.loyalty ?? 0));
    crew.ambition = clamp(crew.ambition + (t.effects.ambition ?? 0));
    crew.discretion = clamp(crew.discretion + (t.effects.discretion ?? 0));
    crew.knowledge = clamp(crew.knowledge + (t.effects.knowledge ?? 0));
  }

  // Secrets are era-weighted, not uniform. This is the single change that makes
  // 1990 feel dangerous in a way 1931 does not.
  if (!ctx.isPlayer) {
    crew.secret = pickWeighted(rng, demo.secrets).id as Crew["secret"];
    // A man already using is not also a man with no secret.
    if (traits.some((t) => t.id === "coke") && crew.secret === "none") crew.secret = "in_the_junk";
    if (traits.some((t) => t.id === "degenerate") && crew.secret === "none") crew.secret = "gambling_debts";
  }

  /* --- the waiting -------------------------------------------------------
   * How long he stood around before he was made, and what that did to him.
   * In a closed-books era this is the whole texture of the roster: men in
   * their forties who have been associates since Eisenhower.
   */
  // He cannot have been waiting since he was twelve. The window is a property
  // of the era; the man's own age is the ceiling on it.
  const waited = Math.max(0, Math.min(rng.int(demo.waiting[0], demo.waiting[1]), age - 17));
  if (ctx.rank === "associate" && !ctx.isPlayer) {
    // Every year of it is a year of being told soon.
    crew.grudges += Math.floor(waited / 4);
    crew.ambition = clamp(crew.ambition + Math.min(18, waited * 1.5));
    crew.loyalty = clamp(crew.loyalty - Math.min(20, waited * 1.4));
    crew.madeWeek = null;
  } else if (!ctx.isPlayer) {
    // Made men were made in the past, and how long ago shapes what they know.
    crew.madeWeek = 0;
    crew.knowledge = clamp(crew.knowledge + Math.min(12, Math.max(0, age - 30) / 2));
  }

  return {
    born,
    age,
    bornAbroad,
    ethnicity: eth.label,
    heritage: eth.heritage,
    front,
    service,
    traits: traits.map((t) => t.id),
    waited: ctx.rank === "associate" ? waited : 0,
  };
}

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export const traitById = (id: string): Trait | undefined => TRAITS.find((t) => t.id === id);

/** "51, born in Sciacca, olive oil importing" — the one-line card summary. */
export function describePerson(facts: PersonFacts, era: Era): string {
  const bits = [`${facts.age}`];
  bits.push(facts.bornAbroad ? `${facts.ethnicity}, born there` : facts.ethnicity);
  if (facts.service) bits.push(facts.service);
  bits.push(facts.front);
  if (facts.waited > 6) bits.push(`${facts.waited} years an ${era.setting === "palermo" ? "avvicinato" : "associate"}`);
  return bits.join(" · ");
}

/* ------------------------------------------------------------------ the check */

/** Folded into checkHistory(). An era with no demographics generates 1985 men. */
export function checkPeople(): { where: string; what: string }[] {
  const problems: { where: string; what: string }[] = [];
  for (const id of Object.keys(DEMOGRAPHICS)) {
    if (!eraById(id)) problems.push({ where: id, what: "demographics for an era that does not exist" });
  }
  for (const t of TRAITS) {
    if (Object.keys(t.effects).length === 0)
      problems.push({ where: t.id, what: "trait moves no numbers — it is a costume" });
    if (t.years && t.years[0] > t.years[1]) problems.push({ where: t.id, what: "year window is backwards" });
    for (const e of t.eras ?? []) if (!eraById(e)) problems.push({ where: t.id, what: `unknown era ${e}` });
  }
  for (const [id, demo] of Object.entries(DEMOGRAPHICS)) {
    const total = demo.ethnicity.reduce((n, e) => n + e.weight, 0);
    if (total <= 0) problems.push({ where: id, what: "ethnic mix has no weight" });

    const era = eraById(id);
    if (era) {
      const setting = settingById(era.setting);
      if (setting.madeRequires !== MADE_REQUIRES[era.setting])
        problems.push({ where: id, what: "MADE_REQUIRES has drifted from the setting table" });
      const canSeat = demo.ethnicity.some((e) =>
        setting.madeRequires === "none" ? true
        : setting.madeRequires === "sicilian" ? e.heritage === "sicilian"
        : e.heritage !== "other",
      );
      if (!canSeat) problems.push({ where: id, what: "no ethnicity in the mix is eligible to be made" });
    }
    for (const rank of ["associate", "soldier", "capo", "underboss", "boss"] as const) {
      const [a, b] = demo.ages[rank];
      if (a >= b) problems.push({ where: id, what: `${rank} age window is backwards` });
    }
    // A house cannot be run by men younger than the men under them.
    if (demo.ages.boss[0] < demo.ages.soldier[0])
      problems.push({ where: id, what: "bosses can be younger than soldiers" });
  }
  return problems;
}