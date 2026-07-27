import { useCallback, useMemo, useState } from "react";
import {
  CONFIG,
  createGame,
  project,
  step,
  type Command,
  type FeedLine,
  type GameState,
  type NewGameOptions,
} from "../sim";

export interface Game {
  state: GameState;
  feed: FeedLine[];
  notice: string | null;
  seed: string;
  options: NewGameOptions;
  commands: Command[];
  dispatch: (cmd: Command) => void;
  setNotice: (msg: string | null) => void;
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
 */
export function useGame(seed: string, options: NewGameOptions): Game {
  const [liveSeed, setLiveSeed] = useState(seed);
  const [liveOptions, setLiveOptions] = useState(options);
  const [state, setState] = useState<GameState>(() => createGame(seed, CONFIG, options));
  const [commands, setCommands] = useState<Command[]>([]);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const dispatch = useCallback((cmd: Command) => {
    setState((prev) => {
      const result = step(prev, cmd, CONFIG);
      if (result.rejected) {
        setNotice(result.rejected);
        return prev;
      }
      setNotice(null);
      setCommands((c) => [...c, cmd]);
      const lines = project(result.state, result.events);
      if (lines.length > 0) {
        setFeed((f) => [...[...lines].reverse(), ...f].slice(0, 250));
      }
      return result.state;
    });
  }, []);

  const restore = useCallback(
    (r: { state: GameState; commands: Command[]; seed: string; options: NewGameOptions }) => {
      setState(r.state);
      setCommands(r.commands);
      setLiveSeed(r.seed);
      setLiveOptions(r.options);
      setFeed([]);
      setNotice("Loaded. The feed starts fresh — the file doesn't.");
    },
    [],
  );

  return useMemo(
    () => ({
      state,
      feed,
      notice,
      seed: liveSeed,
      options: liveOptions,
      commands,
      dispatch,
      setNotice,
      restore,
    }),
    [state, feed, notice, liveSeed, liveOptions, commands, dispatch, restore],
  );
}
