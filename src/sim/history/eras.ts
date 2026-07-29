/**
 * THE ERAS — a window of real time you can be dropped into.
 *
 * An era is not a difficulty setting and not a skin. It decides four things
 * the simulation cannot work out for itself:
 *
 *   WHO EXISTS      which houses are standing, under which names, run by whom
 *   WHAT THE LAW IS whether RICO exists, whether a bug is admissible, whether
 *                   there is any such thing as witness protection
 *   WHAT PAYS       Prohibition liquor, policy numbers, heroin, concrete
 *   WHAT IS COMING  a dated timeline of things that happened, which will
 *                   happen to you too, on the week they actually happened
 *
 * The last one is the design bet. The timeline is not a script for the player —
 * nothing forces your hand — but the world moves regardless. If you are a
 * Bonanno soldier in July 1979, Carmine Galante is going to be shot whether or
 * not you were paying attention, and every relationship in the city changes
 * that week. Your run is improvised inside a history that is not.
 *
 * Every dated claim below is a matter of public record. Where the record is
 * disputed — who ordered what, who really held a seat — the entry is marked
 * `contested` and the interface says so rather than asserting it.
 */

import { LIRE, USD, type Currency } from "./calendar";
import type { RacketId, SettingId } from "./houses";

/* ------------------------------------------------------------------- the law */

/**
 * What the state can actually do to you this year. These are the numbers the
 * engine reads; the prose beside them is what the intake screen shows.
 */
export interface LawRegime {
  /** Is there a table that settles disputes between houses? */
  commission: boolean;
  /** Conspiracy statute that reaches the boss for what his soldiers did. */
  rico: "none" | "on_the_books" | "in_use";
  /** none = nobody is listening. unlawful = they are, but it cannot be used
   *  in court. warranted = it can, and it will be. */
  surveillance: "none" | "unlawful" | "warranted";
  /** A man who talks can be given a new life somewhere else. */
  witnessProtection: boolean;
  /** Can new members be initiated at all? Closed 1957-1976 in New York. */
  booksOpen: boolean;
  /** 0-100. How unthinkable it is to cooperate. Scales flip chance inversely. */
  omerta: number;
  /** 0-100. How much federal weight is pointed at organised crime. */
  federalAttention: number;
  /** Multiplies evidence accrual per track. Chicago 1920s: the money kills you. */
  evidenceWeight: { physical: number; financial: number; testimonial: number };
  /** One sentence the player reads before they commit. */
  summary: string;
}

/* ---------------------------------------------------------------- the events */

export interface HistoricalEvent {
  /** ISO date. Must fall inside the era. Enforced by assertHistory(). */
  on: string;
  headline: string;
  detail: string;
  certainty?: "documented" | "contested";
  /**
   * What it does to the world when the week arrives. All optional; an event
   * with no effects is atmosphere, and atmosphere is allowed.
   */
  effects?: {
    /** Kill the sitting boss of this house. The succession then plays out. */
    killBossOf?: string;
    /** Permanent shift in the standing between two houses. */
    relation?: { a: string; b: string; to: number };
    /**
     * The house turns on itself: two factions, loyalty scattered, and every
     * man in it forced to be seen choosing. Modelled inside the house rather
     * than as a relation, because a house cannot be at war with itself in a
     * table of standings between houses.
     */
    splitHouse?: string;
    /** Every house takes this much heat. */
    heat?: number;
    /** Change the law regime from this date forward. */
    law?: Partial<LawRegime>;
    /** Rackets that stop paying, and rackets that start. */
    racketsEnd?: RacketId[];
    racketsBegin?: RacketId[];
  };
}

/* ------------------------------------------------------------------ the eras */

export interface Origin {
  id: string;
  name: string;
  blurb: string;
  /** 1985 dollars; converted to period money at intake. */
  purse: number;
  standing: number;
  ledger: { physical: number; financial: number; testimonial: number };
  stats: { competence: number; ambition: number; discretion: number };
  /**
   * Decides whether you can ever be initiated. This is not flavour: in every
   * setting here, the books were closed to men without the right parentage,
   * and an associate who can never be made plays a materially different game.
   */
  heritage: "sicilian" | "italian" | "other";
  /** Which eras this origin makes sense in. Empty means all in the setting. */
  eras?: string[];
}

export interface Era {
  id: string;
  setting: SettingId;
  name: string;
  /** What a newspaper would have called it, if it had known. */
  headline: string;
  /** Opening date. Week 1 is the week containing it. */
  start: string;
  end: string;
  /** Three sentences, maximum. This is the pitch, not the lecture. */
  premise: string;
  /** Houses standing at the opening date, player's options among them. */
  houses: readonly string[];
  /** Standing between houses at the opening date, -100..100. Symmetric. */
  openingRelations: readonly { a: string; b: string; value: number; why: string }[];
  law: LawRegime;
  currency: Currency;
  rackets: readonly RacketId[];
  /** Where a newcomer can plausibly enter. Closed books means associate only. */
  entryRanks: readonly ("associate" | "soldier")[];
  timeline: readonly HistoricalEvent[];
  /** What the player should understand they are signing up for. */
  playingNote: string;
}

/* ===================================================================== NEW YORK */

