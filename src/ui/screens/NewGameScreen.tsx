import { useMemo, useState } from "react";
import {
  ERAS,
  eraById,
  housesInEra,
  houseNameAt,
  settingById,
  originsForEra,
  openingFor,
  type NewGameOptions,
  type Rank,
} from "../../sim";
import { money } from "../components/Bits";

export function NewGameScreen({
  onBegin,
  onBack,
}: {
  onBegin: (seed: string, options: NewGameOptions) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [eraId, setEraId] = useState<string>(ERAS[0]!.id);
  const [houseId, setHouseId] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [entryRank, setEntryRank] = useState<Rank>("associate");
  const [seed, setSeed] = useState(() => String(Date.now()).slice(-8));

  const era = eraById(eraId)!;
  const setting = settingById(era.setting);

  const houses = useMemo(() => housesInEra(era), [era]);
  const at = useMemo(() => {
    const d = new Date(Date.parse(era.start));
    return [d.getUTCFullYear(), d.getUTCMonth() + 1] as const;
  }, [era]);
  
  const origins = useMemo(() => originsForEra(era.id), [era]);
  const entryRanks = era.entryRanks;

  const activeHouseId = houses.some((h) => h.id === houseId) ? houseId : houses[0]?.id ?? "";
  const activeOrigin = origins.some((o) => o.id === origin) ? origin : origins[0]?.id ?? "";
  const activeRank: Rank = entryRanks.includes(entryRank as "associate" | "soldier")
    ? entryRank
    : entryRanks[0] ?? "associate";

  const opening = openingFor(era.id, activeHouseId);
  const chosenOrigin = origins.find((o) => o.id === activeOrigin);

  const eraYears = useMemo(() => {
    const a = new Date(Date.parse(era.start)).getUTCFullYear();
    const b = new Date(Date.parse(era.end)).getUTCFullYear();
    return a === b ? `${a}` : `${a}–${b}`;
  }, [era]);

  // Sort arrays so the active item is always rendered first in the grid
  const sortedEras = [...ERAS].sort((a, b) => (a.id === eraId ? -1 : b.id === eraId ? 1 : 0));
  const sortedHouses = [...houses].sort((a, b) => (a.id === activeHouseId ? -1 : b.id === activeHouseId ? 1 : 0));
  const sortedOrigins = [...origins].sort((a, b) => (a.id === activeOrigin ? -1 : b.id === activeOrigin ? 1 : 0));
  const sortedRanks = [...entryRanks].sort((a, b) => (a === activeRank ? -1 : b === activeRank ? 1 : 0));

  const valid =
    name.trim().length > 0 &&
    seed.trim().length > 0 &&
    Boolean(activeHouseId) &&
    Boolean(activeOrigin);

  const begin = () => {
    if (!valid) return;
    onBegin(seed.trim(), {
      name: name.trim(),
      eraId: era.id,
      houseId: activeHouseId,
      origin: activeOrigin,
      entryRank: activeRank,
    });
  };

  const renderDetailRow = (label: string, value: string | number, color?: string) => (
    <div className="cs-detail-row">
      <span className="cs-detail-label">{label}</span>
      <span className="cs-detail-value" style={{ color: color || '#e2e8f0' }}>{value}</span>
    </div>
  );

  return (
    <>
      <style>{`
        .ngs-scope {
          min-height: 100vh;
          background: #020617;
          background-image: 
            radial-gradient(circle at 10% 10%, rgba(30, 41, 59, 0.6) 0%, transparent 40%),
            radial-gradient(circle at 90% 90%, rgba(15, 23, 42, 0.8) 0%, transparent 40%);
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 3rem 1rem;
          display: flex;
          justify-content: center;
        }
        .ngs-glass-card {
          width: 100%;
          max-width: 820px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 24px;
          padding: 3rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        @media (max-width: 640px) { .ngs-glass-card { padding: 1.5rem; } }

        .ngs-header { margin-bottom: 2.5rem; text-align: center; }
        .ngs-eyebrow {
          text-transform: uppercase; letter-spacing: 3px; font-size: 12px;
          color: #38bdf8; margin: 0 0 0.5rem 0; font-weight: 600;
        }
        .ngs-title {
          font-size: 38px; margin: 0 0 1rem 0; font-weight: 800;
          background: linear-gradient(to right, #f8fafc, #94a3b8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ngs-subtitle { color: #94a3b8; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        .ngs-identity-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
          margin-bottom: 3rem; padding-bottom: 2rem;
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
        }
        @media (max-width: 640px) { .ngs-identity-row { grid-template-columns: 1fr; } }
        
        .ngs-input-group label {
          display: block; font-size: 11px; text-transform: uppercase;
          letter-spacing: 1.5px; color: #64748b; margin-bottom: 0.5rem; font-weight: 700;
        }
        .ngs-input {
          width: 100%; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(71, 85, 105, 0.4);
          border-radius: 6px; padding: 14px 16px; color: #f8fafc; font-size: 16px;
          transition: all 0.2s ease; box-sizing: border-box; font-family: inherit;
        }
        .ngs-input:focus {
          outline: none; border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        /* Timeline / Roadmap Path */
        .ngs-timeline { position: relative; padding-left: 40px; }
        .ngs-timeline::before {
          content: ''; position: absolute; left: 15px; top: 10px; bottom: 10px;
          width: 2px; background: rgba(71, 85, 105, 0.3);
        }
        
        .ngs-step { position: relative; margin-bottom: 2.5rem; }
        .ngs-step:last-child { margin-bottom: 0; }
        
        .ngs-step-marker {
          position: absolute; left: -40px; top: 0; width: 32px; height: 32px;
          background: #020617; border: 2px solid #334155; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #64748b; font-weight: 700; font-size: 14px; z-index: 2;
          transition: all 0.3s ease;
        }
        .ngs-step.is-active .ngs-step-marker {
          border-color: #38bdf8; color: #38bdf8;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
        }

        .ngs-step-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
          color: #64748b; margin-bottom: 0.5rem; font-weight: 700;
        }
        .ngs-step-title {
          font-size: 20px; color: #f1f5f9; margin: 0 0 1.25rem 0; font-weight: 600;
        }

        /* Center Stage Panel (At the top of the list) */
        .cs-panel-top {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-bottom: none;
          padding: 1.5rem;
          margin-bottom: -1px; /* Connect to grid border perfectly */
          z-index: 2;
          position: relative;
          animation: csSlideDown 0.3s ease-out;
        }
        @keyframes csSlideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cs-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; border-bottom: 1px solid rgba(71,85,105,0.2); padding-bottom: 0.75rem; }
        .cs-title { font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0; }
        .cs-tag { font-size: 12px; color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .cs-blurb { font-size: 14px; color: #cbd5e1; line-height: 1.5; margin: 0 0 1rem 0; }
        .cs-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (max-width: 480px) { .cs-detail-grid { grid-template-columns: 1fr; } }
        .cs-detail-row {
          background: rgba(2, 6, 23, 0.4);
          padding: 0.5rem 0.75rem;
          border-left: 2px solid #334155;
          display: flex; flex-direction: column; gap: 2px;
        }
        .cs-detail-label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
        .cs-detail-value { font-size: 13px; font-weight: 600; color: #e2e8f0; }
        .cs-warning { color: #f87171; font-size: 13px; margin-top: 1rem; font-weight: 500; }

        /* Connected Grid System */
        .ngs-connected-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 1px;
          border: 1px solid rgba(71, 85, 105, 0.25);
        }
        
        .ngs-cell {
          background: #020617;
          border: none;
          padding: 1.25rem 0.5rem;
          cursor: pointer;
          color: #cbd5e1;
          transition: all 0.2s ease;
          font-family: inherit;
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          gap: 4px;
          min-height: 80px;
          text-align: center;
          opacity: 0.35; /* Almost transparent when not selected */
        }
        .ngs-cell:hover {
          opacity: 0.7;
          background: #0f172a;
        }
        .ngs-cell[aria-pressed="true"] {
          opacity: 1;
          background: rgba(56, 189, 248, 0.1);
          box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.5);
        }
        
        .cell-title { font-weight: 700; font-size: 15px; color: #f8fafc; line-height: 1.2; }
        .cell-sub { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Footer */
        .ngs-footer {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(71, 85, 105, 0.3);
          flex-wrap: wrap; gap: 1rem;
        }
        .ngs-footer-info { color: #94a3b8; font-size: 13px; line-height: 1.5; }
        .ngs-footer-info b { color: #e2e8f0; }
        
        .ngs-actions { display: flex; gap: 1rem; }
        .ngs-btn {
          padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px;
          cursor: pointer; border: none; transition: all 0.2s ease; font-family: inherit;
        }
        .ngs-btn-secondary { background: transparent; border: 1px solid #334155; color: #cbd5e1; }
        .ngs-btn-secondary:hover { background: rgba(51, 65, 85, 0.5); }
        .ngs-btn-primary {
          background: linear-gradient(to right, #0ea5e9, #2563eb); color: white;
          box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
        }
        .ngs-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
        }
        .ngs-btn-primary:disabled { background: #1e293b; color: #475569; cursor: not-allowed; box-shadow: none; }
      `}</style>

      <div className="ngs-scope">
        <div className="ngs-glass-card">
          
          <header className="ngs-header">
            <p className="ngs-eyebrow">Intake</p>
            <h1 className="ngs-title">Who are <em>you</em>?</h1>
            <p className="ngs-subtitle">
              None of this is a difficulty setting. Each start buys you something and charges you for it somewhere else.
            </p>
          </header>

          <div className="ngs-identity-row">
            <div className="ngs-input-group">
              <label htmlFor="nm">Name on the file</label>
              <input
                id="nm"
                className="ngs-input"
                value={name}
                maxLength={28}
                placeholder="Michael Fontana"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="ngs-input-group">
              <label htmlFor="sd">Seed — same seed, same run</label>
              <input
                id="sd"
                className="ngs-input"
                value={seed}
                maxLength={16}
                onChange={(e) => setSeed(e.target.value)}
              />
            </div>
          </div>

          <div className="ngs-timeline">
            
            {/* STEP 1: ERA */}
            <div className={`ngs-step ${eraId ? 'is-active' : ''}`}>
              <div className="ngs-step-marker">1</div>
              <div className="ngs-step-label">When you come in</div>
              <h3 className="ngs-step-title">The Era</h3>
              
              {eraId && (
                <div className="cs-panel-top" key={eraId}>
                  <div className="cs-header">
                    <h4 className="cs-title">{era.name}</h4>
                    <span className="cs-tag">{setting.name} · {eraYears}</span>
                  </div>
                  <p className="cs-blurb">{era.premise}</p>
                  <div className="cs-detail-grid">
                    {renderDetailRow("Headline", era.headline)}
                  </div>
                </div>
              )}

              <div className="ngs-connected-grid">
                {sortedEras.map((e) => {
                  const a = new Date(Date.parse(e.start)).getUTCFullYear();
                  const b = new Date(Date.parse(e.end)).getUTCFullYear();
                  const years = a === b ? `${a}` : `${a}–${b}`;
                  return (
                    <button
                      key={e.id}
                      className="ngs-cell"
                      aria-pressed={e.id === eraId}
                      onClick={() => setEraId(e.id)}
                    >
                      <span className="cell-title">{e.name}</span>
                      <span className="cell-sub">{years}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: HOUSE */}
            <div className={`ngs-step ${activeHouseId ? 'is-active' : ''}`}>
              <div className="ngs-step-marker">2</div>
              <div className="ngs-step-label">Which {setting.houseWord} you come up under</div>
              <h3 className="ngs-step-title">The Allegiance</h3>
              
              {activeHouseId && (() => {
                const h = houses.find(x => x.id === activeHouseId)!;
                const open = openingFor(era.id, h.id);
                const bossInfo = open?.boss.of_record 
                  ? `Run by ${open.boss.of_record.who}` 
                  : open?.boss.front 
                    ? `Fronted by ${open.boss.front.who}` 
                    : "Leadership unclear";

                return (
                  <div className="cs-panel-top" key={activeHouseId}>
                    <div className="cs-header">
                      <h4 className="cs-title">{houseNameAt(h, at)}</h4>
                      <span className="cs-tag">{setting.houseWord}</span>
                    </div>
                    <div className="cs-detail-grid">
                      {renderDetailRow("Leadership", bossInfo)}
                      {renderDetailRow("Turf", h.turf.join(", ") || "Unknown")}
                      {renderDetailRow("Rackets", h.rackets.slice(0, 4).join(" · ") || "None")}
                    </div>
                  </div>
                );
              })()}

              <div className="ngs-connected-grid">
                {sortedHouses.map((h) => (
                  <button
                    key={h.id}
                    className="ngs-cell"
                    aria-pressed={h.id === activeHouseId}
                    onClick={() => setHouseId(h.id)}
                  >
                    <span className="cell-title">{houseNameAt(h, at)}</span>
                    <span className="cell-sub">{h.turf[0] || "Unknown Turf"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 3: ORIGIN */}
            <div className={`ngs-step ${activeOrigin ? 'is-active' : ''}`}>
              <div className="ngs-step-marker">3</div>
              <div className="ngs-step-label">Where you came from</div>
              <h3 className="ngs-step-title">The Origin</h3>

              {activeOrigin && chosenOrigin && (() => {
                const open = openingFor(era.id, activeHouseId);
                const purse = open ? open.purseFor(chosenOrigin) : chosenOrigin.purse;
                const canBeMade = open ? open.canEverBeMade(chosenOrigin) : true;

                return (
                  <div className="cs-panel-top" key={activeOrigin}>
                    <div className="cs-header">
                      <h4 className="cs-title">{chosenOrigin.name}</h4>
                      <span className="cs-tag">Standing {chosenOrigin.standing}</span>
                    </div>
                    <p className="cs-blurb">{chosenOrigin.blurb}</p>
                    <div className="cs-detail-grid">
                      {renderDetailRow("Purse", money(purse))}
                      {renderDetailRow("Initiation", canBeMade ? "Eligible" : "Never", canBeMade ? '#4ade80' : '#f87171')}
                      {chosenOrigin.ledger.financial > 0 && renderDetailRow("Financial Debt", chosenOrigin.ledger.financial, '#f87171')}
                      {chosenOrigin.ledger.testimonial > 0 && renderDetailRow("Testimonial Debt", chosenOrigin.ledger.testimonial, '#f87171')}
                    </div>
                  </div>
                );
              })()}

              <div className="ngs-connected-grid">
                {sortedOrigins.map((o) => {
                  const open = openingFor(era.id, activeHouseId);
                  const purse = open ? open.purseFor(o) : o.purse;
                  return (
                    <button
                      key={o.id}
                      className="ngs-cell"
                      aria-pressed={o.id === activeOrigin}
                      onClick={() => setOrigin(o.id)}
                    >
                      <span className="cell-title">{o.name}</span>
                      <span className="cell-sub">{money(purse)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 4: RANK */}
            <div className={`ngs-step ${activeRank ? 'is-active' : ''}`}>
              <div className="ngs-step-marker">4</div>
              <div className="ngs-step-label">The rung you come in at</div>
              <h3 className="ngs-step-title">The Rank</h3>
              
              {activeRank && (
                <div className="cs-panel-top" key={activeRank}>
                  <div className="cs-header">
                    <h4 className="cs-title">{setting.rankLabels[activeRank]}</h4>
                  </div>
                  <p className="cs-blurb" style={{ marginBottom: 0 }}>
                    {activeRank === "associate"
                      ? "Around the family, not of it. Everything to prove."
                      : "Already made. A place at the table, and everything that comes with it."}
                  </p>
                  {chosenOrigin && opening && !opening.canEverBeMade(chosenOrigin) && activeRank !== "associate" && (
                    <p className="cs-warning">
                      This origin cannot be initiated here — you will remain an associate.
                    </p>
                  )}
                </div>
              )}

              <div className="ngs-connected-grid">
                {sortedRanks.map((r) => (
                  <button
                    key={r}
                    className="ngs-cell"
                    aria-pressed={r === activeRank}
                    onClick={() => setEntryRank(r)}
                  >
                    <span className="cell-title">{setting.rankLabels[r]}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="ngs-footer">
            <div className="ngs-footer-info">
              <b>{setting.name}</b> · {eraYears}<br/>
              {era.playingNote}
            </div>
            <div className="ngs-actions">
              <button className="ngs-btn ngs-btn-secondary" onClick={onBack}>Back</button>
              <button className="ngs-btn ngs-btn-primary" disabled={!valid} onClick={begin}>
                Open the file
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}