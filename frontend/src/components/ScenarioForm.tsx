import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { importScenario } from "../api/client";
import { SAMPLE_SCENARIOS, type SampleScenario } from "../data/sampleScenarios";
import type { LaydownSketch, Scenario, ScenarioFreeText, UiLanguage } from "../types/schema";
import { GeneratingStatus } from "./GeneratingStatus";
import { BuildingIcon, FlagIcon, RouteIcon, WaveIcon } from "./icons";
import { LaydownSketchPanel } from "./LaydownSketchPanel";
import { OrderOfBattleRoster } from "./OrderOfBattleRoster";
import { ScenarioSandTable } from "./ScenarioSandTable";

interface Props {
  freeText: {
    mission_statement: string;
    terrain_description: string;
    force_composition_notes: string;
    constraints_roe: string;
    additional_notes: string;
  };
  onFieldChange: (field: string, value: string) => void;
  importedScenario: Scenario | null;
  onImported: (scenario: Scenario) => void;
  onGenerate: () => void;
  generating: boolean;
  uiLanguage: UiLanguage;
  onLoadSample: (sample: SampleScenario) => void;
  scenarioSource: "import" | "sample" | null;
  sketch: LaydownSketch | null;
  onSketchChange: (sketch: LaydownSketch) => void;
  sketching: boolean;
  onBuildSketch: () => void;
}

// Purely decorative per-sample icon, keyed by the sample's stable id (see
// sampleScenarios.ts) - not derived from content, just a quick visual
// fingerprint so the three buttons aren't identical-looking text pills.
const SAMPLE_ICONS: Record<string, typeof FlagIcon> = {
  "urban-cordon-search": BuildingIcon,
  "opposed-river-crossing": WaveIcon,
  "convoy-ambush-response": RouteIcon,
};

