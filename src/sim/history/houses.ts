/**
 * THE CORPUS — houses and the men who sat in their chairs.
 *
 * This file is the only place in the codebase where a real person's name
 * appears. Everything downstream reads it; nothing downstream hardcodes it.
 *
 * Three rules govern what is allowed in here:
 *
 *   1. A house has a *life*, not a name. The Gambinos were the D'Aquilas, then
 *      the Minneos, then the Manganos, then the Anastasias. Calling them
 *      "Gambino" in 1931 is the single most common error in mob fiction and the
 *      one the naming timeline exists to make impossible.
 *   2. A reign is a span with an exit. How a boss left the chair is load-
 *      bearing: it seeds the house's opening temperament and it is what the
 *      era timeline fires on.
 *   3. Anything not securely documented is marked `contested` and the sim is
 *      told to treat it as soft. Where the record is genuinely thin — most
 *      underbosses, nearly all capos — we generate fictional men rather than
 *      invent real ones. The roster below is deliberately incomplete: it seats
 *      the chairs history actually recorded and lets the simulation fill the
 *      rest.
 *
 * Dates are [year, month]. Month is 1-12. `null` means "still sitting at the
 * end of anything we simulate".
 */

export type YM = readonly [year: number, month: number];

export type SettingId = "nyc" | "chicago" | "palermo";

/** How a man stopped being boss. Drives the opening state of the house. */
export type Exit =
  | "killed"
  | "died"
  | "prison"
  | "deported"
  | "fled"
  | "deposed"
  | "retired"
  | "flipped"
  | "sitting";

export type SeatRole = "boss" | "acting" | "front" | "underboss" | "consigliere";

export interface Reign {
  role: SeatRole;
  who: string;
  from: YM;
  /** Null only for a seat still occupied past our last simulated year. */
  to: YM | null;
  exit: Exit;
  /** One line the intake screen can show. Facts, not colour. */
  note?: string;
  /** `contested` gets rendered with a qualifier and never asserted as fact. */
  certainty?: "documented" | "contested";
}

export interface HouseName {
  from: YM;
  name: string;
}

export type RacketId =
  | "liquor"
  | "beer"
  | "numbers"
  | "bookmaking"
  | "loansharking"
  | "garment"
  | "docks"
  | "trucking"
  | "construction"
  | "waste"
  | "unions"
  | "vending"
  | "heroin"
  | "extortion"
  | "public_works"
  | "tobacco_smuggling"
  | "kidnapping";

export interface House {
  id: string;
  setting: SettingId;
  /** Name changes over the life of the house, earliest first. */
  names: readonly HouseName[];
  /** When it is recognisably this house, and when it stops being one. */
  born: YM;
  ended?: YM;
  /** Where it actually sat. Shown at intake; never used as a game mechanic. */
  turf: readonly string[];
  /** What it lived on. Intersected with what was legal/profitable that year. */
  rackets: readonly RacketId[];
  seats: readonly Reign[];
  /** Rough size of the made membership, for scaling the generated roster. */
  scale: "small" | "mid" | "large";
  note: string;
}

/* ------------------------------------------------------------------ new york */

