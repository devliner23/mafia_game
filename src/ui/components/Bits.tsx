import type { ReactNode } from "react";

export function Panel({
  title,
  note,
  className,
  style,
  children,
}: {
  title: string;
  note?: string | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  children: ReactNode;
}) {
  return (
    <section className={className ? `panel ${className}` : "panel"} style={style}>
      <h2>
        <span>{title}</span>
        {note && <span className="note">{note}</span>}
      </h2>
      <div className="body">{children}</div>
    </section>
  );
}

export function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="stat">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

export function Attr({ k, v, tone }: { k: string; v: number; tone?: string | undefined }) {
  const low = v < 35 ? " low" : "";
  return (
    <div className={`attr ${tone ?? ""}${low}`}>
      <span className="k">{k}</span>
      <div className="bar">
        <i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </div>
    </div>
  );
}

export const money = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