const CASTELLAMMARESE: Era = {
  id: "nyc_1930_war",
  setting: "nyc",
  name: "The Castellammarese War",
  headline: "Two bosses, and no table to sit at",
  start: "1930-01-15",
  end: "1931-09-30",
  premise:
    "Joe Masseria wants tribute from every Sicilian in New York. The men from Castellammare del Golfo will not pay it. There is no Commission yet, no rule against killing a boss, and no arrangement that survives the year — including the one you are standing inside.",
  houses: ["genovese", "bonanno", "lucchese", "gambino", "colombo"],
  openingRelations: [
    { a: "genovese", b: "bonanno", value: -85, why: "Masseria has marked the Castellammarese as a body, not a faction." },
    { a: "genovese", b: "gambino", value: 55, why: "Mineo came in with Masseria after D'Aquila was shot." },
    { a: "genovese", b: "lucchese", value: -30, why: "Reina was killed in February and his house knows who by." },
    { a: "bonanno", b: "lucchese", value: 35, why: "The house has quietly turned toward Maranzano." },
    { a: "colombo", b: "genovese", value: 20, why: "Profaci pays, says little, and waits." },
    { a: "colombo", b: "bonanno", value: 25, why: "Castellammarese blood, and a wedding between the two." },
  ],
  law: {
    commission: false,
    rico: "none",
    surveillance: "none",
    witnessProtection: false,
    booksOpen: true,
    omerta: 97,
    federalAttention: 8,
    evidenceWeight: { physical: 0.7, financial: 0.5, testimonial: 1.0 },
    summary:
      "Nobody federal is looking. There is no charge for belonging to anything, no protection for a man who talks, and the precinct is paid. What can kill you is a car pulling up.",
  },
  currency: USD(),
  rackets: ["liquor", "beer", "numbers", "bookmaking", "loansharking", "docks", "garment", "extortion"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1930-02-26",
      headline: "Tommy Reina shot dead in the Bronx",
      detail:
        "Killed with a shotgun leaving his aunt's house on Sheridan Avenue. His house is handed to an outsider within days.",
      effects: { heat: 4, relation: { a: "genovese", b: "lucchese", to: -45 } },
    },
    {
      on: "1930-08-15",
      headline: "Peter Morello killed in East Harlem",
      detail: "Masseria's closest counsellor, shot in his office on East 116th Street.",
      effects: { heat: 5 },
    },
    {
      on: "1930-09-09",
      headline: "Joseph Pinzolo killed in the Brokaw Building",
      detail: "The man imposed on the Reina house lasts seven months.",
      effects: { killBossOf: "lucchese" },
    },
    {
      on: "1930-11-05",
      headline: "Alfred Mineo and Steve Ferrigno shot in the Bronx",
      detail: "Ambushed in a courtyard on Pelham Parkway. Masseria loses his strongest ally the same afternoon.",
      effects: { killBossOf: "gambino", heat: 8 },
    },
    {
      on: "1931-04-15",
      headline: "Masseria killed at Coney Island",
      detail:
        "Shot at a restaurant on West 15th Street after lunch. The men who ate with him were not present when it happened.",
      certainty: "documented",
      effects: {
        killBossOf: "genovese",
        heat: 10,
        relation: { a: "genovese", b: "bonanno", to: 30 },
      },
    },
    {
      on: "1931-09-10",
      headline: "Maranzano killed in his office on Park Avenue",
      detail:
        "Four men with badges came up to the ninth floor. Within the year the arrangement he had declared himself the head of is replaced by a table with no head at all.",
      effects: {
        killBossOf: "bonanno",
        law: { commission: true, omerta: 96 },
        heat: 10,
      },
    },
  ],
  playingNote:
    "Nineteen months, and both of the men at the top of the city die inside them. Whichever house you pick, the chair above you empties.",
};

const COMMISSION: Era = {
  id: "nyc_1931_commission",
  setting: "nyc",
  name: "The Commission",
  headline: "Five houses, one table, and eighteen months of liquor left",
  start: "1931-10-01",
  end: "1941-12-31",
  premise:
    "The war is settled and the settlement is structural: five families, fixed borders, and a board that arbitrates instead of shooting. Then in December 1933 the single largest source of income in the country becomes legal again, and every house has to find something else to sell.",
  houses: ["genovese", "gambino", "lucchese", "bonanno", "colombo"],
  openingRelations: [
    { a: "genovese", b: "gambino", value: 40, why: "Luciano put Mangano in the chair." },
    { a: "genovese", b: "lucchese", value: 45, why: "Gagliano and Lucchese backed the winning side." },
    { a: "genovese", b: "bonanno", value: 25, why: "A peace that holds because everybody is tired." },
    { a: "colombo", b: "bonanno", value: 30, why: "Old Castellammarese ties." },
    { a: "colombo", b: "genovese", value: 10, why: "Profaci pays what he owes and no more." },
  ],
  law: {
    commission: true,
    rico: "none",
    surveillance: "none",
    witnessProtection: false,
    booksOpen: true,
    omerta: 96,
    federalAttention: 12,
    evidenceWeight: { physical: 0.8, financial: 0.7, testimonial: 1.1 },
    summary:
      "The Bureau is chasing bank robbers and denies this exists. The danger is a state prosecutor with a stenographer and a grudge — and, after 1940, the discovery that a Brooklyn crew will talk to save itself.",
  },
  currency: USD(),
  rackets: ["liquor", "numbers", "bookmaking", "loansharking", "docks", "garment", "trucking", "unions", "extortion"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1931-10-01",
      headline: "The table sits for the first time",
      detail:
        "Five New York families, plus Chicago and Buffalo. No boss of bosses. Disputes go to the board, and a boss cannot be killed without it.",
      effects: { heat: -6 },
    },
    {
      on: "1933-12-05",
      headline: "Prohibition repealed",
      detail:
        "Utah ratifies the twenty-first amendment. Thirteen years of the easiest money anyone ever made ends on a Tuesday.",
      effects: { racketsEnd: ["liquor", "beer"], racketsBegin: ["unions", "garment", "trucking"] },
    },
    {
      on: "1935-10-23",
      headline: "Dutch Schultz shot in Newark",
      detail:
        "He had asked the board for permission to kill the special prosecutor and been refused. He said he would do it anyway.",
      effects: { heat: 6 },
    },
    {
      on: "1936-06-07",
      headline: "Luciano convicted",
      detail: "Thirty to fifty years on sixty-two counts of compulsory prostitution. The house does not stop running.",
      effects: { killBossOf: "genovese", heat: 9, law: { federalAttention: 20 } },
    },
    {
      on: "1937-09-01",
      headline: "Genovese leaves for Italy",
      detail: "Ahead of a murder indictment. Frank Costello takes the chair in his absence and keeps it for twenty years.",
    },
    {
      on: "1940-03-25",
      headline: "A Brownsville crew starts talking",
      detail:
        "The murder-for-hire operation the papers name Murder Inc. comes apart when one of its own begins giving evidence in exchange for his life.",
      effects: { heat: 14, law: { omerta: 90, federalAttention: 26 } },
    },
    {
      on: "1941-11-12",
      headline: "The witness goes out of a hotel window",
      detail:
        "Held under police guard on the sixth floor of the Half Moon in Coney Island. The cases that depended on him collapse.",
      certainty: "contested",
      effects: { law: { omerta: 94 }, heat: 8 },
    },
  ],
  playingNote:
    "The one era where the structure is being built rather than defended. It is also the only one where your best earner becomes worthless overnight on a date you can see coming.",
};