const GENOVESE: House = {
  id: "genovese",
  setting: "nyc",
  names: [
    { from: [1920, 1], name: "Morello" },
    { from: [1922, 1], name: "Masseria" },
    { from: [1931, 4], name: "Luciano" },
    { from: [1937, 9], name: "Costello" },
    { from: [1957, 5], name: "Genovese" },
  ],
  born: [1920, 1],
  turf: ["Lower East Side", "Greenwich Village", "East Harlem", "the Bronx", "Fulton Fish Market"],
  rackets: ["liquor", "numbers", "bookmaking", "loansharking", "docks", "unions", "construction"],
  scale: "large",
  seats: [
    {
      role: "boss",
      who: "Giuseppe \"Joe the Boss\" Masseria",
      from: [1922, 1],
      to: [1931, 4],
      exit: "killed",
      note: "Shot at a Coney Island restaurant, 15 April 1931, while the war was still on.",
    },
    {
      role: "boss",
      who: "Charles \"Lucky\" Luciano",
      from: [1931, 4],
      to: [1946, 2],
      exit: "deported",
      note: "Convicted 1936 on compulsory prostitution; commuted and deported to Italy in 1946.",
    },
    {
      role: "acting",
      who: "Vito Genovese",
      from: [1936, 6],
      to: [1937, 9],
      exit: "fled",
      note: "Left for Italy ahead of a murder charge.",
    },
    {
      role: "acting",
      who: "Frank Costello",
      from: [1937, 9],
      to: [1957, 5],
      exit: "deposed",
      note: "Stepped back after being shot in the lobby of his building, 2 May 1957.",
    },
    {
      role: "boss",
      who: "Vito Genovese",
      from: [1957, 5],
      to: [1969, 2],
      exit: "died",
      note: "Ran the house from prison after a 1959 narcotics conviction; died inside, February 1969.",
    },
    {
      role: "boss",
      who: "Philip \"Benny Squint\" Lombardo",
      from: [1969, 2],
      to: [1981, 3],
      exit: "retired",
      certainty: "contested",
      note: "Real authority behind a succession of front bosses; the arrangement was not understood by investigators for years.",
    },
    {
      role: "front",
      who: "Thomas \"Tommy Ryan\" Eboli",
      from: [1969, 2],
      to: [1972, 7],
      exit: "killed",
      note: "Shot in Brooklyn, July 1972.",
    },
    { role: "front", who: "Frank \"Funzi\" Tieri", from: [1972, 7], to: [1981, 3], exit: "died" },
    {
      role: "front",
      who: "Anthony \"Fat Tony\" Salerno",
      from: [1981, 3],
      to: [1986, 11],
      exit: "prison",
      note: "Prosecuted in the Commission case as the boss; he was not one.",
    },
    {
      role: "boss",
      who: "Vincent \"Chin\" Gigante",
      from: [1981, 3],
      to: [2005, 12],
      exit: "died",
      note: "Held the seat behind the front bosses; conducted himself in public as a man unfit to stand trial.",
    },
  ],
  note: "The largest and the quietest. Layered its leadership specifically so that the man being prosecuted was never the man in charge.",
};

const GAMBINO: House = {
  id: "gambino",
  setting: "nyc",
  names: [
    { from: [1920, 1], name: "D'Aquila" },
    { from: [1928, 10], name: "Mineo" },
    { from: [1931, 9], name: "Mangano" },
    { from: [1951, 4], name: "Anastasia" },
    { from: [1957, 10], name: "Gambino" },
  ],
  born: [1920, 1],
  turf: ["Brooklyn waterfront", "Bensonhurst", "Ozone Park", "Manhattan garment district"],
  rackets: ["docks", "garment", "trucking", "loansharking", "construction", "unions", "waste"],
  scale: "large",
  seats: [
    {
      role: "boss",
      who: "Salvatore \"Toto\" D'Aquila",
      from: [1920, 1],
      to: [1928, 10],
      exit: "killed",
      note: "Shot in Manhattan, October 1928.",
    },
    { role: "boss", who: "Alfred Mineo", from: [1928, 10], to: [1930, 11], exit: "killed" },
    {
      role: "boss",
      who: "Frank Scalise",
      from: [1931, 2],
      to: [1931, 9],
      exit: "deposed",
      certainty: "contested",
      note: "Installed during the war; removed once the man who installed him was dead.",
    },
    {
      role: "boss",
      who: "Vincent Mangano",
      from: [1931, 9],
      to: [1951, 4],
      exit: "killed",
      note: "Disappeared in April 1951. No body was recovered; his brother's was.",
    },
    {
      role: "underboss",
      who: "Albert Anastasia",
      from: [1931, 9],
      to: [1951, 4],
      exit: "deposed",
      note: "Twenty years as underboss to a man he was widely believed to have removed.",
    },
    {
      role: "boss",
      who: "Albert Anastasia",
      from: [1951, 4],
      to: [1957, 10],
      exit: "killed",
      note: "Shot in a barber's chair at the Park Sheraton, 25 October 1957.",
    },
    {
      role: "boss",
      who: "Carlo Gambino",
      from: [1957, 10],
      to: [1976, 10],
      exit: "died",
      note: "The only New York boss of his generation to die of natural causes in his own bed.",
    },
    {
      role: "boss",
      who: "Paul Castellano",
      from: [1976, 10],
      to: [1985, 12],
      exit: "killed",
      note: "Shot outside a Manhattan steakhouse, 16 December 1985, two weeks after his underboss died of cancer.",
    },
    {
      role: "underboss",
      who: "Aniello \"Neil\" Dellacroce",
      from: [1976, 10],
      to: [1985, 12],
      exit: "died",
    },
    {
      role: "boss",
      who: "John Gotti",
      from: [1985, 12],
      to: [1992, 4],
      exit: "prison",
      note: "Convicted April 1992, largely on his own recorded voice and his underboss's testimony.",
    },
    {
      role: "underboss",
      who: "Salvatore \"Sammy the Bull\" Gravano",
      from: [1990, 1],
      to: [1991, 11],
      exit: "flipped",
    },
  ],
  note: "The house that ran the piers and the garment centre, and the one whose succession was settled by gunfire more often than any other.",
};

