/**
 * Side-by-side comparison of all generated COAs - narrative, phased
 * timeline, red-team critique, and risk factors as columns, so the officer
 * can scan differences without paging between cards. Deliberately every
 * cell is the model's own text (or a plain count of items) - no score, no
 * percentage, no "recommended" verdict. That's the line drawn in
 * project's non-negotiables: comparison is fine, a fabricated ranking
 * isn't. Read-only - revise/export stay on the card view.
 */
import { useTranslation } from "react-i18next";

import type { Coa } from "../types/schema";
import { WarningTriangleIcon } from "./icons";

const ACETATE_COLORS = ["var(--acetate-1)", "var(--acetate-2)", "var(--acetate-3)"];
const COA_LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  coas: Coa[];
}

export function CoaCompareView({ coas }: Props) {
  const { t } = useTranslation();

  return (
    <div className="compare-scroll">
      <table className="compare-table">
        <thead>
          <tr>
            <th className="compare-row-label" scope="col" />
            {coas.map((coa, i) => {
              const accent = ACETATE_COLORS[i % ACETATE_COLORS.length];
              return (
                <th key={coa.id} scope="col" style={{ color: accent }}>
                  <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <span className="coa-badge" style={{ borderColor: accent, color: accent }} aria-hidden="true">
                      {COA_LETTERS[i % COA_LETTERS.length]}
                    </span>
                    <span>{coa.name}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="compare-row-label" scope="row">
              {t("coa.narrative")}
            </th>
            {coas.map((coa) => (
              <td key={coa.id}>{coa.narrative}</td>
            ))}
          </tr>
          <tr>
            <th className="compare-row-label" scope="row">
              {t("coa.phases")}
            </th>
            {coas.map((coa) => (
              <td key={coa.id}>
                <ol className="compare-list">
                  {coa.phases.map((phase, i) => (
                    <li key={i}>
                      <span className="mono">{t("coa.offset", { min: phase.start_offset_min })}</span> {phase.name}
                    </li>
                  ))}
                </ol>
              </td>
            ))}
          </tr>
          <tr>
            <th className="compare-row-label" scope="row" style={{ color: "var(--redteam)" }}>
              {t("coa.red_team")}
            </th>
            {coas.map((coa) => (
              <td key={coa.id}>{coa.red_team_critique}</td>
            ))}
          </tr>
          <tr>
            <th className="compare-row-label" scope="row">
              {t("coa.risk")}
            </th>
            {coas.map((coa) => (
              <td key={coa.id}>
                <ul className="compare-list">
                  {coa.risk_factors.map((rf, i) => (
                    <li key={i} className="row" style={{ gap: 5, flexWrap: "nowrap", alignItems: "flex-start" }}>
                      <WarningTriangleIcon size={11} />
                      <span>
                        <strong>{rf.factor}</strong> — {rf.assessment}
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