const APALACHIN: Era = {
  id: "nyc_1950_apalachin",
  setting: "nyc",
  name: "Kefauver to Apalachin",
  headline: "The decade the thing was discovered to exist",
  start: "1950-05-10",
  end: "1959-12-31",
  premise:
    "A Senate committee puts the rackets on television, the Bureau insists there is no national organisation, and then sixty men in overcoats run into the woods in upstate New York and the argument ends. By December 1957 the books are closed and nobody new is being made.",
  houses: ["genovese", "gambino", "lucchese", "bonanno", "colombo"],
  openingRelations: [
    { a: "gambino", b: "lucchese", value: 60, why: "The two houses are closer than either is to the table." },
    { a: "genovese", b: "gambino", value: 15, why: "Costello and Anastasia are friendly; the men beneath them are not." },
    { a: "genovese", b: "bonanno", value: 25, why: "Bonanno votes with Costello at the table." },
    { a: "colombo", b: "gambino", value: 5, why: "Profaci's tribute demands are resented outside his house as well as in it." },
    { a: "lucchese", b: "bonanno", value: 20, why: "Business." },
  ],
  law: {
    commission: true,
    rico: "none",
    surveillance: "unlawful",
    witnessProtection: false,
    booksOpen: true,
    omerta: 93,
    federalAttention: 15,
    evidenceWeight: { physical: 0.9, financial: 0.9, testimonial: 1.2 },
    summary:
      "Microphones are going into clubs and kitchens, and none of it can be used in a courtroom. What it can do is tell the government exactly who you are — which turns out to matter more, later.",
  },
  currency: USD(),
  rackets: ["numbers", "bookmaking", "loansharking", "docks", "garment", "trucking", "unions", "heroin", "extortion"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1951-03-12",
      headline: "The hearings go out live",
      detail:
        "A Senate committee televises its New York sessions. One witness refuses to be filmed above the collar, so the cameras stay on his hands.",
      effects: { heat: 7, law: { federalAttention: 24 } },
    },
    {
      on: "1951-04-19",
      headline: "Vincent Mangano cannot be found",
      detail:
        "His brother's body turns up in Sheepshead Bay. His does not. His underboss of twenty years takes the house and is confirmed in it.",
      effects: { killBossOf: "gambino", heat: 6 },
    },
    {
      on: "1957-05-02",
      headline: "Costello shot in his lobby",
      detail:
        "A single round grazes his scalp on Central Park West. He declines to identify anyone and shortly afterwards stops being boss.",
      effects: { killBossOf: "genovese", heat: 8 },
    },
    {
      on: "1957-10-25",
      headline: "Anastasia killed in a barber's chair",
      detail: "The Park Sheraton, mid-morning, two men in scarves. Nobody is ever convicted of it.",
      effects: { killBossOf: "gambino", heat: 12 },
    },
    {
      on: "1957-11-14",
      headline: "Apalachin",
      detail:
        "A state trooper notices the traffic outside a house near Binghamton. Sixty-odd men are stopped, most in expensive coats, several in the hedges. The denial that any of this exists becomes impossible to maintain.",
      effects: {
        heat: 22,
        law: { federalAttention: 62, omerta: 91 },
      },
    },
    {
      on: "1957-12-15",
      headline: "The books are closed",
      detail:
        "No new members, anywhere, indefinitely. An associate is now an associate for as long as the order stands — which turns out to be nineteen years.",
      effects: { law: { booksOpen: false } },
    },
    {
      on: "1959-04-17",
      headline: "Genovese convicted on narcotics",
      detail: "Fifteen years. He continues to run the house from Atlanta federal penitentiary.",
      effects: { heat: 6 },
    },
  ],
  playingNote:
    "Start before November 1957 and you can still be made. Start after it and you cannot — not in this era, and not in the next one either.",
};

const BANANA_WAR: Era = {
  id: "nyc_1963_valachi",
  setting: "nyc",
  name: "Valachi and the Banana War",
  headline: "The first man to say the name out loud",
  start: "1963-09-01",
  end: "1972-12-31",
  premise:
    "A soldier facing a life sentence sits in front of a Senate committee and describes the whole structure — the induction, the ranks, the rules — on national television. Within a year one family is at war with itself, and by 1970 Congress has written a law specifically shaped to the thing he described.",
  houses: ["genovese", "gambino", "lucchese", "bonanno", "colombo"],
  openingRelations: [
    { a: "gambino", b: "lucchese", value: 65, why: "Married into each other; they vote as one." },
    { a: "gambino", b: "bonanno", value: -25, why: "Bonanno is suspected of plotting against two sitting bosses." },
    { a: "lucchese", b: "bonanno", value: -30, why: "The same plot, the same suspicion." },
    { a: "colombo", b: "gambino", value: 35, why: "The Gambinos backed the men who took the house from Magliocco." },
    { a: "genovese", b: "gambino", value: 20, why: "A working peace while Genovese is inside." },
  ],
  law: {
    commission: true,
    rico: "none",
    surveillance: "unlawful",
    witnessProtection: false,
    booksOpen: false,
    omerta: 87,
    federalAttention: 68,
    evidenceWeight: { physical: 1.0, financial: 1.0, testimonial: 1.3 },
    summary:
      "The government now knows what it is looking at and has no statute that fits it. That changes in 1968, when a bug becomes admissible, and again in 1970, when belonging becomes a crime in itself.",
  },
  currency: USD(),
  rackets: ["numbers", "bookmaking", "loansharking", "docks", "garment", "trucking", "unions", "heroin", "construction", "extortion"],
  entryRanks: ["associate"],
  timeline: [
    {
      on: "1963-10-01",
      headline: "Valachi testifies",
      detail:
        "A soldier gives the Senate the induction ceremony, the ranks, the rules and several hundred names. Every man in the room afterwards is a name in a file.",
      effects: { heat: 16, law: { omerta: 84, federalAttention: 74 } },
    },
    {
      on: "1963-12-28",
      headline: "Joseph Magliocco dies of a heart attack",
      detail:
        "Deposed by the table in the autumn for a plot against two other bosses, fined fifty thousand dollars and told to retire. He was dead inside four months, and the house takes a new name.",
      effects: { killBossOf: "colombo" },
    },
    {
      on: "1964-10-21",
      headline: "Joseph Bonanno taken off a Park Avenue street",
      detail:
        "Two men put him into a car on the night before he was to appear before a grand jury. He reappears nineteen months later. What happened in between is disputed to this day.",
      certainty: "contested",
      effects: { heat: 8, relation: { a: "bonanno", b: "gambino", to: -55 } },
    },
    {
      on: "1966-01-28",
      headline: "Shooting on Troutman Street",
      detail: "A sit-down between the two Bonanno factions turns into a gunfight in a Brooklyn restaurant.",
      effects: { heat: 10 },
    },
    {
      on: "1968-06-19",
      headline: "A bug becomes evidence",
      detail:
        "The Omnibus Crime Control Act lets a judge authorise electronic surveillance and lets what it catches into a courtroom. Everything said in a social club from here on is a potential exhibit.",
      effects: { law: { surveillance: "warranted" }, heat: 6 },
    },
    {
      on: "1970-10-15",
      headline: "RICO signed",
      detail:
        "The Organized Crime Control Act makes running an enterprise through a pattern of crimes a federal offence, and creates a programme to relocate witnesses. Neither is used against a family for a decade.",
      effects: { law: { rico: "on_the_books", witnessProtection: true } },
    },
    {
      on: "1971-06-28",
      headline: "Joe Colombo shot at Columbus Circle",
      detail:
        "At a rally he organised himself, in front of press cameras. He lives another seven years without speaking.",
      effects: { killBossOf: "colombo", heat: 14 },
    },
    {
      on: "1972-04-07",
      headline: "Joey Gallo killed at a clam house on Hester Street",
      detail: "His birthday, four in the morning, the family at the table.",
      effects: { heat: 9 },
    },
  ],
  playingNote:
    "The books are shut for the whole era. You will not be made, no matter how well you earn — so this is the run where you find out what an associate can actually take.",
};