const LUCCHESE: House = {
  id: "lucchese",
  setting: "nyc",
  names: [
    { from: [1920, 1], name: "Reina" },
    { from: [1930, 9], name: "Gagliano" },
    { from: [1953, 2], name: "Lucchese" },
  ],
  born: [1920, 1],
  turf: ["East Harlem", "the Bronx", "Queens", "Garment District", "Kennedy Airport"],
  rackets: ["garment", "trucking", "construction", "loansharking", "unions", "heroin"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Gaetano \"Tommy\" Reina",
      from: [1920, 1],
      to: [1930, 2],
      exit: "killed",
      note: "Shot in the Bronx, 26 February 1930. His murder is the usual starting gun for the war.",
    },
    {
      role: "boss",
      who: "Joseph Pinzolo",
      from: [1930, 2],
      to: [1930, 9],
      exit: "killed",
      note: "Imposed on the house from outside; killed inside seven months.",
    },
    { role: "boss", who: "Tommaso \"Tommy\" Gagliano", from: [1930, 9], to: [1953, 2], exit: "died" },
    {
      role: "boss",
      who: "Gaetano \"Tommy Three-Finger Brown\" Lucchese",
      from: [1953, 2],
      to: [1967, 7],
      exit: "died",
      note: "Married his daughter into the Gambinos; the two houses effectively worked as one.",
    },
    { role: "boss", who: "Carmine \"Mr. Gribbs\" Tramunti", from: [1967, 7], to: [1973, 12], exit: "prison" },
    {
      role: "boss",
      who: "Anthony \"Tony Ducks\" Corallo",
      from: [1974, 1],
      to: [1986, 11],
      exit: "prison",
      note: "Convicted in the Commission case, largely on a bug in his driver's car.",
    },
    { role: "boss", who: "Vittorio \"Vic\" Amuso", from: [1987, 1], to: [1992, 7], exit: "prison" },
  ],
  note: "Quiet, commercially sophisticated, and unusually stable at the top — until the late eighties, when it turned on its own membership.",
};

