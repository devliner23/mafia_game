import { playerFamily, playerRank, type GameState } from "../../sim";
import { Stat, money } from "../components/Bits";

const CLOSING: Record<string, { head: string; line: string }> = {
  coup: {
    head: "Succession",
    line: "It was someone you promoted. It usually is — you taught him he could move up.",
  },
  indicted: {
    head: "The case closed",
    line: "None of this happened quickly. It was built a week at a time, and you signed most of it.",
  },
  retired: {
    head: "Out",
    line: "You got out with your name and your freedom. Almost nobody does.",
  },
};

export function EndScreen({ state, onAgain }: { state: GameState; onAgain: () => void }) {
  const reason = state.over?.reason ?? "indicted";
  const c =
    state.over?.detail === "failed_move"
      ? {
          head: "You went at him",
          line: "You counted the men behind you and got the number wrong. Everybody counts it after.",
        }
      : CLOSING[reason]!;
  const fam = playerFamily(state);
  const flipped = fam.members.filter((m) => m.status === "flipped").length;
  const yours = fam.members.filter((m) => m.superiorId === "player").length;

  return (
    <div className="centre">
      <div className="closing">
        <p className="eyebrow">File closed</p>
        <h2>{c.head}</h2>
        <p>{c.line}</p>
        <div className="tally">
          <Stat k="name on the file" v={state.player.name} />
          <Stat k="weeks" v={String(state.over?.week ?? state.week)} />
          <Stat k="rank reached" v={playerRank(state)} />
          <Stat k="family" v={fam.name} />
          <Stat k="on hand" v={money(state.money)} />
          <Stat k="men under you" v={String(yours)} />
          <Stat k="men who talked" v={String(flipped)} />
        </div>
        <button className="primary" onClick={onAgain}>Start a new file</button>
      </div>
    </div>
  );
}