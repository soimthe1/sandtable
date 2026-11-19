import type { CSSProperties } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Coa, LaydownSketch, Scenario } from "../types/schema";
import { GeneratingStatus } from "./GeneratingStatus";
import { iconForPhase, WarningTriangleIcon } from "./icons";
import { LaydownSketchPanel } from "./LaydownSketchPanel";
import { PhaseTimeline } from "./PhaseTimeline";
import { ScenarioSandTable } from "./ScenarioSandTable";

const ACETATE_COLORS = ["var(--acetate-1)", "var(--acetate-2)", "var(--acetate-3)"];
const COA_LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  coa: Coa;
  index: number;
  scenario: Scenario | null;
  sketch: LaydownSketch | null;
  onRevise: (coaId: string, changeRequest: string) => void;
  revising: boolean;
  onExport: (coaId: string) => void;
  exporting: boolean;
  returnUrl: string | null;
  onReturnToWorkstation: (coaId: string) => void;
}

export function CoaCard({
  coa,
  index,
  scenario,
  sketch,
  onRevise,
  revising,
  onExport,
  exporting,
  returnUrl,
  onReturnToWorkstation,
}: Props) {
  const { t } = useTranslation();
  const [changeRequest, setChangeRequest] = useState("");
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const accent = ACETATE_COLORS[index % ACETATE_COLORS.length];
  const letter = COA_LETTERS[index % COA_LETTERS.length];
  const revisingStages = t("coa.revising_stages", { returnObjects: true }) as string[];

  function submitRevision() {
    if (!changeRequest.trim()) return;
    onRevise(coa.id, changeRequest.trim());
    setChangeRequest("");
  }

  return (
    <article
      className="card tac-frame acetate-sheet stack coa-card-enter"
      style={{ "--coa-accent": accent, animationDelay: `${index * 90}ms` } as CSSProperties}
      aria-labelledby={`coa-${coa.id}-name`}
    >
      <div className="row coa-header" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <div className="row" style={{ gap: "var(--space-2)", flexWrap: "nowrap", minWidth: 0 }}>
          <span className="coa-badge" aria-hidden="true">
            {letter}
          </span>
          <h3 id={`coa-${coa.id}-name`} style={{ color: accent, margin: 0, minWidth: 0 }}>
            {coa.name}
          </h3>
        </div>
        <span className="eyebrow mono coa-id">{coa.id}</span>
      </div>

      {/* Same schematic plot as the scenario panel, framed in this COA's
          accent. It shows the shared starting laydown, NOT this COA's
          maneuver - the model returns no per-COA geometry, so nothing here
          is COA-specific except the frame color. Don't imply otherwise by
          captioning it as "COA A's plan". */}
      {scenario ? (
        <ScenarioSandTable scenario={scenario} compact accent={accent} />
      ) : (
        <LaydownSketchPanel sketch={sketch} compact accent={accent} />
      )}

      <div>
        <div className="eyebrow">{t("coa.narrative")}</div>
        <p>{coa.narrative}</p>
      </div>

      {coa.phases.length > 0 && (
        <div>
          <div className="eyebrow">{t("coa.phases")}</div>
          <PhaseTimeline phases={coa.phases} activeIndex={activePhase} onSelect={setActivePhase} />
          <ol className="stack" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {coa.phases.map((phase, i) => {
              const PhaseIcon = iconForPhase(phase.name, phase.description);
              return (
                <li
                  key={i}
                  className={`phase-row${activePhase === i ? " is-active" : ""}`}
                  onMouseEnter={() => setActivePhase(i)}
                >
                  <span className="icon-chip">
                    <PhaseIcon size={12} />
                  </span>
                  <span>
                    <span className="mono">{t("coa.offset", { min: phase.start_offset_min })}</span>
                    {" — "}
                    <strong>{phase.name}</strong>: {phase.description}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="card" style={{ borderColor: "var(--redteam)", background: "transparent" }}>
        <div className="eyebrow" style={{ color: "var(--redteam)" }}>
          {t("coa.red_team")}
        </div>
        <p style={{ marginBottom: 0 }}>{coa.red_team_critique}</p>
      </div>

      {coa.risk_factors.length > 0 && (
        <div>
          <div className="eyebrow">{t("coa.risk")}</div>
          <ul className="stack" style={{ margin: 0, padding: 0, listStyle: "none", gap: "var(--space-1)" }}>
            {coa.risk_factors.map((rf, i) => (
              <li key={i} className="phase-row risk-row" style={{ paddingBlock: 4 }}>
                <span className="icon-chip">
                  <WarningTriangleIcon size={12} />
                </span>
                <span>
                  <strong>{rf.factor}</strong>
                  {" — "}
                  {rf.assessment}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="stack" style={{ borderBlockStart: "1px dashed var(--grid-line)", paddingTop: "var(--space-3)" }}>
        <textarea
          placeholder={t("coa.revise_placeholder") ?? undefined}
          value={changeRequest}
          onChange={(e) => setChangeRequest(e.target.value)}
          rows={2}
        />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn" onClick={submitRevision} disabled={revising || !changeRequest.trim()}>
            {revising ? t("coa.revising") : t("coa.revise_button")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onExport(coa.id)} disabled={exporting}>
            {exporting ? t("coa.exporting") : t("coa.export_button")}
          </button>
          {returnUrl && (
            <button type="button" className="btn" onClick={() => onReturnToWorkstation(coa.id)}>
              {t("coa.return_to_workstation")}
            </button>
          )}
        </div>
        <GeneratingStatus active={revising} stages={revisingStages} stageDurationMs={1200} />
      </div>
    </article>
  );
}