export function ScenarioForm({
  freeText,
  onFieldChange,
  importedScenario,
  onImported,
  onGenerate,
  generating,
  uiLanguage,
  onLoadSample,
  scenarioSource,
  sketch,
  onSketchChange,
  sketching,
  onBuildSketch,
}: Props) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hovering a unit in the roster lights up its marker on the sand table.
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const generatingStages = t("scenario.generating_stages", { returnObjects: true }) as string[];

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const scenario = await importScenario(file);
      onImported(scenario);
    } catch (err) {
      // Surfaced via the field itself for v1 - a full toast system is out of scope.
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      e.target.value = "";
    }
  }

  const hasContent = Object.values(freeText).some((v) => v.trim().length > 0);

  function handleSampleClick(sample: SampleScenario) {
    if (hasContent && !window.confirm(t("scenario.samples_confirm_replace") ?? undefined)) return;
    onLoadSample(sample);
  }

  return (
    <section className="card tac-frame stack" id="scenario-section" aria-labelledby="scenario-heading">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8 }}>
          <FlagIcon size={18} />
          <h2 id="scenario-heading" style={{ margin: 0 }}>
            {t("scenario.heading")}
          </h2>
        </div>
        <div>
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            {t("scenario.import_button")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleFileChosen}
          />
        </div>
      </div>

      {/* Onboarding aid: one click fills every field below with a plausible,
          fully-worked example so a new officer can see what belongs where
          and get a real generated result immediately, instead of guessing
          at five empty textareas. See frontend/src/data/sampleScenarios.ts. */}
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <div className="eyebrow">{t("scenario.samples_heading")}</div>
        <div className="row" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
          {SAMPLE_SCENARIOS[uiLanguage].map((sample) => {
            const Icon = SAMPLE_ICONS[sample.id] ?? FlagIcon;
            return (
              <button
                key={sample.id}
                type="button"
                className="btn btn-icon"
                onClick={() => handleSampleClick(sample)}
              >
                <Icon size={14} />
                {sample.title}
              </button>
            );
          })}
        </div>
      </div>

      {importedScenario && (
        <div className="stamp">
          {t(scenarioSource === "sample" ? "scenario.sample_badge" : "scenario.imported_badge", {
            name: importedScenario.mission_name,
          })}
        </div>
      )}

      <div className="scenario-grid">
        {/* 2-column field grid, not one long stacked column - mission
            statement gets the full-width top row (usually the longest/most
            important field), the other four pair up beneath it. Cuts this
            section's height by roughly half so the COA output isn't buried
            under a page of scrolling before you even generate anything.
            The generate block sits at the bottom of this same column
            (margin-block-start:auto) so it fills the space the taller
            sand-table column would otherwise leave blank. */}
        <div className="scenario-fields">
        <div className="field-grid">
          <div className="field field-span-2">
            <label htmlFor="mission_statement">{t("scenario.mission_statement")}</label>
            <textarea
              id="mission_statement"
              placeholder={t("scenario.mission_statement_placeholder") ?? undefined}
              value={freeText.mission_statement}
              onChange={(e) => onFieldChange("mission_statement", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="terrain_description">{t("scenario.terrain_description")}</label>
            <textarea
              id="terrain_description"
              placeholder={t("scenario.terrain_description_placeholder") ?? undefined}
              value={freeText.terrain_description}
              onChange={(e) => onFieldChange("terrain_description", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="force_composition_notes">{t("scenario.force_composition_notes")}</label>
            <textarea
              id="force_composition_notes"
              placeholder={t("scenario.force_composition_notes_placeholder") ?? undefined}
              value={freeText.force_composition_notes}
              onChange={(e) => onFieldChange("force_composition_notes", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="constraints_roe">{t("scenario.constraints_roe")}</label>
            <textarea
              id="constraints_roe"
              placeholder={t("scenario.constraints_roe_placeholder") ?? undefined}
              value={freeText.constraints_roe}
              onChange={(e) => onFieldChange("constraints_roe", e.target.value)}
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="additional_notes">{t("scenario.additional_notes")}</label>
            <textarea
              id="additional_notes"
              placeholder={t("scenario.additional_notes_placeholder") ?? undefined}
              value={freeText.additional_notes}
              onChange={(e) => onFieldChange("additional_notes", e.target.value)}
            />
          </div>
        </div>

          <div className="scenario-generate stack" style={{ gap: "var(--space-3)" }}>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={generating}>
                {generating ? t("scenario.generating") : t("scenario.generate_button")}
              </button>
              {/* Build the sketch on its own first, so a misread laydown can be
                  corrected BEFORE the COAs are drafted from it. */}
              {!importedScenario && (
                <button
                  type="button"
                  className="btn"
                  onClick={onBuildSketch}
                  disabled={generating || sketching || !hasContent}
                  title={t("sketch.build_hint") ?? undefined}
                >
                  {sketching ? t("sketch.building_short") : t("sketch.build_button")}
                </button>
              )}
            </div>
            <GeneratingStatus active={generating} stages={generatingStages} />
          </div>
        </div>

        <div className="stack" id="plot-section" style={{ gap: "var(--space-2)" }}>
          {importedScenario && (
            <div className="stat-chips">
              <span className="stat-chip">
                <span className="eyebrow">{t("scenario.stat_units")}</span>
                <span className="mono stat-chip-value">{importedScenario.order_of_battle.length}</span>
              </span>
              <span className="stat-chip">
                <span className="eyebrow">{t("scenario.stat_terrain")}</span>
                <span className="mono stat-chip-value">{importedScenario.terrain_features.length}</span>
              </span>
            </div>
          )}
          {/* Surveyed plot when a scenario.json is loaded; otherwise the
              relative sketch read from the typed text. Never both - they are
              different kinds of claim and stacking them would blur that. */}
          {importedScenario ? (
            <>
              <ScenarioSandTable scenario={importedScenario} activeUnit={activeUnit} />
              <OrderOfBattleRoster
                scenario={importedScenario}
                activeUnit={activeUnit}
                onHoverUnit={setActiveUnit}
              />
            </>
          ) : sketching ? (
            <div className="sketch-pending eyebrow">{t("sketch.building")}</div>
          ) : sketch && sketch.units.length > 0 ? (
            <LaydownSketchPanel sketch={sketch} onChange={onSketchChange} />
          ) : (
            <ScenarioSandTable scenario={null} />
          )}
        </div>
      </div>
    </section>
  );
}
