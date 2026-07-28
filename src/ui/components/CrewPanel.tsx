import {
  REASSURE_COST,
  RECRUIT_COST,
  activeCrew,
  coupThreat,
  crewCap,
  playerRank,
  type Command,
  type Crew,
  type GameState,
} from "../../sim";
import { Attr, Panel, money } from "./Bits";

export function CrewPanel({
  state,
  selected,
  onToggle,
  dispatch,
}: {
  state: GameState;
  selected: string[];
  onToggle: (id: string) => void;
  dispatch: (c: Command) => void;
}) {
  const rank = playerRank(state);
  const active = activeCrew(state);
  const cap = crewCap(rank);
  const done = Boolean(state.over);

  return (
    <Panel title="Your people" note={`${active.length} / ${cap}`}>
      <button
        onClick={() => dispatch({ type: "recruit" })}
        disabled={done || cap === 0 || active.length >= cap || state.money < RECRUIT_COST}
      >
        Take someone on · {money(RECRUIT_COST)}
      </button>

      {active.length === 0 ? (
        <p className="empty">
          {cap === 0
            ? "You don't have men. You are one. Earn until somebody puts your name forward."
            : "Nobody left. Take someone on before the next earn."}
        </p>
      ) : (
        active.map((c) => (
          <Man
            key={c.id}
            c={c}
            selected={selected.includes(c.id)}
            onToggle={() => onToggle(c.id)}
            dispatch={dispatch}
            canPay={state.money >= REASSURE_COST}
            done={done}
          />
        ))
      )}
    </Panel>
  );
}

function Man({
  c,
  selected,
  onToggle,
  dispatch,
  canPay,
  done,
}: {
  c: Crew;
  selected: boolean;
  onToggle: () => void;
  dispatch: (cmd: Command) => void;
  canPay: boolean;
  done: boolean;
}) {
  const threat = coupThreat(c);

  return (
    <div
      className="man"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="nm">
        <b>{c.name}</b>
        <span className="rk">{c.rank}</span>
        {/* The player is meant to be able to see it coming. */}
        {threat > 0.34 && <span className="flag hot">restless</span>}
        {c.grudges > 0 && <span className="flag">passed over ×{c.grudges}</span>}
      </div>

      <div className="attrs">
        <Attr k="cmp" v={c.competence} />
        <Attr k="loy" v={c.loyalty} tone="loy" />
        <Attr k="amb" v={c.ambition} tone="amb" />
        <Attr k="dsc" v={c.discretion} />
      </div>

      <div className="row">
        <button
          disabled={done}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "promote", crewId: c.id });
          }}
        >
          Promote
        </button>
        <button
          disabled={done || !canPay}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "reassure", crewId: c.id });
          }}
        >
          Sit down · {money(REASSURE_COST)}
        </button>
      </div>
    </div>
  );
}