import { useTranslation } from "react-i18next";

import { applyDocumentDirection } from "../i18n";
import type { UiLanguage } from "../types/schema";

interface Props {
  language: UiLanguage;
  onChange: (language: UiLanguage) => void;
}

export function LanguageToggle({ language, onChange }: Props) {
  const { t, i18n } = useTranslation();

  function switchTo(next: UiLanguage) {
    i18n.changeLanguage(next);
    applyDocumentDirection(next);
    onChange(next);
  }

  return (
    <div className="row" role="group" aria-label={t("language.label")}>
      <span className="eyebrow">{t("language.label")}</span>
      <button
        type="button"
        className="btn"
        aria-pressed={language === "en"}
        style={language === "en" ? { background: "var(--ink)", color: "var(--paper)" } : undefined}
        onClick={() => switchTo("en")}
      >
        {t("language.en")}
      </button>
      <button
        type="button"
        className="btn"
        aria-pressed={language === "ar"}
        style={language === "ar" ? { background: "var(--ink)", color: "var(--paper)" } : undefined}
        onClick={() => switchTo("ar")}
      >
        {t("language.ar")}
      </button>
    </div>
  );
}
