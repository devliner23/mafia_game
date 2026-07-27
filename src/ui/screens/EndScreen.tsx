import type { GameState } from "../../sim";
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
  const c = CLOSING[reason]!;
  const flipped = state.crew.filter((m) => m.status === "flipped").length;

  return (
    <div className="centre">
      <div className="closing">
        <p className="eyebrow">File closed</p>
        <h2>{c.head}</h2>
        <p>{c.line}</p>
        <div className="tally">
          <Stat k="name on the file" v={state.player.name} />
          <Stat k="weeks" v={String(state.over?.week ?? state.week)} />
          <Stat k="rank reached" v={state.rank} />
          <Stat k="on hand" v={money(state.money)} />
          <Stat k="men recruited" v={String(state.crew.length)} />
          <Stat k="men who talked" v={String(flipped)} />
        </div>
        <button className="primary" onClick={onAgain}>Start a new file</button>
      </div>
    </div>
  );
}
