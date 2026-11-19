/**
 * Click-to-expand wrapper for the plot panels. The inline plots are small
 * (a COA card thumbnail is ~128px tall), which is fine for glancing and
 * useless for actually reading unit labels - so any plot can be opened
 * full-screen.
 *
 * `zoomed` is a SEPARATE render of the same content rather than a reuse of
 * `children`: the editable sketch attaches a ref and pointer handlers to its
 * <svg> for dragging, and mounting that same element twice would leave the
 * ref pointing at whichever copy mounted last, breaking drag coordinates in
 * the other. Callers pass a plain, non-interactive render for the overlay.
 *
 * `interactive` (the editable sketch) suppresses click-anywhere-to-open, so
 * dragging a unit doesn't fire the zoom; the corner button still works.
 */
import { useEffect, type ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { ExpandIcon } from "./icons";

interface Props {
  children: ReactNode;
  zoomed: ReactNode;
  /** Caption shown under the enlarged plot - keeps the "not a map" caveat visible when zoomed. */
  caption?: string;
  interactive?: boolean;
}

export function PlotZoom({ children, zoomed, caption, interactive = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the overlay.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <div
        className={`plot-zoom${interactive ? "" : " is-clickable"}`}
        onClick={interactive ? undefined : () => setOpen(true)}
      >
        {children}
        <button
          type="button"
          className="plot-zoom-btn"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          aria-label={t("plot.expand") ?? undefined}
          title={t("plot.expand") ?? undefined}
        >
          <ExpandIcon size={13} />
        </button>
      </div>

      {/* Portalled to <body> deliberately. A COA card carries a CSS
          `transform` from its entrance animation, and a transformed ancestor
          becomes the containing block for `position: fixed` descendants - so
          rendering this inline trapped the "full screen" overlay inside the
          card it was launched from. */}
      {open &&
        createPortal(
          <div
            className="plot-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={t("plot.expand") ?? undefined}
            onClick={() => setOpen(false)}
          >
            <div className="plot-overlay-inner" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="plot-overlay-close btn"
                onClick={() => setOpen(false)}
                aria-label={t("plot.close") ?? undefined}
              >
                {t("plot.close")}
              </button>
              <div className="plot-overlay-figure">{zoomed}</div>
              {caption && <div className="plot-overlay-caption eyebrow">{caption}</div>}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
