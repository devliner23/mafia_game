import { invoke } from "@tauri-apps/api/core";
import { CONFIG, replay, type Command, type GameState, type NewGameOptions } from "./sim";

/**
 * Because the sim is event-sourced and deterministic, a save file is just the
 * seed plus the list of commands the player issued. Replaying it reconstructs
 * the exact state — no snapshot, no serialisation drift, and every save doubles
 * as a bug report you can step through.
 */
export const SAVE_VERSION = 1;

/**
 * True only inside the Tauri webview. Lets `npm run dev` work in an ordinary
 * browser for fast UI iteration — everything except persistence runs there,
 * because the sim has no native dependencies at all.
 */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface SaveFile {
  version: number;
  seed: string;
  /** Part of the save because the starting loadout changes how commands replay. */
  options: NewGameOptions;
  commands: Command[];
  savedAt: string;
  /** Denormalised for the load menu so we don't replay every save to list them. */
  summary: { week: number; rank: string; over: string | null };
}

export async function saveGame(
  slot: string,
  seed: string,
  options: NewGameOptions,
  commands: Command[],
  state: GameState,
): Promise<void> {
  const file: SaveFile = {
    version: SAVE_VERSION,
    seed,
    options,
    commands,
    savedAt: new Date().toISOString(),
    summary: { week: state.week, rank: state.rank, over: state.over?.reason ?? null },
  };
  if (!isTauri()) throw new Error("Saving needs the Tauri app — run `npm run tauri dev`.");
  await invoke("save_game", { slot, data: JSON.stringify(file) });
}

export async function loadGame(
  slot: string,
): Promise<{ state: GameState; commands: Command[]; seed: string; options: NewGameOptions } | null> {
  if (!isTauri()) throw new Error("Loading needs the Tauri app — run `npm run tauri dev`.");
  const raw = await invoke<string | null>("load_game", { slot });
  if (!raw) return null;

  const file = migrate(JSON.parse(raw) as SaveFile);
  const { state } = replay(file.seed, file.commands, CONFIG, file.options);
  return { state, commands: file.commands, seed: file.seed, options: file.options };
}

export async function listSaves(): Promise<{ slot: string; file: SaveFile }[]> {
  if (!isTauri()) return [];
  const slots = await invoke<string[]>("list_saves");
  const out: { slot: string; file: SaveFile }[] = [];
  for (const slot of slots) {
    const raw = await invoke<string | null>("load_game", { slot });
    if (raw) out.push({ slot, file: migrate(JSON.parse(raw) as SaveFile) });
  }
  return out;
}

export async function deleteSave(slot: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("delete_save", { slot });
}

/**
 * Add a case per version bump. Saves outlive your schema — this hook existing
 * from day one is much cheaper than retrofitting it after launch.
 */
function migrate(file: SaveFile): SaveFile {
  if (file.version === SAVE_VERSION) return file;
  if (file.version > SAVE_VERSION) {
    throw new Error(`Save is from a newer version (${file.version}). Update the game.`);
  }
  // case 0 -> 1: ...
  return { ...file, version: SAVE_VERSION };
}
