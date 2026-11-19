import { useState } from "react";
import { useTranslation } from "react-i18next";

import { brandSymbol } from "./brand";
import { CoaTabs } from "./components/CoaTabs";
import { LanguageToggle } from "./components/LanguageToggle";
import { NavRail } from "./components/NavRail";
import { ScenarioForm } from "./components/ScenarioForm";
import { StatusBar } from "./components/StatusBar";
import { WarningBanner } from "./components/WarningBanner";
import { useSessionStore } from "./state/useSessionStore";
import type { UiLanguage } from "./types/schema";

export default function App() {
  const { t, i18n } = useTranslation();
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>((i18n.language as UiLanguage) || "en");

  const store = useSessionStore(uiLanguage);

  return (
    <>
      <NavRail />
      <div className="container stack">
      <header className="card tac-frame row app-header" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="row" style={{ gap: "var(--space-3)" }}>
            <img src={brandSymbol} alt="" className="brand-symbol" width={52} height={52} />
            <h1 className="brand-lockup" aria-label={t("app.title") ?? undefined}>
              {t("app.name_ar") && (
                <span className="brand-name-ar" lang="ar" dir="rtl">{t("app.name_ar")}</span>
              )}
              <span className="brand-name-en" lang="en">{t("app.name_en")}</span>
            </h1>
            <span className="stamp">{t("app.stamp")}</span>
          </div>
          <p className="eyebrow" style={{ maxWidth: 640, marginBlockStart: "var(--space-2)", marginBlockEnd: 0 }}>
            {t("app.subtitle")}
          </p>
        </div>
        {/* The Zulu clock lives in the StatusBar now - one clock, not two. */}
        <LanguageToggle language={uiLanguage} onChange={setUiLanguage} />
      </header>

      <p style={{ maxWidth: 720, color: "var(--ink-soft)", fontSize: 13 }}>{t("app.disclaimer")}</p>

      {store.error && <WarningBanner>{t("errors.generic", { message: store.error })}</WarningBanner>}

      {store.importingFromUrl && <WarningBanner>{t("scenario.importing_from_url")}</WarningBanner>}

      {store.warnings.map((w, i) => (
        <WarningBanner key={i}>{t("warnings.quantitative_leak")}</WarningBanner>
      ))}

      <ScenarioForm
        freeText={store.freeText}
        onFieldChange={(field, value) => store.updateField(field as keyof typeof store.freeText, value)}
        importedScenario={store.importedScenario}
        onImported={store.setImportedScenario}
        onGenerate={store.generate}
        generating={store.generating}
        uiLanguage={uiLanguage}
        onLoadSample={store.loadSample}
        scenarioSource={store.scenarioSource}
        sketch={store.sketch}
        onSketchChange={store.setSketch}
        sketching={store.sketching}
        onBuildSketch={store.buildSketchNow}
      />

        <CoaTabs
          coas={store.coas}
          scenario={store.importedScenario}
          sketch={store.sketch}
          onRevise={store.revise}
          revisingCoaId={store.revisingCoaId}
          onExport={store.doExport}
          exportingCoaId={store.exportingCoaId}
          returnUrl={store.returnUrl}
          onReturnToWorkstation={store.returnToWorkstation}
        />
      </div>

      <StatusBar
        generating={store.generating}
        revising={store.revisingCoaId !== null}
        sessionId={store.sessionId}
        unitCount={store.importedScenario?.order_of_battle.length ?? 0}
        coaCount={store.coas.length}
      />
    </>
  );
}
