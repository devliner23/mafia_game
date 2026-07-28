import {
  RANK_STANDING,
  SUPPORT_NEEDED,
  memberById,
  playerBacking,
  type Command,
  type Digest,
  type GameState,
  type PersonChange,
} from "../../sim";
import { Modal } from "./Modal";
/* --------------------------------------------------------------- aftermath */

/**
 * What that just cost you. Story on the left in the family's voice, numbers on
 * the right in the state's — the same typographic split the rest of the game
 * uses, because the difference between talk and evidence is the whole point.
 */
export function DigestPopup({ digest, onClose }: { digest: Digest; onClose: () => void }) {
  const tone =
    digest.kind === "ending"
      ? "bad"
      : digest.changes.some((c) => c.tone === "bad" && Math.abs(c.delta) > 20)
        ? "bad"
        : "neutral";

  return (
    <Modal
      title={digest.title}
      eyebrow={digest.subtitle ?? "What happened"}
      tone={tone}
      onClose={onClose}
      footer={
        <>
          {digest.waiting && <span className="waiting">{digest.waiting}</span>}
          <button className="primary" autoFocus onClick={onClose}>
            {digest.waiting ? "Go on" : "Noted"}
          </button>
        </>
      }
    >
      {digest.story.length > 0 && (
        <div className="story">
          {digest.story.map((l, i) => (
            <p key={i} className={`told ${l.tone}`}>
              {l.text}
            </p>
          ))}
        </div>
      )}

      {digest.changes.length > 0 && (
        <div className="deltas">
          {digest.changes.map((c) => (
            <div key={c.label} className={`delta ${c.tone}`}>
              <span className="k">{c.label}</span>
              <span className="v">{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {digest.people.length > 0 && (
        <div className="whoMoved">
          <p className="sectionLabel">Where that left people</p>
          {digest.people.map((p) => (
            <PersonRow key={p.crewId} p={p} />
          ))}
        </div>
      )}
    </Modal>
  );
}

const BECAME: Record<NonNullable<PersonChange["became"]>, string> = {
  dead: "dead",
  flipped: "cooperating",
  arrested: "picked up",
  joined: "came in",
  promoted: "moved up",
};

function PersonRow({ p }: { p: PersonChange }) {
  const dir = p.regardDelta > 0 ? "good" : p.regardDelta < 0 ? "bad" : "flat";
  return (
    <div className="person">
      <div className="pn">
        <b>{p.name}</b>
        <span className="rk">{p.rank}</span>
        {p.yours && <span className="tag">yours</span>}
        {p.became && <span className={`tag ${p.became}`}>{BECAME[p.became]}</span>}
      </div>
      {!p.became && (
        <div className={`pr ${dir}`}>
          <span className="amt">
            {p.regardDelta > 0 ? "+" : p.regardDelta < 0 ? "−" : ""}
            {Math.abs(p.regardDelta)}
          </span>
          <span className="scale" title={`Regard ${p.regard}`}>
            <i style={{ width: `${Math.round((p.regard + 100) / 2)}%` }} />
          </span>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- situation */

/**
 * The question. Blocking on purpose: you can walk away from it in the fiction
 * (the last option is always silence) but you cannot walk away from it in the
 * interface without saying so.
 */
export function SituationPopup({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (c: Command) => void;
}) {
  const sit = state.pending;
  if (!sit) return null;
  const from = memberById(state, sit.fromId);

  return (
    <Modal
      title={from ? `${from.name} wants an answer` : "They want an answer"}
      eyebrow={`Week ${sit.week}`}
      tone="bad"
      blocking
    >
      <p className="prompt">{sit.text}</p>
      <div className="answers">
        {sit.options.map((o, i) => (
          <button
            key={o.id}
            className="answer"
            autoFocus={i === 0}
            onClick={() => dispatch({ type: "resolve", optionId: o.id })}
          >
            <b>{o.label}</b>
            <span>{o.hint}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- promotion */

/** The seat. Shown once you clear both bars — the earning and the politics. */
export function OfferPopup({
  state,
  dispatch,
  onLater,
}: {
  state: GameState;
  dispatch: (c: Command) => void;
  onLater: () => void;
}) {
  const offer = state.offer;
  if (!offer) return null;
  const sponsor = memberById(state, offer.sponsorId);
  const need = SUPPORT_NEEDED[offer.rank];

  return (
    <Modal
      title={`They're making you ${offer.rank}`}
      eyebrow="A seat at the table"
      tone="good"
      footer={
        <>
          <button onClick={onLater}>Not yet</button>
          <button
            className="primary"
            autoFocus
            onClick={() => dispatch({ type: "take_promotion" })}
          >
            Take it
          </button>
        </>
      }
      onClose={onLater}
    >
      <p className="prompt">
        {sponsor?.name ?? "Somebody"} put your name forward and it went through. Every man
        who wanted this will know you took it, and the ones who came up alongside him will
        take it personally.
      </p>
      <div className="deltas">
        <div className="delta good">
          <span className="k">Standing</span>
          <span className="v">
            {state.standing} / {RANK_STANDING[offer.rank]}
          </span>
        </div>
        <div className="delta good">
          <span className="k">His regard</span>
          <span className="v">
            {Math.round(sponsor?.regard ?? 0)} / {need.sponsor}
          </span>
        </div>
        <div className="delta good">
          <span className="k">Behind you</span>
          <span className="v">
            {playerBacking(state).toFixed(1)} / {need.house}
          </span>
        </div>
      </div>
    </Modal>
  );
}