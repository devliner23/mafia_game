import { useCallback, useMemo, useRef, useState } from "react";
import {
  CONFIG,
  createGame,
  isQuiet,
  makeDigest,
  project,
  step,
  type Command,
  type Digest,
  type FeedLine,
  type GameEvent,
  type GameState,
  type NewGameOptions,
} from "../sim";

/** Fired on window whenever the sim advances into a new week. */
export const WEEK_EVENT = "earner:week";

export interface WeekBegan {
  week: number;
  events: GameEvent[];
}

export interface Game {
  state: GameState;
  feed: FeedLine[];
  notice: string | null;
  /** The aftermath of the last action, shown as a popup until dismissed. */
  digest: Digest | null;
  seed: string;
  options: NewGameOptions;
  commands: Command[];
  dispatch: (cmd: Command) => void;
  setNotice: (msg: string | null) => void;
  dismissDigest: () => void;
  restore: (r: {
    state: GameState;
    commands: Command[];
    seed: string;
    options: NewGameOptions;
  }) => void;
}

/**
 * Owns the run. The sim itself is pure, so everything mutable about a session
 * lives here and nowhere else — which is what keeps the UI swappable.
 *
 * Every accepted command produces a Digest: the before/after diff the interface
 * shows as a popup. Rejections don't — a rejected command didn't happen, so
 * there is nothing to report but the reason.
 */
export function useGame(seed: string, options: NewGameOptions, onWeekBegan?: (w: WeekBegan) => void,): Game {
  const [liveSeed, setLiveSeed] = useState(seed);
  const [liveOptions, setLiveOptions] = useState(options);
  const [state, setState] = useState<GameState>(() => createGame(seed, CONFIG, options));
  const [commands, setCommands] = useState<Command[]>([]);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);

  const current = useRef<GameState>(state);
  const week = useRef(onWeekBegan);
  week.current = onWeekBegan;

  const dispatch = useCallback((cmd: Command) => {
    const prev = current.current;
    const result = step(prev, cmd, CONFIG);

    if (result.rejected) {
      setNotice(result.rejected);
      return;
    }

    current.current = result.state;
    setNotice(null);
    setState(result.state);
    setCommands((c) => [...c, cmd]);

    const lines = project(result.state, result.events);
    if (lines.length > 0) {
      setFeed((f) => [...[...lines].reverse(), ...f].slice(0, 250));
    }

    const d = makeDigest(prev, result.state, result.events, cmd);
    setDigest(isQuiet(d) ? null : d);

    /**
     * The turn of the week. The engine already emits week_began as the last
     * thing it does on an accepted end_week, so this fires exactly once per
     * week and never on a rejection, a restore, or a mid-week action.
     */
    const began = result.events.filter((e) => e.type === "week_began").pop();
    if (began && began.type === "week_began") {
      const payload: WeekBegan = { week: began.week, events: result.events };
      week.current?.(payload);
      window.dispatchEvent(new CustomEvent<WeekBegan>(WEEK_EVENT, { detail: payload }));
    }
  }, []);

  const dismissDigest = useCallback(() => setDigest(null), []);

  const restore = useCallback(
    (r: { state: GameState; commands: Command[]; seed: string; options: NewGameOptions }) => {
      current.current = r.state;
      setState(r.state);
      setCommands(r.commands);
      setLiveSeed(r.seed);
      setLiveOptions(r.options);
      setFeed([]);
      setDigest(null);
      setNotice("Loaded. The feed starts fresh — the file doesn't.");
    },
    [],
  );

  return useMemo(
    () => ({
      state,
      feed,
      notice,
      digest,
      seed: liveSeed,
      options: liveOptions,
      commands,
      dispatch,
      setNotice,
      dismissDigest,
      restore,
    }),
    [state, feed, notice, digest, liveSeed, liveOptions, commands, dispatch, dismissDigest, restore],
  );
}