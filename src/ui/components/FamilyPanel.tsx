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

/** Plain-English gloss on a -100..100 standing between two houses. */
function standing(v: number): string {
  if (v <= -50) return "at war";
  if (v <= -22) return "bad blood";
  if (v < 15) return "business";
  if (v < 45) return "friendly";
  return "allied";
}

/**
 * The chart. Every organisation in this game is a line of men standing between
 * you and a chair, so the interface says so literally: the boss at the top, you
 * at the bottom, and the exact number of people in between. Below it, the rest
 * of the city — every other house, who runs it, how big it is, and where it
 * stands with yours.
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

  // Everyone else in the city — the other crews.
  const others = state.families.filter((f) => f.id !== fam.id);

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

      <Panel title="The other crews" note={`${others.length} in the city`}>
        {others.length === 0 ? (
          <div className="meta">Nobody else on the board.</div>
        ) : (
          others.map((f) => {
            const b = memberById(state, f.bossId);
            const men = f.members.filter((m) => m.status === "active").length;
            const rel = fam.relations[f.id] ?? 0;
            const why = fam.relationWhy?.[f.id];
            return (
              <div key={f.id} className="house">
                <div>
                  <div className="nm">{f.name}</div>
                  <div className="meta">
                    {b ? b.name : "no boss"} · {men} men · {standing(rel)}
                  </div>
                  {why && <div className="meta why">{why}</div>}
                </div>
                <span className="rep">{Math.round(f.reputation)}</span>
              </div>
            );
          })
        )}
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