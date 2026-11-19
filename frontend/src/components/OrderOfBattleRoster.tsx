/**
 * Structured order-of-battle + terrain-feature roster for an imported
 * scenario.json - a grouped, glanceable list next to ScenarioSandTable's
 * schematic plot. Same idea as a paper unit roster clipped to the sand
 * table: the plot shows *where*, this shows *what and how many*, entirely
 * from data already on the Scenario object (no LLM, no invented figures).
 *
 * Renders nothing until a scenario is imported - the sand table already
 * carries the "nothing imported yet" placeholder, so this stays silent
 * rather than showing an empty box beneath it.
 */
import { useTranslation } from "react-i18next";

import { AFFILIATION_COLOR, AFFILIATION_ORDER } from "../lib/affiliation";
import type { Affiliation, Scenario } from "../types/schema";

interface Props {
  scenario: Scenario | null;
  /** Hovering a unit here highlights the matching marker on the sand table. */
  onHoverUnit?: (name: string | null) => void;
  activeUnit?: string | null;
}

export function OrderOfBattleRoster({ scenario, onHoverUnit, activeUnit = null }: Props) {
  const { t } = useTranslation();

  if (!scenario) return null;

  const groups = AFFILIATION_ORDER.map((affiliation) => ({
    affiliation,
    entries: scenario.order_of_battle.filter((e) => e.affiliation === affiliation),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="oob-roster">
      {groups.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <div className="eyebrow">{t("scenario.oob_heading")}</div>
          {groups.map((group) => (
            <div key={group.affiliation} className="oob-group">
              <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                <span
                  className={`oob-dot${group.affiliation === "hostile" ? " oob-dot-hostile" : ""}`}
                  style={{ background: AFFILIATION_COLOR[group.affiliation as Affiliation] }}
                  aria-hidden="true"
                />
                <span className="oob-group-label">
                  {t(`scenario.affiliation.${group.affiliation}`)} · {group.entries.length}
                </span>
              </div>
              <ul className="oob-unit-list">
                {group.entries.map((entry, i) => (
                  <li
                    key={i}
                    className={`oob-unit${activeUnit === entry.name ? " is-active" : ""}`}
                    style={{ ["--unit-color" as string]: AFFILIATION_COLOR[group.affiliation as Affiliation] }}
                    onMouseEnter={() => onHoverUnit?.(entry.name)}
                    onMouseLeave={() => onHoverUnit?.(null)}
                  >
                    {entry.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {scenario.terrain_features.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)", marginBlockStart: "var(--space-3)" }}>
          <div className="eyebrow">{t("scenario.terrain_heading")}</div>
          <ul className="oob-unit-list">
            {scenario.terrain_features.map((feature, i) => (
              <li key={i}>{feature.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