const RICO_ERA: Era = {
  id: "nyc_1976_rico",
  setting: "nyc",
  name: "The books reopen",
  headline: "Nineteen years of associates, all made at once",
  start: "1976-06-01",
  end: "1986-12-31",
  premise:
    "Membership opens again after nineteen years and a generation of men who were promised nothing get straightened out together. In the same decade an agent works inside a family for six years, a microphone goes into a boss's kitchen, and a prosecutor decides to indict the table itself rather than the men at it.",
  houses: ["genovese", "gambino", "lucchese", "bonanno", "colombo"],
  openingRelations: [
    { a: "gambino", b: "lucchese", value: 55, why: "Still the closest pairing at the table." },
    { a: "gambino", b: "genovese", value: 30, why: "Both invested in the same concrete." },
    { a: "bonanno", b: "gambino", value: -20, why: "The Bonannos are a problem nobody wants to own." },
    { a: "colombo", b: "gambino", value: 25, why: "Persico is inside more than he is out." },
    { a: "lucchese", b: "genovese", value: 35, why: "The concrete club: four houses, one price." },
  ],
  law: {
    commission: true,
    rico: "in_use",
    surveillance: "warranted",
    witnessProtection: true,
    booksOpen: true,
    omerta: 62,
    federalAttention: 88,
    evidenceWeight: { physical: 1.0, financial: 1.3, testimonial: 1.5 },
    summary:
      "Everything you say near a wall is admissible, everything your crew does is chargeable to you, and a man facing thirty years can now be given a new name in another state. All three of those are new.",
  },
  currency: USD(),
  rackets: ["bookmaking", "loansharking", "unions", "construction", "waste", "trucking", "heroin", "garment", "extortion"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1976-09-01",
      headline: "A jewel thief starts coming around",
      detail:
        "He is introduced by a man who vouches for him. He is an FBI agent, and he stays for six years.",
      certainty: "documented",
    },
    {
      on: "1976-10-15",
      headline: "Carlo Gambino dies at home",
      detail:
        "The seat goes to his brother-in-law rather than to the underboss, and the half of the house that wanted the underboss remembers it for nine years.",
      effects: { killBossOf: "gambino" },
    },
    {
      on: "1976-11-01",
      headline: "The books reopen",
      detail: "Nineteen years of waiting ends. Hundreds of men are made across the five houses in a matter of months.",
      effects: { law: { booksOpen: true } },
    },
    {
      on: "1979-07-12",
      headline: "Carmine Galante shot on a restaurant patio",
      detail: "Knickerbocker Avenue, lunchtime, in the open air with the cigar still in his teeth.",
      effects: { killBossOf: "bonanno", heat: 12 },
    },
    {
      on: "1981-05-05",
      headline: "Three Bonanno captains disappear",
      detail:
        "Called to a meeting about the leadership of their own house. One body is found in a vacant lot in Queens some weeks later; the others take eighteen years.",
      effects: { heat: 14, relation: { a: "bonanno", b: "gambino", to: -40 } },
    },
    {
      on: "1981-07-26",
      headline: "The agent surfaces",
      detail:
        "Six years of testimony, and a family so compromised that the table removes it from the Commission.",
      effects: { heat: 20, law: { omerta: 55, federalAttention: 92 } },
    },
    {
      on: "1983-03-01",
      headline: "A microphone in the boss's kitchen",
      detail:
        "Installed in a house on Staten Island. Two years of the man's own conversation about who is earning and who is not.",
      effects: { heat: 10, law: { evidenceWeight: { physical: 1.0, financial: 1.4, testimonial: 1.6 } } },
    },
    {
      on: "1985-02-25",
      headline: "The table itself is indicted",
      detail:
        "The Commission is charged as a criminal enterprise: not the crimes of individual men, but the existence of the arrangement.",
      effects: { heat: 18 },
    },
    {
      on: "1985-12-16",
      headline: "Castellano and Bilotti shot outside a steakhouse",
      detail:
        "East 46th Street, quarter to six, in the Christmas traffic. It is done without the table's permission, which has consequences that outlast everyone involved.",
      effects: { killBossOf: "gambino", heat: 20 },
    },
    {
      on: "1986-11-19",
      headline: "The Commission case verdicts",
      detail: "Eight defendants convicted. The sentences run to a hundred years apiece.",
      effects: { heat: 24, law: { omerta: 48 } },
    },
  ],
  playingNote:
    "The richest era to earn in and the worst one to survive. Every advantage you build here is also a paragraph in somebody's indictment.",
};