const BONANNO: House = {
  id: "bonanno",
  setting: "nyc",
  names: [
    { from: [1920, 1], name: "Schirò" },
    { from: [1930, 2], name: "Maranzano" },
    { from: [1931, 9], name: "Bonanno" },
  ],
  born: [1920, 1],
  turf: ["Williamsburg", "Bushwick", "Ridgewood", "Knickerbocker Avenue", "Montreal"],
  rackets: ["liquor", "numbers", "loansharking", "heroin", "unions", "extortion"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Nicola \"Cola\" Schirò",
      from: [1920, 1],
      to: [1930, 2],
      exit: "fled",
      note: "Paid tribute to Masseria and then left town rather than fight him.",
    },
    {
      role: "boss",
      who: "Salvatore Maranzano",
      from: [1930, 2],
      to: [1931, 9],
      exit: "killed",
      note: "Declared himself first among the bosses in the summer of 1931 and was dead by September.",
    },
    {
      role: "boss",
      who: "Joseph \"Joe Bananas\" Bonanno",
      from: [1931, 9],
      to: [1968, 5],
      exit: "retired",
      note: "Thirty-odd years, a plot against two other bosses, a disputed kidnapping in 1964, and a war inside his own house.",
    },
    {
      role: "boss",
      who: "Paul Sciacca",
      from: [1966, 1],
      to: [1970, 12],
      exit: "deposed",
      certainty: "contested",
      note: "Recognised by the Commission while Bonanno was still claiming the seat.",
    },
    { role: "boss", who: "Natale \"Joe Diamond\" Evola", from: [1971, 1], to: [1973, 8], exit: "died" },
    {
      role: "boss",
      who: "Philip \"Rusty\" Rastelli",
      from: [1974, 1],
      to: [1991, 6],
      exit: "died",
      note: "Held the title through most of a decade in prison.",
    },
    {
      role: "front",
      who: "Carmine \"Lilo\" Galante",
      from: [1974, 1],
      to: [1979, 7],
      exit: "killed",
      note: "Shot on a Brooklyn restaurant patio, 12 July 1979, cigar still in his mouth.",
    },
    {
      role: "boss",
      who: "Joseph Massino",
      from: [1991, 6],
      to: [2004, 7],
      exit: "flipped",
      note: "The first sitting boss of a New York family to cooperate with the government.",
    },
  ],
  note: "Thrown off the Commission in 1965 and readmitted in the nineties. The only family an FBI agent successfully lived inside for six years.",
};

const COLOMBO: House = {
  id: "colombo",
  setting: "nyc",
  names: [
    { from: [1928, 1], name: "Profaci" },
    { from: [1962, 6], name: "Magliocco" },
    { from: [1963, 12], name: "Colombo" },
  ],
  born: [1928, 1],
  turf: ["South Brooklyn", "Red Hook", "Bath Beach", "Staten Island"],
  rackets: ["numbers", "bookmaking", "loansharking", "extortion", "construction", "unions"],
  scale: "small",
  seats: [
    {
      role: "boss",
      who: "Giuseppe \"Joe\" Profaci",
      from: [1928, 1],
      to: [1962, 6],
      exit: "died",
      note: "Thirty-four years, and a house that spent the last two of them in revolt against his tribute demands.",
    },
    { role: "boss", who: "Joseph Magliocco", from: [1962, 6], to: [1963, 12], exit: "deposed" },
    {
      role: "boss",
      who: "Joseph Colombo",
      from: [1963, 12],
      to: [1971, 6],
      exit: "killed",
      note: "Shot at his own civil-rights rally at Columbus Circle, 28 June 1971; survived seven years without regaining consciousness.",
    },
    {
      role: "boss",
      who: "Carmine \"Junior\" Persico",
      from: [1973, 1],
      to: [2019, 3],
      exit: "prison",
      note: "Ran the house from a cell for over thirty years, through a war his own acting boss started.",
    },
  ],
  note: "The smallest of the five and the most frequently at war with itself. Three internal wars in forty years.",
};

/* ------------------------------------------------------------------- chicago */

const OUTFIT: House = {
  id: "outfit",
  setting: "chicago",
  names: [
    { from: [1920, 1], name: "Torrio" },
    { from: [1925, 1], name: "Capone" },
    { from: [1932, 1], name: "the Outfit" },
  ],
  born: [1920, 1],
  turf: ["Levee district", "Cicero", "South Side", "Chicago Heights"],
  rackets: ["beer", "liquor", "bookmaking", "extortion", "unions", "vending"],
  scale: "large",
  seats: [
    {
      role: "boss",
      who: "Johnny Torrio",
      from: [1920, 1],
      to: [1925, 1],
      exit: "retired",
      note: "Shot outside his home in January 1925, served a short sentence, and left the city to Capone.",
    },
    {
      role: "boss",
      who: "Alphonse \"Al\" Capone",
      from: [1925, 1],
      to: [1931, 10],
      exit: "prison",
      note: "Convicted of tax evasion, 17 October 1931 — not of anything he was actually feared for.",
    },
    { role: "boss", who: "Frank \"the Enforcer\" Nitti", from: [1932, 1], to: [1943, 3], exit: "died" },
  ],
  note: "Not a family in the New York sense. A single syndicate of crews, run as a business, with a payroll that reached the mayor's office.",
};

