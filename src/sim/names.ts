import type { Rng } from "./rng";
import { HOUSES } from "./history/houses";
import type { SettingId } from "./history/houses";

/**
 * A city is roughly 150 men, and the pool has to be deep enough that nobody
 * reads as a duplicate. It also has to be *local*: a Palermo clan full of men
 * called Eddie and Tommy is the tell that the setting is a skin.
 *
 * One hard rule, enforced below: the generator can never produce the name of a
 * real person in the corpus. Those men are seated deliberately, by the world
 * builder, in the chairs they actually held. A soldier who happens to roll
 * "Salvatore Riina" is the single worst thing this system could output.
 */

export const FIRST_NAMES: readonly string[] = [
  "Vincent", "Salvatore", "Anthony", "Giovanni", "Carmine", "Frank", "Dominic",
  "Vito", "Paulie", "Luca", "Rocco", "Eddie", "Tommy", "Joey", "Mikey", "Angelo",
  "Nunzio", "Gus", "Lou", "Benny", "Marco", "Pete", "Ralph", "Nicky", "Sonny",
  "Aldo", "Ciro", "Enzo", "Gaetano", "Ignazio", "Matteo", "Pasquale", "Silvio",
  "Bruno", "Cosimo", "Emilio", "Fabrizio", "Gennaro", "Lorenzo", "Sandro",
];

export const LAST_NAMES: readonly string[] = [
  "Bracco", "Vitale", "Manzo", "Fusco", "Corso", "DeLuca", "Rossi", "Grieco",
  "Salerno", "Ferraro", "Pace", "Lo Duca", "Marchetti", "Tavano", "Bellante",
  "Amato", "Riggio", "Dellucci", "Scarpa", "Ruggiero", "Bonavita", "Castellano",
  "Persico", "Rastelli", "Zerilli", "Aiello", "Barone", "Calabrese", "Datillo",
  "Esposito", "Falcone", "Guarino", "Ingrassia", "Lombardo", "Mancuso",
  "Napolitano", "Orsini", "Piccolo", "Quaranta", "Rizzuto", "Santoro",
  "Trafficante", "Ubriaco", "Vaccaro", "Zappone", "Cirillo", "Bevilacqua",
  "Moretti", "Petrosino", "Tramonti", "Battaglia", "Cardinale", "Fontana",
  "Gervasi", "Iannello", "Licata", "Milito", "Notaro", "Panetta", "Serpico",
];

/** Street names. Used only when the plain pool collides. */
export const NICKNAMES: readonly string[] = [
  "Fat", "Skinny", "Curly", "Sonny", "Junior", "Blue Eyes", "The Nose",
  "Cheeks", "Lefty", "Baldy", "Shorty", "The Hat", "Tick", "Bootsy", "Whitey",
];

/** Kept only so old saves that referenced it still resolve. */
export const FAMILY_NAMES: readonly string[] = [
  "Gambino", "Genovese", "Lucchese", "Bonanno", "Profaci", "Colombo",
  "Mangano", "Maranzano",
];

export interface NamePool {
  first: readonly string[];
  last: readonly string[];
  nicknames: readonly string[];
}

const SICILIAN: NamePool = {
  first: [
    "Salvatore", "Giuseppe", "Antonino", "Calogero", "Gaetano", "Rosario",
    "Michele", "Pietro", "Filippo", "Ignazio", "Domenico", "Francesco",
    "Leoluca", "Bernardo", "Girolamo", "Mariano", "Benedetto", "Vito",
    "Nunzio", "Nino", "Turi", "Ciccio", "Emanuele", "Gioacchino", "Onofrio",
    "Baldassare", "Vincenzo", "Alfonso", "Silvio", "Carmelo",
  ],
  last: [
    "Marchese", "Spatola", "Vernengo", "Grado", "Prestifilippo", "Pullarà",
    "Sciortino", "Sorci", "Cucuzza", "Anselmo", "Chiodo", "Farinella",
    "Geraci", "Puccio", "Savoca", "Tinnirello", "Zanca", "Lo Iacono",
    "Corallo", "Mirabile", "Terrasi", "Guddo", "Cannella", "Interdonato",
    "Randazzo", "Sciarratta", "Vassallo", "Zito", "Alfano", "Bommarito",
    "Cassarà", "Di Trapani", "Ferrante", "Guagliardo", "Lipari", "Mangiapane",
    "Nicoletti", "Priolo", "Quartararo", "Rinella", "Sansone", "Tomasello",
  ],
  nicknames: [
    "u Curtu", "u Longu", "u Zoppu", "u Duttureddu", "u Pazzu", "u Signurinu",
    "Facciazza", "u Tignusu", "Malacarne", "u Picciriddu",
  ],
};

