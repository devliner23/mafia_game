import { useEffect, useRef, type ReactNode } from "react";

/**
 * The interruption.
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !blocking && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    // Send focus into the dialog so keyboard and screen-reader users land here.
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [blocking, onClose]);

  return (
    <div
      className="scrim"
      onClick={() => {
        if (!blocking && onClose) onClose();
      }}
    >
      <div
        className={`modal ${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </header>
        <div className="modalBody">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}