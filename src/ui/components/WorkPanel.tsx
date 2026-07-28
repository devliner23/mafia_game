import {
  CONFIG,
  COOLING,
  TRIBUTE_PCT,
  chainOfCommand,
  playerRank,
  rankIndex,
  type Command,
  type GameState,
} from "../../sim";
import { Panel, money } from "./Bits";

export function WorkPanel({
  state,
  selected,
  dispatch,
}: {
  state: GameState;
  selected: string[];
  dispatch: (c: Command) => void;
}) {
  const done = Boolean(state.over);
  const rank = playerRank(state);
  const jobs = CONFIG.jobs.filter((j) => rankIndex(rank) >= rankIndex(j.minRank));
  // At associate you do the work yourself; above that you must delegate.
  const needsCrew = rank !== "associate";
  const superior = chainOfCommand(state)[0];
  const tribute = Math.round(state.money * TRIBUTE_PCT);

  return (
    <>
      <Panel title="Work" note={needsCrew ? `${selected.length} selected` : "you, personally"}>
        {jobs.map((j) => {
          const short = needsCrew && selected.length < j.crewNeeded;
          return (
            <div key={j.id} className="job">
              <div>
                <div className="nm">{j.name}</div>
                <div className="meta">
                  {needsCrew ? `needs ${j.crewNeeded}` : "no crew needed"} · risk {j.difficulty}
                </div>
              </div>
              <div>
                <div className="pay">{money(j.payout)}</div>
                <button
                  disabled={done || short}
                  onClick={() => dispatch({ type: "run_job", jobId: j.id, crewIds: selected })}
                >
                  {short ? "Short-handed" : "Send"}
                </button>
              </div>
            </div>
          );
        })}
      </Panel>

      {superior && (
        <Panel title="Kicking up" note={`to ${superior.name}`}>
          <button
            disabled={done || tribute < 500}
            onClick={() => dispatch({ type: "kick_up" })}
          >
            Send {money(tribute)} up
          </button>
          <p className="hint">
            Earning gets you money. Being seen to earn gets you standing, and standing is
            what puts your name in the room when a seat opens.
          </p>
        </Panel>
      )}

      <Panel title="Cool off" note="evidence does not decay on its own">
        <div className="row">
          <button
            disabled={done || state.money < COOLING.cleanup.cost}
            onClick={() => dispatch({ type: "cleanup" })}
          >
            Clean a scene · {money(COOLING.cleanup.cost)}
          </button>
          <button disabled={done} onClick={() => dispatch({ type: "launder" })}>
            Wash the money · 18%
          </button>
          <button disabled={done} onClick={() => dispatch({ type: "lay_low" })}>
            Lie low
          </button>
        </div>
        <p className="hint">
          Lying low cools every track, but nobody earns and standing slips. Going quiet is
          supposed to cost you something.
        </p>
      </Panel>
    </>
  );
}