const THE_FALL: Era = {
  id: "nyc_1987_fall",
  setting: "nyc",
  name: "The tape recorder",
  headline: "When the underboss talks, the era is over",
  start: "1987-01-01",
  end: "1993-06-30",
  premise:
    "The men who ran the city in the seventies are serving hundred-year sentences and the men replacing them are being recorded in the hallway. In November 1991 an underboss of the largest family decides to testify against his own boss, and the code that held all of this together for sixty years stops holding.",
  houses: ["genovese", "gambino", "lucchese", "bonanno", "colombo"],
  openingRelations: [
    { a: "gambino", b: "genovese", value: -35, why: "One house killed a boss without asking, and the other has not forgotten." },
    { a: "gambino", b: "lucchese", value: 20, why: "Working relations, thin ones." },
    { a: "lucchese", b: "genovese", value: 25, why: "Both are quietly appalled by the publicity." },
    { a: "colombo", b: "genovese", value: -10, why: "A house one bad month away from splitting in half, and everyone can see it." },
    { a: "bonanno", b: "gambino", value: -15, why: "Still outside the table." },
  ],
  law: {
    commission: true,
    rico: "in_use",
    surveillance: "warranted",
    witnessProtection: true,
    booksOpen: true,
    omerta: 38,
    federalAttention: 95,
    evidenceWeight: { physical: 1.0, financial: 1.4, testimonial: 1.8 },
    summary:
      "Cooperation is no longer unthinkable — it is the standard move for a man facing a life sentence. Assume at least one person at every table you sit at will eventually be a witness.",
  },
  currency: USD(),
  rackets: ["bookmaking", "loansharking", "construction", "waste", "unions", "extortion", "trucking"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1987-03-13",
      headline: "An acquittal in Brooklyn",
      detail:
        "The boss of the largest family walks out of a federal racketeering trial. It is later established that a juror had been paid.",
      certainty: "documented",
      effects: { heat: -6 },
    },
    {
      on: "1990-12-11",
      headline: "Arrests at a social club on Mulberry Street",
      detail:
        "The boss, the underboss and the consigliere taken together. The government has years of hallway recordings of the boss discussing all three of them.",
      effects: { heat: 16 },
    },
    {
      on: "1991-06-21",
      headline: "A house splits in two",
      detail:
        "A dispute over who is acting boss becomes a shooting war between two factions of the same family. It runs for two years and produces a dozen bodies and a great many witnesses.",
      effects: { heat: 14, splitHouse: "colombo" },
    },
    {
      on: "1991-11-08",
      headline: "The underboss agrees to testify",
      detail:
        "He has heard his own boss on tape discussing him. He admits to nineteen murders and takes the stand.",
      effects: { heat: 22, law: { omerta: 28 } },
    },
    {
      on: "1992-04-02",
      headline: "Convicted on all counts",
      detail: "Life without parole. The largest family in the country is run from a cell in Illinois.",
      effects: { killBossOf: "gambino", heat: 18 },
    },
  ],
  playingNote:
    "The shortest odds in the game. Everything still pays, and almost nobody in this era finishes it at liberty.",
};

/* ====================================================================== CHICAGO */

const BEER_WAR: Era = {
  id: "chi_1924_beer_war",
  setting: "chicago",
  name: "The Beer War",
  headline: "Twelve breweries, six gangs, and a mayor who is on the payroll",
  start: "1924-10-01",
  end: "1931-10-31",
  premise:
    "This is not five families and a table. It is a city carved into beer territories by half a dozen outfits who are not related to each other, do not share a code, and have no arbitration but the Thompson gun. The police are bought and the coroner is patient. What finally ends it is an accountant.",
  houses: ["outfit", "north_side", "genna", "aiello", "saltis"],
  openingRelations: [
    { a: "outfit", b: "north_side", value: -80, why: "O'Banion set Torrio up for a brewery raid and has just been shot for it." },
    { a: "outfit", b: "genna", value: 30, why: "Allies of convenience over the Sicilian alcohol trade." },
    { a: "outfit", b: "aiello", value: -50, why: "A standing price on Capone's life." },
    { a: "north_side", b: "genna", value: -60, why: "Territory and a grudge that predates both." },
    { a: "north_side", b: "aiello", value: 40, why: "The enemy of the enemy." },
    { a: "outfit", b: "saltis", value: 15, why: "Saltis takes beer from whoever is winning." },
  ],
  law: {
    commission: false,
    rico: "none",
    surveillance: "none",
    witnessProtection: false,
    booksOpen: true,
    omerta: 55,
    federalAttention: 35,
    evidenceWeight: { physical: 0.5, financial: 2.0, testimonial: 0.7 },
    summary:
      "The police and the ward bosses are an expense, not a threat, and witnesses in this city change their minds. What nobody has priced in is the Treasury, which does not need a witness — only your bank deposits and your ledger.",
  },
  currency: USD(),
  rackets: ["beer", "liquor", "bookmaking", "extortion", "unions", "vending", "kidnapping"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1924-11-10",
      headline: "Dean O'Banion shot in his flower shop",
      detail: "Three men shake his hand in the shop on North State Street. Everything for the next five years follows from this.",
      effects: { killBossOf: "north_side", heat: 8 },
    },
    {
      on: "1925-01-24",
      headline: "Torrio shot outside his apartment",
      detail: "He survives, serves a short sentence, and hands the city to a twenty-six-year-old.",
      effects: { killBossOf: "outfit" },
    },
    {
      on: "1925-07-08",
      headline: "The third Genna brother killed in seven weeks",
      detail: "The family that supplied half the city's alcohol is finished by the end of the summer.",
      effects: { killBossOf: "genna", heat: 10 },
    },
    {
      on: "1926-04-27",
      headline: "An assistant state's attorney shot in Cicero",
      detail:
        "Killed alongside two known beer runners he had been drinking with. The public reaction is unlike anything a gangland killing has produced before.",
      effects: { heat: 18, law: { federalAttention: 48 } },
    },
    {
      on: "1926-09-20",
      headline: "A motorcade shoots up the Hawthorne Hotel",
      detail: "Eight cars, a thousand rounds, in daylight, at lunchtime, and nobody is killed.",
      effects: { heat: 12 },
    },
    {
      on: "1926-10-11",
      headline: "Hymie Weiss killed outside Holy Name Cathedral",
      detail: "Shot from a rented room across the street.",
      effects: { killBossOf: "north_side", heat: 9 },
    },
    {
      on: "1929-02-14",
      headline: "Seven men shot in a garage on North Clark Street",
      detail:
        "Lined up against a wall by men in police uniform. The intended target was not there. The North Side never recovers, and the national attention never leaves.",
      effects: { heat: 30, law: { federalAttention: 72 } },
    },
    {
      on: "1930-10-23",
      headline: "Joseph Aiello shot on West North Avenue",
      detail: "Fifty-nine bullets. The Unione presidency stops being contested.",
      effects: { killBossOf: "aiello" },
    },
    {
      on: "1931-10-17",
      headline: "Convicted of tax evasion",
      detail:
        "Not murder, not extortion, not the beer. Eleven years for what he failed to declare, on the evidence of a ledger and a bank account.",
      effects: { killBossOf: "outfit", heat: 20 },
    },
  ],
  playingNote:
    "The only setting where testimony barely matters and paper is lethal. Launder early. Everyone who did not is in Atlanta by 1932.",
};