const NORTH_SIDE: House = {
  id: "north_side",
  setting: "chicago",
  names: [
    { from: [1920, 1], name: "O'Banion" },
    { from: [1924, 11], name: "Weiss" },
    { from: [1927, 4], name: "Moran" },
  ],
  born: [1920, 1],
  ended: [1931, 1],
  turf: ["North Side", "Gold Coast", "Near North"],
  rackets: ["beer", "liquor", "extortion", "kidnapping"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Dean O'Banion",
      from: [1920, 1],
      to: [1924, 11],
      exit: "killed",
      note: "Shot in his flower shop, 10 November 1924. Everything after is consequence.",
    },
    { role: "boss", who: "Earl \"Hymie\" Weiss", from: [1924, 11], to: [1926, 10], exit: "killed" },
    { role: "boss", who: "Vincent \"the Schemer\" Drucci", from: [1926, 10], to: [1927, 4], exit: "killed" },
    {
      role: "boss",
      who: "George \"Bugs\" Moran",
      from: [1927, 4],
      to: [1930, 12],
      exit: "deposed",
      note: "Seven of his men were killed in a garage on North Clark Street, 14 February 1929. He was late.",
    },
  ],
  note: "Irish and Polish, not Sicilian, and outside every arrangement the Italians made with each other. That is the whole reason for the war.",
};

const GENNA: House = {
  id: "genna",
  setting: "chicago",
  names: [{ from: [1920, 1], name: "Genna" }],
  born: [1920, 1],
  ended: [1925, 8],
  turf: ["Little Italy", "Taylor Street"],
  rackets: ["liquor", "extortion"],
  scale: "small",
  seats: [
    {
      role: "boss",
      who: "Angelo Genna",
      from: [1920, 1],
      to: [1925, 5],
      exit: "killed",
      note: "Three of the six brothers were killed inside seven weeks in the summer of 1925.",
    },
  ],
  note: "Six brothers running industrial-scale home distilling through the tenements. Killed off faster than any other house in the city.",
};

const AIELLO: House = {
  id: "aiello",
  setting: "chicago",
  names: [{ from: [1922, 1], name: "Aiello" }],
  born: [1922, 1],
  ended: [1930, 10],
  turf: ["Near North Side", "Unione Siciliana"],
  rackets: ["liquor", "extortion"],
  scale: "small",
  seats: [
    {
      role: "boss",
      who: "Joseph Aiello",
      from: [1922, 1],
      to: [1930, 10],
      exit: "killed",
      note: "Put a standing price on Capone's life and was shot in October 1930.",
    },
  ],
  note: "Fought Capone for the presidency of the Unione Siciliana, which mattered because it decided who controlled the Sicilian alcohol cookers.",
};

const SALTIS: House = {
  id: "saltis",
  setting: "chicago",
  names: [{ from: [1920, 1], name: "Saltis–McErlane" }],
  born: [1920, 1],
  ended: [1930, 12],
  turf: ["Back of the Yards", "Southwest Side"],
  rackets: ["beer", "extortion"],
  scale: "small",
  seats: [{ role: "boss", who: "Joe Saltis", from: [1920, 1], to: [1930, 12], exit: "deposed" }],
  note: "Switched sides twice. Credited with the first use of a Thompson gun in the city's beer war.",
};

/* ------------------------------------------------------------------- palermo */

