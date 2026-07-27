import type { FeedLine } from "../../sim";
import { Panel } from "./Bits";

/**
 * A read model over the same events that drive the sim. It holds no state and
 * makes no decisions, so it cannot tell the player something the sim did not do.
 */
export function FeedPanel({ feed }: { feed: FeedLine[] }) {
  return (
    <Panel title="Word on the street" note={feed.length > 0 ? String(feed.length) : undefined}>
      {feed.length === 0 ? (
        <p className="empty">Nothing yet. End a week and people will start talking.</p>
      ) : (
        <div className="feed">
          {feed.map((l, i) => (
            <div key={i} className={`line ${l.tone}`}>
              <span className="wk">week {l.week}</span>
              {l.text}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