/* ====================================================================== PALERMO */

const MATTANZA: Era = {
  id: "pal_1978_mattanza",
  setting: "palermo",
  name: "La mattanza",
  headline: "A hill town takes a city of seven hundred thousand",
  start: "1978-01-15",
  end: "1983-12-31",
  premise:
    "Palermo's old clans are rich on heroin and confident in a commission that has always contained them. The Corleonesi are a provincial family with no seat worth having and no interest in containment. Over five years they kill their way through every capomandamento above them, and the state loses a general, a prosecutor and a party secretary trying to stop it.",
  houses: ["corleonesi", "bontate", "inzerillo", "badalamenti", "greco", "riccobono"],
  openingRelations: [
    { a: "bontate", b: "inzerillo", value: 70, why: "Blood, and the same heroin route to New York." },
    { a: "bontate", b: "badalamenti", value: 55, why: "The old commission majority." },
    { a: "corleonesi", b: "greco", value: 60, why: "Ciaculli votes with Corleone and does not say so." },
    { a: "corleonesi", b: "bontate", value: -30, why: "Contempt in one direction, patience in the other." },
    { a: "corleonesi", b: "badalamenti", value: -55, why: "Badalamenti has just been expelled from the commission." },
    { a: "riccobono", b: "bontate", value: 25, why: "Nominally with the Palermo clans." },
    { a: "riccobono", b: "corleonesi", value: 20, why: "Quietly with Corleone since before it was safe to be." },
  ],
  law: {
    commission: true,
    rico: "none",
    surveillance: "none",
    witnessProtection: false,
    booksOpen: true,
    omerta: 98,
    federalAttention: 40,
    evidenceWeight: { physical: 0.8, financial: 0.6, testimonial: 0.5 },
    summary:
      "Until September 1982 there is no offence of belonging to a mafia association and no power to look at your bank. There is also, in practice, no such thing as a witness. The threat here is not the courtroom — it is the other clans.",
  },
  currency: LIRE(850),
  rackets: ["heroin", "public_works", "construction", "extortion", "tobacco_smuggling"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1978-03-01",
      headline: "Badalamenti expelled from the commission",
      detail: "Removed by vote rather than by gunfire, which is unusual, and does not set a precedent.",
      effects: { relation: { a: "badalamenti", b: "corleonesi", to: -70 } },
    },
    {
      on: "1978-05-09",
      headline: "A radio broadcaster killed at Cinisi",
      detail:
        "He had spent years naming the local boss on air. His body is placed on a railway line with explosives to make it look like something else.",
      effects: { heat: 6 },
    },
    {
      on: "1979-07-21",
      headline: "The head of the Palermo flying squad shot",
      detail: "Killed in a bar in front of his family. He had been following the heroin money.",
      effects: { heat: 12, law: { federalAttention: 52 } },
    },
    {
      on: "1980-08-06",
      headline: "The chief prosecutor of Palermo killed",
      detail: "Shot on the Via Cavour while walking alone. He had signed eighty arrest warrants against the Inzerillos.",
      effects: { heat: 14 },
    },
    {
      on: "1981-04-23",
      headline: "Stefano Bontate shot on his birthday",
      detail:
        "Killed in his car on the way home from his own party. The war does not begin here so much as become visible here.",
      effects: {
        killBossOf: "bontate",
        heat: 20,
        relation: { a: "corleonesi", b: "bontate", to: -95 },
      },
    },
    {
      on: "1981-05-11",
      headline: "Salvatore Inzerillo killed",
      detail:
        "Eighteen days later, with the same weapon. His house is not merely defeated; the survivors are put on planes to America and told never to come back.",
      effects: { killBossOf: "inzerillo", heat: 18, relation: { a: "corleonesi", b: "inzerillo", to: -95 } },
    },
    {
      on: "1982-04-30",
      headline: "A party secretary shot in Palermo",
      detail:
        "He had drafted the bill that would make mafia association a crime and allow the courts to seize assets.",
      effects: { heat: 16 },
    },
    {
      on: "1982-09-03",
      headline: "The prefect killed with his wife on Via Carini",
      detail:
        "A general sent from Rome a hundred days earlier to deal with this. The public reaction forces the bill through parliament in ten days.",
      effects: { heat: 26, law: { federalAttention: 78 } },
    },
    {
      on: "1982-09-13",
      headline: "Mafia association becomes a crime",
      detail:
        "Membership itself is now chargeable, and for the first time investigators may examine bank records and confiscate property.",
      effects: {
        law: {
          rico: "on_the_books",
          evidenceWeight: { physical: 0.9, financial: 1.3, testimonial: 0.7 },
        },
      },
    },
    {
      on: "1982-11-30",
      headline: "Riccobono killed at a lunch in his honour",
      detail:
        "He had fought on the winning side for eighteen months. His crew is killed the same afternoon, across the city, by appointment.",
      effects: { killBossOf: "riccobono", heat: 12 },
    },
  ],
  playingNote:
    "There is no promotion ladder to climb here that the Corleonesi will not shorten from above. The question is not how high you get; it is which side you are standing on in April 1981.",
};

