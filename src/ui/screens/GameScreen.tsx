import { useState } from "react";
import type { Game } from "../../game/useGame";
import { loadGame, saveGame } from "../../save";
import { CrewPanel } from "../components/CrewPanel";
import { FeedPanel } from "../components/FeedPanel";
import { LedgerPanel } from "../components/LedgerPanel";
import { WorkPanel } from "../components/WorkPanel";
import { Stat, money } from "../components/Bits";

const SLOT = "autosave";

export function GameScreen({ game, onQuit }: { game: Game; onQuit: () => void }) {
  const { state, feed, notice, dispatch, setNotice } = game;
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="shell">
      <header className="fileTop">
        <div className="who">
          <h1>{state.player.name}</h1>
          <div className="sub">
            {state.rank} · week {state.week}
          </div>
        </div>
        <Stat k="on hand" v={money(state.money)} />
        <Stat k="standing" v={String(state.standing)} />
        <div className="row">
          <button
            onClick={() =>
              void saveGame(SLOT, game.seed, game.options, game.commands, state)
                .then(() => setNotice("Saved."))
                .catch((e: Error) => setNotice(e.message))
            }
          >
            Save
          </button>
          <button
            onClick={() =>
              void loadGame(SLOT)
                .then((r) => (r ? game.restore(r) : setNotice("No file to open.")))
                .catch((e: Error) => setNotice(e.message))
            }
          >
            Load
          </button>
          <button onClick={onQuit}>Close file</button>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <div className="grid">
        <div className="col">
          <LedgerPanel state={state} />
          <CrewPanel state={state} selected={selected} onToggle={toggle} dispatch={dispatch} />
        </div>
        <div className="col">
          <WorkPanel state={state} selected={selected} dispatch={dispatch} />
        </div>
        <FeedPanel feed={feed} />
      </div>
    </div>
  );
}