const CHICAGO: NamePool = {
  first: [
    "Frank", "Jack", "Earl", "Vincent", "George", "Patrick", "Daniel", "Martin",
    "Terry", "Myles", "Hymie", "Jake", "Louis", "Ralph", "Sam", "Willie",
    "Dominic", "Rocco", "Charlie", "Eddie", "Stanley", "Walter", "Casimir",
    "Angelo", "Tony", "Joseph", "Peter", "Michael", "Harry", "Leo",
  ],
  last: [
    "O'Donnell", "Moran", "McErlane", "Duffy", "Sullivan", "Kelly", "Ragen",
    "Doherty", "Quinn", "Hanley", "Coughlin", "Malloy", "Sheehan", "Brennan",
    "Zuta", "Wojciechowski", "Kowalski", "Nowak", "Zielinski", "Jaworski",
    "Guzik", "Alterie", "Bernstein", "Weinshank", "Clark",
    "Esposito", "Lombardo", "Fischetti", "Campagna", "Gioe", "Volpe",
    "Amatuna", "Cerone", "Pierce", "Kelleher", "Stanton", "Ryan",
  ],
  nicknames: [
    "Klondike", "Spike", "Machine Gun", "Golf Bag", "Three-Fingered", "Schemer",
    "Screwy", "Polack Joe", "Mops", "Dago", "Slim", "Red",
  ],
};

const NEW_YORK: NamePool = { first: FIRST_NAMES, last: LAST_NAMES, nicknames: NICKNAMES };

export const POOLS: Record<SettingId, NamePool> = {
  nyc: NEW_YORK,
  chicago: CHICAGO,
  palermo: SICILIAN,
};

/**
 * Every real name in the corpus, so the generator can never mint one. Built
 * once, from the same tables the world builder seats people from.
 */
const REAL_PEOPLE: ReadonlySet<string> = new Set(
  HOUSES.flatMap((h) => h.seats.map((s) => s.who)),
);

/** Strip the quoted street name so "Carmine \"Lilo\" Galante" also blocks the plain form. */
const bare = (name: string): string => name.replace(/\s*"[^"]*"\s*/g, " ").replace(/\s+/g, " ").trim();

const REAL_BARE: ReadonlySet<string> = new Set([...REAL_PEOPLE].map(bare));

/**
 * Hands out a unique name every time. Deterministic: it only ever draws from
 * the seeded Rng, so the same seed still produces the same city.
 */
export class NameBook {
  private used = new Set<string>();
  private pool: NamePool;

  constructor(private rng: Rng, setting: SettingId = "nyc") {
    this.pool = POOLS[setting];
    for (const real of REAL_BARE) this.used.add(real);
  }

  take(): string {
    for (let i = 0; i < 60; i++) {
      const name = `${this.rng.pick(this.pool.first)} ${this.rng.pick(this.pool.last)}`;
      if (!this.used.has(name)) {
        this.used.add(name);
        return name;
      }
    }
    // The pool is crowded. Give this one a street name instead of a duplicate.
    let name = "";
    do {
      name = `${this.rng.pick(this.pool.first)} "${this.rng.pick(this.pool.nicknames)}" ${this.rng.pick(this.pool.last)}`;
    } while (this.used.has(name) || REAL_BARE.has(bare(name)));
    this.used.add(name);
    return name;
  }

  /** Reserve a name the player chose, or a real man being seated deliberately. */
  reserve(name: string): void {
    this.used.add(name);
    this.used.add(bare(name));
  }
}