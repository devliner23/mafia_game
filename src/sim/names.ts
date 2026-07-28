import type { Rng } from "./rng";

/**
 * A city is roughly 150 men. Eighteen names was never going to cover it — the
 * old pool produced six Sal Vitales per family, which reads as a bug long
 * before it reads as a coincidence.
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

/** Used only when the plain pool collides, so nobody ever shares a name. */
export const NICKNAMES: readonly string[] = [
  "Fat", "Skinny", "Curly", "Sonny", "Junior", "Blue Eyes", "The Nose",
  "Cheeks", "Lefty", "Baldy", "Shorty", "The Hat", "Tick", "Bootsy", "Whitey",
];

export const FAMILY_NAMES: readonly string[] = [
  "Gambino", "Genovese", "Lucchese", "Bonanno", "Profaci", "Colombo",
  "Mangano", "Maranzano",
];

/**
 * Hands out a unique name every time. Deterministic: it only ever draws from
 * the seeded Rng, so the same seed still produces the same city.
 */
export class NameBook {
  private used = new Set<string>();

  constructor(private rng: Rng) {}

  take(): string {
    for (let i = 0; i < 60; i++) {
      const name = `${this.rng.pick(FIRST_NAMES)} ${this.rng.pick(LAST_NAMES)}`;
      if (!this.used.has(name)) {
        this.used.add(name);
        return name;
      }
    }
    // The pool is crowded. Give this one a street name instead of a duplicate.
    let name = "";
    do {
      name = `${this.rng.pick(FIRST_NAMES)} "${this.rng.pick(NICKNAMES)}" ${this.rng.pick(LAST_NAMES)}`;
    } while (this.used.has(name));
    this.used.add(name);
    return name;
  }

  /** Reserve a name the player chose so no NPC can turn up wearing it. */
  reserve(name: string): void {
    this.used.add(name);
  }
}