const MAXI: Era = {
  id: "pal_1984_maxiprocesso",
  setting: "palermo",
  name: "Il maxiprocesso",
  headline: "One man talks, and three hundred and forty-two go down",
  start: "1984-06-01",
  end: "1993-06-30",
  premise:
    "A defeated boss extradited from Brazil decides that the men who killed his sons are no longer Cosa Nostra and that he is therefore released from silence. What he tells one investigating magistrate becomes a courtroom built inside a prison, and the state wins — after which the winners of the last war begin killing judges in the street.",
  houses: ["corleonesi", "greco", "resuttana", "sangiuseppejato", "portanuova"],
  openingRelations: [
    { a: "corleonesi", b: "greco", value: 55, why: "The chairmanship is theirs in all but name." },
    { a: "corleonesi", b: "resuttana", value: 65, why: "Corleone's oldest foothold inside the city." },
    { a: "corleonesi", b: "sangiuseppejato", value: 70, why: "The clan that supplies the men who do the work." },
    { a: "corleonesi", b: "portanuova", value: 40, why: "Cal\u00f2 moves the money and asks nothing about the bodies." },
    { a: "greco", b: "portanuova", value: 30, why: "Business, conducted politely." },
    { a: "resuttana", b: "sangiuseppejato", value: 35, why: "Two clans on the same side of a finished war." },
  ],
  law: {
    commission: true,
    rico: "in_use",
    surveillance: "warranted",
    witnessProtection: true,
    booksOpen: true,
    omerta: 60,
    federalAttention: 90,
    evidenceWeight: { physical: 1.0, financial: 1.3, testimonial: 1.7 },
    summary:
      "The pentito is now a fixture of Italian criminal procedure, association is an offence, assets can be taken, and there is a purpose-built bunker courtroom waiting. Silence has stopped being free.",
  },
  currency: LIRE(1500),
  rackets: ["heroin", "public_works", "construction", "extortion"],
  entryRanks: ["associate", "soldier"],
  timeline: [
    {
      on: "1984-07-16",
      headline: "Buscetta begins talking",
      detail:
        "Extradited from Brazil after a suicide attempt. He describes the commission, the rules, the killings and the men — the first insider account the Italian state has ever had.",
      effects: { heat: 20, law: { omerta: 52 } },
    },
    {
      on: "1984-09-29",
      headline: "Three hundred and sixty-six warrants served in one night",
      detail: "Palermo wakes to the largest single mafia operation in the history of the republic.",
      effects: { heat: 24 },
    },
    {
      on: "1986-02-10",
      headline: "The maxi trial opens",
      detail:
        "A bunker courtroom built inside the walls of Ucciardone prison. Four hundred and seventy-five defendants, thirty of them in cages, and a trial that will run for twenty-two months.",
      effects: { heat: 18 },
    },
    {
      on: "1987-12-16",
      headline: "The verdicts",
      detail: "Three hundred and forty-two convictions, nineteen life sentences. The organisation's existence is now a finding of fact.",
      effects: { heat: 22, law: { omerta: 48 } },
    },
    {
      on: "1992-01-30",
      headline: "The Court of Cassation upholds it",
      detail:
        "The last appeal fails. The life sentences become final, and the political guarantees that were supposed to prevent this are shown to be worthless.",
      effects: { heat: 20 },
    },
    {
      on: "1992-03-12",
      headline: "A politician shot in Mondello",
      detail: "The man held responsible for the guarantees that did not hold.",
      effects: { heat: 16 },
    },
    {
      on: "1992-05-23",
      headline: "The motorway at Capaci",
      detail:
        "Half a tonne of explosive under the carriageway kills the investigating magistrate, his wife and three escort officers.",
      effects: { heat: 40, law: { federalAttention: 99, omerta: 40 } },
    },
    {
      on: "1992-07-19",
      headline: "Via D'Amelio",
      detail:
        "A car bomb outside his mother's building kills the second magistrate and five officers, fifty-seven days after the first.",
      effects: { heat: 40 },
    },
    {
      on: "1993-01-15",
      headline: "Riina arrested in Palermo",
      detail: "Twenty-three years a fugitive, stopped in traffic on the Via Leonardo da Vinci.",
      effects: { killBossOf: "corleonesi", heat: 30 },
    },
  ],
  playingNote:
    "Begin here and you are already inside the consequences of a war you did not fight. Two thirds of the men above you will be in a cage in the Ucciardone by 1986.",
};

export const ERAS: readonly Era[] = [
  CASTELLAMMARESE,
  COMMISSION,
  APALACHIN,
  BANANA_WAR,
  RICO_ERA,
  THE_FALL,
  BEER_WAR,
  MATTANZA,
  MAXI,
];

export const eraById = (id: string): Era | undefined => ERAS.find((e) => e.id === id);

/* ---------------------------------------------------------------- the settings */

export interface Setting {
  id: SettingId;
  name: string;
  where: string;
  /** What each rung is called out loud here. The ladder is the same shape. */
  rankLabels: Record<"associate" | "soldier" | "capo" | "underboss" | "boss", string>;
  consigliereLabel: string;
  /** What a house is called. "family", "outfit", "clan" — not interchangeable. */
  houseWord: string;
  /** Who may be initiated. The single most consequential rule in the setting. */
  madeRequires: "sicilian" | "italian" | "none";
  note: string;
}

export const SETTINGS: readonly Setting[] = [
  {
    id: "nyc",
    name: "New York",
    where: "the five boroughs",
    rankLabels: {
      associate: "associate",
      soldier: "soldier",
      capo: "caporegime",
      underboss: "underboss",
      boss: "boss",
    },
    consigliereLabel: "consigliere",
    houseWord: "family",
    madeRequires: "italian",
    note: "Five families, fixed borders, and after 1931 a board that arbitrates between them.",
  },
  {
    id: "chicago",
    name: "Chicago",
    where: "Cook County",
    rankLabels: {
      associate: "hoodlum",
      soldier: "gunman",
      capo: "street boss",
      underboss: "underboss",
      boss: "boss",
    },
    consigliereLabel: "counsel",
    houseWord: "outfit",
    madeRequires: "none",
    note: "Not families but syndicates, and not Sicilian but everyone. The Irish, the Poles and the Jews are inside the business, not adjacent to it.",
  },
  {
    id: "palermo",
    name: "Palermo",
    where: "the province",
    rankLabels: {
      associate: "avvicinato",
      soldier: "uomo d'onore",
      capo: "capodecina",
      underboss: "sottocapo",
      boss: "rappresentante",
    },
    consigliereLabel: "consigliere",
    houseWord: "clan",
    madeRequires: "sicilian",
    note: "A clan holds a territory — a mandamento — and three of them send a man to the commission. The word 'family' here means the actual one as often as not.",
  },
];

