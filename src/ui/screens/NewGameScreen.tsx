import { useState } from "react";
import { BACKGROUNDS, type BackgroundId, type NewGameOptions } from "../../sim";
import { money } from "../components/Bits";

/**
 * The seed is exposed on purpose: the sim is deterministic, so the same seed
 * and the same choices reproduce a run exactly. That makes shared runs and
 * reproducible bug reports possible.
 */
export function NewGameScreen({
  onBegin,
  onBack,
}: {
  onBegin: (seed: string, options: NewGameOptions) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [background, setBackground] = useState<BackgroundId>("corner");
  const [seed, setSeed] = useState(() => String(Date.now()).slice(-8));

  const valid = name.trim().length > 0 && seed.trim().length > 0;

  return (
    <div className="centre">
      <p className="eyebrow">Intake</p>
      <h1 className="brand" style={{ fontSize: 38 }}>
        Who are <em>you</em>?
      </h1>
      <p className="tag">
        None of this is a difficulty setting. Each start buys you something and charges you
        for it somewhere else.
      </p>

      <div className="formRow">
        <label htmlFor="nm">Name on the file</label>
        <input
          id="nm"
          value={name}
          maxLength={28}
          placeholder="Michael Fontana"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="formRow">
        <label>Where you came from</label>
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            className="pick"
            aria-pressed={background === b.id}
            onClick={() => setBackground(b.id)}
          >
            <b>{b.name}</b>
            <span className="blurb">{b.blurb}</span>
            <span className="cost">
              {money(b.money)} · standing {b.standing}
              {b.ledger.financial > 0 && ` · ${b.ledger.financial} financial already on the books`}
              {b.ledger.testimonial > 0 && ` · ${b.ledger.testimonial} testimonial already on the books`}
            </span>
          </button>
        ))}
      </div>

      <div className="formRow">
        <label htmlFor="sd">Seed — same seed, same run</label>
        <input id="sd" value={seed} maxLength={16} onChange={(e) => setSeed(e.target.value)} />
      </div>

      <div className="row">
        <button
          className="primary"
          disabled={!valid}
          onClick={() => onBegin(seed.trim(), { name: name.trim(), background })}
        >
          Open the file
        </button>
        <button onClick={onBack}>Back</button>
      </div>
    </div>
  );
}
