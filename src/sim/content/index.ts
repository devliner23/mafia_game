import { ORIGINS } from "../history";
import type { Job } from "../types";

/**
 * Content is bundled, not loaded, so `satisfies` gives us the same guarantee
 * Zod gave us at runtime — a malformed entry fails the build instead of the app.
 *
 * These numbers are the balance surface. Tune here first, not in engine.ts.
 */
export const JOBS = [
  { id: "shakedown", name: "Shakedown", minRank: "associate", crewNeeded: 0, payout: 1800,
    difficulty: 25, evidence: { physical: 0.5, financial: 1, testimonial: 2.5, racket: 'unions', familyId: 1  } },
  { id: "boost_cars", name: "Boosting cars", minRank: "associate", crewNeeded: 0, payout: 3200,
    difficulty: 40, evidence: { physical: 3, financial: 1.5, testimonial: 1 }, racket: 'unions', familyId: 1 },
  { id: "loan_collection", name: "Loan collection", minRank: "soldier", crewNeeded: 1, payout: 5000,
    difficulty: 45, evidence: { physical: 2.5, financial: 3, testimonial: 3.5, racket: 'unions', familyId: 1  } },
  { id: "hijack_load", name: "Hijacking a load", minRank: "soldier", crewNeeded: 2, payout: 11000,
    difficulty: 60, evidence: { physical: 6, financial: 3, testimonial: 2 }, racket: 'unions', familyId: 1  },
  { id: "protection_route", name: "Protection route", minRank: "capo", crewNeeded: 2, payout: 16000,
    difficulty: 55, evidence: { physical: 2, financial: 7, testimonial: 5 }, racket: 'unions', familyId: 1  },
  { id: "union_skim", name: "Skimming a local", minRank: "capo", crewNeeded: 3, payout: 28000,
    difficulty: 70, evidence: { physical: 1, financial: 12, testimonial: 4 }, racket: 'unions', familyId: 1  },
  { id: "port_contract", name: "Port contract", minRank: "underboss", crewNeeded: 3, payout: 52000,
    difficulty: 78, evidence: { physical: 2, financial: 16, testimonial: 7 }, racket: 'unions', familyId: 1  },
  { id: "city_contract", name: "City contract", minRank: "boss", crewNeeded: 4, payout: 95000,
    difficulty: 85, evidence: { physical: 3, financial: 22, testimonial: 10 , racket: 'unions', familyId: 1 } },
] satisfies Job[];

/** Kept for save compatibility and for anything that wants a short name list. */
export const NAMES: readonly string[] = [
  "Tommy Bracco", "Sal Vitale", "Ricky Manzo", "Joey Fusco", "Vinnie Corso",
  "Petey DeLuca", "Mikey Rossi", "Angelo Grieco", "Frankie Salerno", "Dom Ferraro",
  "Nunzio Pace", "Carmine Lo Duca", "Eddie Marchetti", "Gus Tavano", "Lou Bellante",
  "Chick Amato", "Benny Riggio", "Marco Dellucci",
];

/**
 * Backgrounds are the asymmetric start in the game. They live in the history
 * corpus as `ORIGINS` — era-scoped, carrying `purse` and `heritage`, which are
 * the fields the engine and world generator now read. Re-exported so `CONFIG`
 * remains the single place the sim picks up its content.
 */
export const CONFIG = {
  jobs: JOBS as Job[],
  names: NAMES,
  backgrounds: ORIGINS,
};