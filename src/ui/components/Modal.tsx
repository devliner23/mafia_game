import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The interruption.
 *
 * Rendered through a portal on document.body: the shell and its panels use
 * backdrop-filter, which makes them containing blocks for fixed positioning,
 * so a scrim rendered inline is fixed to the panel rather than the viewport.
 *
 * Two flavours: dismissible (an aftermath you've read) and blocking (a question
 * the game will not proceed without). Blocking modals have no close affordance
 * and swallow Escape, because "close the window" is not one of the answers.
 */
export function Modal({
  title,
  eyebrow,
  tone = "neutral",
  blocking = false,
  onClose,
  children,
  footer,
}: {
  title: string;
  eyebrow?: string | undefined;
  tone?: "neutral" | "good" | "bad" | undefined;
  blocking?: boolean | undefined;
  onClose?: (() => void) | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Held in a ref so a caller passing an inline arrow doesn't re-run the
  // effect on every render and yank focus back out of whatever you were using.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !blocking && close.current) {
        e.preventDefault();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey);

    // The page behind must not scroll under the scrim.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Send focus into the dialog so keyboard and screen-reader users land here.
    panel.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [blocking]);

  return createPortal(
    <div
      className="scrim"
      onMouseDown={(e) => {
        // mousedown, not click: a drag that starts inside and ends on the
        // scrim should not count as dismissing it.
        if (e.target === e.currentTarget && !blocking && close.current) close.current();
      }}
    >
      <div
        className={`modal ${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
      >
        <header>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </header>
        <div className="modalBody">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}