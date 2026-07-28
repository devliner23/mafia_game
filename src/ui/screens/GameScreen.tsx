import { useState } from "react";
import {
  RANK_STANDING,
  RANKS,
  atWarWith,
  playerBacking,
  playerFamily,
  playerRank,
  rankIndex,
  reportsTo,
} from "../../sim";
import type { Game } from "../../game/useGame";
import { loadGame, saveGame } from "../../save";
import { CrewPanel } from "../components/CrewPanel";
import { FamilyPanel } from "../components/FamilyPanel";
import { FeedPanel } from "../components/FeedPanel";
import { LedgerPanel } from "../components/LedgerPanel";
import { WorkPanel } from "../components/WorkPanel";
import { DigestPopup, OfferPopup, SituationPopup } from "../components/Popups";
import { Stat, money } from "../components/Bits";

const SLOT = "autosave";

type Tab = "work" | "crew" | "chart";

/**
 * One working surface at a time, a fixed rail for the two things you always
 * need to see (the case against you and what people are saying), and a week bar
 * that is the only way time moves. Everything else arrives as an interruption.
 */
export function GameScreen({ game, onQuit }: { game: Game; onQuit: () => void }) {
  const { state, feed, notice, digest, dispatch, setNotice, dismissDigest } = game;
  const [tab, setTab] = useState<Tab>("work");
  const [selected, setSelected] = useState<string[]>([]);
  const [deferred, setDeferred] = useState<string | null>(null);

  const rank = playerRank(state);
  const fam = playerFamily(state);
  const next = RANKS[rankIndex(rank) + 1];
  const crew = reportsTo(state, "player");
  const wars = atWarWith(state, fam);

  const offerKey = state.offer ? `${state.offer.rank}:${state.offer.offeredWeek}` : null;
  const showOffer = Boolean(state.offer) && offerKey !== deferred;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="shell">
      <header className="fileTop">
        <div className="who">
          <h1>{state.player.name}</h1>
          <div className="sub">
            {rank} · {fam.name} family · week {state.week}
          </div>
        </div>
        <Stat k="on hand" v={money(state.money)} />
        <Stat
          k="standing"
          v={next ? `${state.standing} / ${RANK_STANDING[next]}` : String(state.standing)}
        />
        <Stat k="behind you" v={playerBacking(state).toFixed(1)} />
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

      {wars.length > 0 && (
        <div className="warBar">
          At war with the {wars.map((w) => w.name).join(" and ")}{" "}
          {wars.length > 1 ? "families" : "family"}. Nobody earns properly until somebody
          sits down.
        </div>
      )}

      {notice && <div className="notice">{notice}</div>}

      <div className="board">
        <main className="stage">
          <nav className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "work"} onClick={() => setTab("work")}>
              Work
            </button>
            <button role="tab" aria-selected={tab === "crew"} onClick={() => setTab("crew")}>
              Your people <span className="badge">{crew.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "chart"} onClick={() => setTab("chart")}>
              The chart
            </button>
          </nav>

          {tab === "work" && <WorkPanel state={state} selected={selected} dispatch={dispatch} />}
          {tab === "crew" && (
            <CrewPanel state={state} selected={selected} onToggle={toggle} dispatch={dispatch} />
          )}
          {tab === "chart" && <FamilyPanel state={state} dispatch={dispatch} />}
        </main>

        <aside className="rail">
          <LedgerPanel state={state} />
          <FeedPanel feed={feed} />
        </aside>
      </div>

      <div className="weekBar">
        <span className="hint">
          {state.pending
            ? "Somebody is waiting on an answer. Ending the week answers for you."
            : selected.length > 0
              ? `${selected.length} selected for the next job`
              : "Nothing moves until you end the week."}
        </span>
        <button
          className="primary"
          disabled={Boolean(state.over)}
          onClick={() => dispatch({ type: "end_week" })}
        >
          End week {state.week} →
        </button>
      </div>

      {digest ? (
        <DigestPopup digest={digest} onClose={dismissDigest} />
      ) : state.pending ? (
        <SituationPopup state={state} dispatch={dispatch} />
      ) : showOffer ? (
        <OfferPopup state={state} dispatch={dispatch} onLater={() => setDeferred(offerKey)} />
      ) : null}
    </div>
  );
}