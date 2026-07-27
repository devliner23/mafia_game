import type { CSSProperties } from "react";
import { caseProgress, indictmentThreshold, type GameState } from "../../sim";
import { Panel } from "./Bits";

const TRACKS = ["physical", "financial", "testimonial"] as const;

const NOTE: Record<(typeof TRACKS)[number], string> = {
  physical: "scenes, weapons, bodies",
  financial: "money that can't be explained",
  testimonial: "people who can say what you did",
};

/**
 * The signature block. The panel itself is the meter — as the case builds, the
 * glass warms from slate toward rose and lights from below. Everything else in
 * the interface stays quiet so this has somewhere to land.
 */
export function LedgerPanel({ state }: { state: GameState }) {
  const progress = caseProgress(state);
  const pct = Math.round(progress * 100);

  return (
    <Panel
      title="The Ledger"
      note={`threshold ${indictmentThreshold(state)}`}
      className="ledger"
      style={{ "--case": Math.min(1, progress) } as CSSProperties}
    >
      {TRACKS.map((t) => (
        <div key={t} className={`track ${t}`} title={NOTE[t]}>
          <span className="k">{t}</span>
          <div className="bar">
            <i style={{ width: `${Math.min(100, state.ledger[t] * 1.6)}%` }} />
          </div>
          <span className="n">{state.ledger[t].toFixed(1)}</span>
        </div>
      ))}

      <div className="caseline">
        <span>case built</span>
        {progress >= 0.75 && !state.over ? (
          <span className="chip">
            <i className="dot" />
            {progress >= 1 ? "indicted" : "pending indictment"}
          </span>
        ) : (
          <b>{pct}%</b>
        )}
      </div>
    </Panel>
  );
}
