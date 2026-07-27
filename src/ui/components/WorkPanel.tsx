import { CONFIG, COOLING, rankIndex, type Command, type GameState } from "../../sim";
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
  const jobs = CONFIG.jobs.filter((j) => rankIndex(state.rank) >= rankIndex(j.minRank));
  // At associate you do the work yourself; above that you must delegate.
  const needsCrew = state.rank !== "associate";

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

      <button
        className="primary"
        style={{ width: "100%", padding: 15, fontSize: 12 }}
        disabled={done}
        onClick={() => dispatch({ type: "end_week" })}
      >
        End week {state.week} →
      </button>
    </>
  );
}
