import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Coa, LaydownSketch, Scenario } from "../types/schema";
import { CoaCard } from "./CoaCard";
import { CoaCompareView } from "./CoaCompareView";
import { RouteIcon } from "./icons";

interface Props {
  coas: Coa[];
  /** Imported scenario, if any - drives the per-card schematic thumbnail. */
  scenario: Scenario | null;
  /** Text-derived sketch, used for card thumbnails when there's no scenario.json. */
  sketch: LaydownSketch | null;
  onRevise: (coaId: string, changeRequest: string) => void;
  revisingCoaId: string | null;
  onExport: (coaId: string) => void;
  exportingCoaId: string | null;
  returnUrl: string | null;
  onReturnToWorkstation: (coaId: string) => void;
}

export function CoaTabs({
  coas,
  scenario,
  sketch,
  onRevise,
  revisingCoaId,
  onExport,
  exportingCoaId,
  returnUrl,
  onReturnToWorkstation,
}: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<"cards" | "compare">("cards");

  if (coas.length === 0) return null;

  const showCompare = view === "compare" && coas.length > 1;

  return (
    <section className="stack" id="coa-section" aria-labelledby="coa-heading">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8 }}>
          <RouteIcon size={18} />
          <h2 id="coa-heading" style={{ margin: 0 }}>
            {t("coa.heading")}
          </h2>
        </div>
        {coas.length > 1 && (
          <div className="row" style={{ gap: 6 }} role="group" aria-label={t("coa.view_toggle_label") ?? undefined}>
            <button
              type="button"
              className={`btn${view === "cards" ? " btn-primary" : ""}`}
              onClick={() => setView("cards")}
              aria-pressed={view === "cards"}
            >
              {t("coa.view_cards")}
            </button>
            <button
              type="button"
              className={`btn${view === "compare" ? " btn-primary" : ""}`}
              onClick={() => setView("compare")}
              aria-pressed={view === "compare"}
            >
              {t("coa.view_compare")}
            </button>
          </div>
        )}
      </div>

      {showCompare ? (
        <CoaCompareView coas={coas} />
      ) : (
        <>
          {/* Side-by-side comparison, not a docked panel - this is the tool's whole point.
              Grid reflows to a single stacked column on narrow viewports. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(coas.length, 3)}, minmax(320px, 1fr))`,
              gap: "var(--space-4)",
            }}
            className="coa-grid"
          >
            {coas.map((coa, i) => (
              <CoaCard
                key={coa.id}
                coa={coa}
                index={i}
                scenario={scenario}
                sketch={sketch}
                onRevise={onRevise}
                revising={revisingCoaId === coa.id}
                onExport={onExport}
                exporting={exportingCoaId === coa.id}
                returnUrl={returnUrl}
                onReturnToWorkstation={onReturnToWorkstation}
              />
            ))}
          </div>
          <style>{`
            @media (max-width: 900px) {
              .coa-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </>
      )}
    </section>
  );
}