const CORLEONESI: House = {
  id: "corleonesi",
  setting: "palermo",
  names: [{ from: [1950, 1], name: "Corleonesi" }],
  born: [1950, 1],
  turf: ["Corleone", "Uditore", "then, by 1983, most of Palermo"],
  rackets: ["heroin", "public_works", "extortion", "tobacco_smuggling", "construction"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Dr. Michele Navarra",
      from: [1950, 1],
      to: [1958, 8],
      exit: "killed",
      note: "The town doctor and the town's capo, until his own deputy killed him in August 1958.",
    },
    {
      role: "boss",
      who: "Luciano Leggio",
      from: [1958, 8],
      to: [1974, 5],
      exit: "prison",
      note: "Arrested May 1974; continued to be treated as the nominal head from prison.",
    },
    {
      role: "boss",
      who: "Salvatore \"Totò\" Riina",
      from: [1974, 5],
      to: [1993, 1],
      exit: "prison",
      note: "Twenty-three years as a fugitive, most of them spent in and around Palermo. Arrested 15 January 1993.",
    },
    { role: "boss", who: "Bernardo Provenzano", from: [1993, 1], to: [2006, 4], exit: "prison" },
  ],
  note: "A provincial clan from a hill town of eleven thousand people that took the whole of Palermo by killing everyone who outranked it.",
};

const BONTATE: House = {
  id: "bontate",
  setting: "palermo",
  names: [{ from: [1960, 1], name: "Santa Maria di Gesù" }],
  born: [1960, 1],
  ended: [1982, 12],
  turf: ["Santa Maria di Gesù", "southern Palermo"],
  rackets: ["heroin", "construction", "public_works", "extortion"],
  scale: "large",
  seats: [
    {
      role: "boss",
      who: "Stefano Bontate",
      from: [1974, 1],
      to: [1981, 4],
      exit: "killed",
      note: "Shot in his car on his birthday, 23 April 1981. His death opens the second war.",
    },
    { role: "boss", who: "Pietro Vernengo", from: [1981, 4], to: [1982, 12], exit: "deposed", certainty: "contested" },
  ],
  note: "The richest and best-connected clan in the city, with reach into national politics — which is precisely why the Corleonesi could not co-exist with it.",
};

const INZERILLO: House = {
  id: "inzerillo",
  setting: "palermo",
  names: [{ from: [1960, 1], name: "Passo di Rigano" }],
  born: [1960, 1],
  ended: [1982, 12],
  turf: ["Passo di Rigano", "Uditore", "and family in Brooklyn"],
  rackets: ["heroin", "construction", "extortion"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Salvatore \"Totuccio\" Inzerillo",
      from: [1975, 1],
      to: [1981, 5],
      exit: "killed",
      note: "Shot leaving his mistress's flat, 11 May 1981, eighteen days after Bontate.",
    },
  ],
  note: "Blood relations of the Gambinos in New York, and the American end of the heroin route. The survivors were driven to the United States and forbidden to return.",
};

const BADALAMENTI: House = {
  id: "badalamenti",
  setting: "palermo",
  names: [{ from: [1963, 1], name: "Cinisi" }],
  born: [1963, 1],
  ended: [1984, 4],
  turf: ["Cinisi", "Terrasini", "Punta Raisi airport"],
  rackets: ["heroin", "public_works", "extortion", "tobacco_smuggling"],
  scale: "small",
  seats: [
    {
      role: "boss",
      who: "Gaetano \"Don Tano\" Badalamenti",
      from: [1963, 1],
      to: [1978, 3],
      exit: "deposed",
      note: "Expelled from the ruling commission in 1978 and hunted from 1981; convicted in New York in 1987.",
    },
  ],
  note: "Held the airport, and with it the through-route. Removed from the commission by manoeuvre rather than by gunfire, which was unusual and did not last.",
};

const GRECO: House = {
  id: "greco",
  setting: "palermo",
  names: [{ from: [1950, 1], name: "Ciaculli" }],
  born: [1950, 1],
  turf: ["Ciaculli", "Croceverde Giardini", "the eastern citrus groves"],
  rackets: ["heroin", "construction", "extortion", "public_works"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Michele \"the Pope\" Greco",
      from: [1970, 1],
      to: [1986, 2],
      exit: "prison",
      note: "Head of Ciaculli from the early seventies; took the chair of the commission in March 1978 and held it through the war without ever appearing to be its master.",
    },
  ],
  note: "Presented itself as neutral and hosted the meetings. In practice it voted with Corleone every time it mattered.",
};

