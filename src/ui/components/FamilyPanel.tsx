import {
  MOVE_COST,
  REASSURE_COST,
  chainOfCommand,
  moveOdds,
  headcount,
  leadership,
  me,
  memberById,
  playerFamily,
  type Command,
  type Crew,
  type GameState,
} from "../../sim";
import { Panel, money } from "./Bits";


const label = (c: Crew): string => (c.consigliere ? "consigliere" : c.rank);

/**
 * The chart. Every organisation in this game is a line of men standing between
 * you and a chair, so the interface says so literally: the boss at the top, you
 * at the bottom, and the exact number of people in between.
 */
export function FamilyPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (c: Command) => void;
}) {
  const fam = playerFamily(state);
  const you = me(state);
  const heads = headcount(fam);
  const { boss, underboss, consigliere } = leadership(state, fam);
  const chain = chainOfCommand(state);
  const done = Boolean(state.over);
  const total = fam.members.filter((m) => m.status === "active").length;

  // Top of the house, then everyone between you and them, then you.
  const rungs: Crew[] = [...chain].reverse();
  const above = rungs.filter((c) => c.id !== boss?.id && c.id !== underboss?.id);

  return (
    <>
      <Panel title={`The ${fam.name} family`} note={`${total} on the chart`}>
        <div className="chart">
          {boss && boss.id !== you.id && (
            <Rung c={boss} seat="boss" you={you} dispatch={dispatch} done={done} state={state} />
          )}
          <div className="pair">
            {underboss && underboss.id !== you.id && (
              <Rung c={underboss} seat="underboss" you={you} dispatch={dispatch} done={done} state={state} />
            )}
            {consigliere && consigliere.id !== you.id && (
              <Rung c={consigliere} seat="consigliere" you={you} dispatch={dispatch} done={done} state={state} />
            )}
          </div>
          {above.map((c) => (
            <Rung key={c.id} c={c} seat={label(c)} you={you} dispatch={dispatch} done={done} state={state} />
          ))}
          <Rung c={you} seat={label(you)} you={you} dispatch={dispatch} done={done} state={state} />
        </div>

        <div className="counts">
          <Count k="capos" v={heads.capo} />
          <Count k="soldiers" v={heads.soldier} />
          <Count k="associates" v={heads.associate} />
        </div>
      </Panel>

      <Panel title="The city" note={`${state.families.length} families`}>
        {state.families.map((f) => {
          const b = memberById(state, f.bossId);
          return (
            <div key={f.id} className={`house ${f.id === fam.id ? "mine" : ""}`}>
              <div>
                <div className="nm">{f.name}</div>
                <div className="meta">
                  {b ? b.name : "no boss"} · {f.members.filter((m) => m.status === "active").length} men
                </div>
              </div>
              <span className="rep">{Math.round(f.reputation)}</span>
            </div>
          );
        })}
      </Panel>
    </>
  );
}

function Rung({
  c,
  seat,
  you,
  state,
  dispatch,
  done,
}: {
  c: Crew;
  seat: string;
  you: Crew;
  state: GameState;
  dispatch: (c: Command) => void;
  done: boolean;
}) {
  const isYou = c.id === you.id;
  const isSuperior = you.superiorId === c.id;

  return (
    <div className={`rung${isYou ? " you" : ""}${isSuperior ? " over" : ""}`}>
      <span className="seat">{seat}</span>
      <span className="who">{isYou ? `${c.name} — you` : c.name}</span>
      {isSuperior && (
        <div className="row">
          <button
            disabled={done || state.money < REASSURE_COST}
            onClick={() => dispatch({ type: "reassure", crewId: c.id })}
            title="Stay on good terms with the man above you"
          >
            Sit down · {money(REASSURE_COST)}
          </button>
          <button
            className="move"
            disabled={done || you.rank === "associate" || state.money < MOVE_COST}
            onClick={() => dispatch({ type: "make_a_move" })}
            title="Your men against his men. Lose and the file closes here."
          >
            Move on him · {Math.round(moveOdds(state) * 100)}%
          </button>
        </div>
      )}
    </div>
  );
}

function Count({ k, v }: { k: string; v: number }) {
  return (
    <div className="count">
      <span className="v">{v}</span>
      <span className="k">{k}</span>
    </div>
  );
}