export const settingById = (id: SettingId): Setting => SETTINGS.find((s) => s.id === id)!;

/* ----------------------------------------------------------------- the origins */

/**
 * Where you came from. Era-scoped, because "union hand" means something
 * different in 1931 and 1985, and "off the boat" means nothing at all in 1990.
 *
 * `heritage` is the one that bites. In New York and Palermo a man without the
 * right parents cannot be initiated at any price, which means those origins are
 * playing a permanently different game: better earning, no ladder.
 */
export const ORIGINS: readonly Origin[] = [
  {
    id: "corner",
    name: "Corner kid",
    blurb: "Nothing but nerve and a neighbourhood that owes you nothing.",
    purse: 3000,
    standing: 0,
    ledger: { physical: 0, financial: 0, testimonial: 0 },
    stats: { competence: 4, ambition: 10, discretion: -6 },
    heritage: "italian",
  },
  {
    id: "greenhorn",
    name: "Off the boat",
    blurb:
      "Sicilian-born, barely any English, and vouched for by a man in the old country. Nobody here knows you, which cuts both ways.",
    purse: 800,
    standing: 4,
    ledger: { physical: 0, financial: 0, testimonial: 0 },
    stats: { competence: 0, ambition: 6, discretion: 14 },
    heritage: "sicilian",
    eras: ["nyc_1930_war", "nyc_1931_commission", "chi_1924_beer_war", "nyc_1976_rico"],
  },
  {
    id: "rumrunner",
    name: "Ran a truck",
    blurb: "Two years hauling Canadian whisky south. You know every scale house and half the state police.",
    purse: 6500,
    standing: 12,
    ledger: { physical: 3, financial: 2, testimonial: 0 },
    stats: { competence: 8, ambition: 0, discretion: 2 },
    heritage: "other",
    eras: ["nyc_1930_war", "nyc_1931_commission", "chi_1924_beer_war"],
  },
  {
    id: "ward",
    name: "Ward heeler",
    blurb: "You delivered a precinct twice. Aldermen take your call and so does the desk sergeant.",
    purse: 4000,
    standing: 22,
    ledger: { physical: 0, financial: 6, testimonial: 2 },
    stats: { competence: 2, ambition: -2, discretion: 10 },
    heritage: "other",
    eras: ["chi_1924_beer_war", "nyc_1931_commission"],
  },
  {
    id: "union",
    name: "Union hand",
    blurb: "Ten years on the docks. People take your call, which is worth more than cash.",
    purse: 5000,
    standing: 18,
    ledger: { physical: 0, financial: 0, testimonial: 4 },
    stats: { competence: 0, ambition: -4, discretion: 8 },
    heritage: "italian",
  },
  {
    id: "bookmaker",
    name: "Bookmaker's son",
    blurb: "You started with money. The books it came from are still out there.",
    purse: 11000,
    standing: 6,
    ledger: { physical: 0, financial: 14, testimonial: 0 },
    stats: { competence: 6, ambition: 0, discretion: 2 },
    heritage: "italian",
  },
  {
    id: "veteran",
    name: "Back from the war",
    blurb: "Four years, a Bronze Star and a habit of not flinching. The neighbourhood remembers you as a kid.",
    purse: 2200,
    standing: 14,
    ledger: { physical: 0, financial: 0, testimonial: 0 },
    stats: { competence: 12, ambition: 2, discretion: 4 },
    heritage: "italian",
    eras: ["nyc_1950_apalachin"],
  },
  {
    id: "freight",
    name: "Airport freight",
    blurb: "You load the cargo sheds at Kennedy. You know what is in every container before it lands.",
    purse: 4200,
    standing: 10,
    ledger: { physical: 2, financial: 4, testimonial: 2 },
    stats: { competence: 6, ambition: 4, discretion: 0 },
    heritage: "italian",
    eras: ["nyc_1963_valachi", "nyc_1976_rico"],
  },
  {
    id: "local",
    name: "Business agent",
    blurb: "You run a construction local. Nothing gets poured in three boroughs without your say.",
    purse: 15000,
    standing: 26,
    ledger: { physical: 0, financial: 18, testimonial: 6 },
    stats: { competence: 4, ambition: -2, discretion: 6 },
    heritage: "italian",
    eras: ["nyc_1976_rico", "nyc_1987_fall"],
  },
  {
    id: "wiseguy_kid",
    name: "Somebody's nephew",
    blurb: "Your uncle was straightened out in 1957. Doors open for you that you did not knock on, and so do files.",
    purse: 7000,
    standing: 30,
    ledger: { physical: 0, financial: 0, testimonial: 12 },
    stats: { competence: -2, ambition: 8, discretion: -4 },
    heritage: "italian",
    eras: ["nyc_1976_rico", "nyc_1987_fall", "nyc_1963_valachi"],
  },
  {
    id: "muratore",
    name: "Builder's son",
    blurb: "Your father poured half of the Conca d'Oro under the sack of Palermo. You know which councillor signed what.",
    purse: 5000,
    standing: 16,
    ledger: { physical: 0, financial: 10, testimonial: 0 },
    stats: { competence: 4, ambition: 2, discretion: 6 },
    heritage: "sicilian",
    eras: ["pal_1978_mattanza", "pal_1984_maxiprocesso"],
  },
  {
    id: "contrabbandiere",
    name: "Cigarette runner",
    blurb: "Ten years of tobacco off the boats at night. The same routes now carry something worth four hundred times more.",
    purse: 9000,
    standing: 12,
    ledger: { physical: 4, financial: 6, testimonial: 0 },
    stats: { competence: 8, ambition: 4, discretion: 2 },
    heritage: "sicilian",
    eras: ["pal_1978_mattanza", "pal_1984_maxiprocesso"],
  },
  {
    id: "picciotto",
    name: "Raised in the clan",
    blurb: "Your family has been in this mandamento for three generations. You were watched from the age of ten.",
    purse: 1500,
    standing: 28,
    ledger: { physical: 0, financial: 0, testimonial: 0 },
    stats: { competence: 2, ambition: 6, discretion: 12 },
    heritage: "sicilian",
    eras: ["pal_1978_mattanza", "pal_1984_maxiprocesso"],
  },
];

export const originsForEra = (eraId: string): Origin[] =>
  ORIGINS.filter((o) => !o.eras || o.eras.includes(eraId));