const RICCOBONO: House = {
  id: "riccobono",
  setting: "palermo",
  names: [{ from: [1970, 1], name: "Partanna-Mondello" }],
  born: [1970, 1],
  ended: [1982, 11],
  turf: ["Partanna", "Mondello", "Sferracavallo"],
  rackets: ["heroin", "extortion", "tobacco_smuggling"],
  scale: "small",
  seats: [
    {
      role: "boss",
      who: "Rosario \"Saruzzo\" Riccobono",
      from: [1970, 1],
      to: [1982, 11],
      exit: "killed",
      note: "Fought on the winning side for eighteen months and was killed at a barbecue by the men he had helped, 30 November 1982.",
    },
  ],
  note: "The clearest demonstration in the record that in this war there were no allies, only men who had not been killed yet.",
};

const PORTA_NUOVA: House = {
  id: "portanuova",
  setting: "palermo",
  names: [{ from: [1965, 1], name: "Porta Nuova" }],
  born: [1965, 1],
  turf: ["Porta Nuova", "the old city centre", "and an address in Rome"],
  rackets: ["heroin", "extortion", "construction", "public_works"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Giuseppe \"Pippo\" Cal\u00f2",
      from: [1970, 1],
      to: [1985, 3],
      exit: "prison",
      note: "Arrested near Rome in March 1985. He handled money and contacts on the mainland rather than territory in the city.",
    },
  ],
  note: "The clan of the old centre, and Cosa Nostra's man in Rome. Its business was banking and politics, which is why it survived a war it barely fought in.",
};

const RESUTTANA: House = {
  id: "resuttana",
  setting: "palermo",
  names: [{ from: [1965, 1], name: "Resuttana" }],
  born: [1965, 1],
  turf: ["Resuttana", "San Lorenzo", "the northern suburbs"],
  rackets: ["construction", "public_works", "heroin", "extortion"],
  scale: "mid",
  seats: [
    {
      role: "boss",
      who: "Francesco Madonia",
      from: [1975, 1],
      to: [1986, 2],
      exit: "prison",
      certainty: "contested",
      note: "Convicted at the maxi trial. The exact date he was taken is not consistently reported.",
    },
  ],
  note: "Corleone's oldest ally inside Palermo itself, and the reason the hill town had a foothold in the city before the shooting started.",
};

const SAN_GIUSEPPE_JATO: House = {
  id: "sangiuseppejato",
  setting: "palermo",
  names: [{ from: [1960, 1], name: "San Giuseppe Jato" }],
  born: [1960, 1],
  turf: ["San Giuseppe Jato", "Piana degli Albanesi", "the hinterland"],
  rackets: ["heroin", "public_works", "extortion", "construction"],
  scale: "small",
  seats: [
    {
      role: "boss",
      who: "Bernardo Brusca",
      from: [1970, 1],
      to: [1986, 2],
      exit: "prison",
      certainty: "contested",
      note: "Convicted at the maxi trial.",
    },
  ],
  note: "A country clan that supplied the winning side with men. The ones it supplied are still doing the work a decade later, on a motorway outside Capaci.",
};

/* --------------------------------------------------------------------- index */

export const HOUSES: readonly House[] = [
  GENOVESE,
  GAMBINO,
  LUCCHESE,
  BONANNO,
  COLOMBO,
  OUTFIT,
  NORTH_SIDE,
  GENNA,
  AIELLO,
  SALTIS,
  CORLEONESI,
  BONTATE,
  INZERILLO,
  BADALAMENTI,
  GRECO,
  RICCOBONO,
  PORTA_NUOVA,
  RESUTTANA,
  SAN_GIUSEPPE_JATO,
];

export const houseById = (id: string): House | undefined => HOUSES.find((h) => h.id === id);