import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar.json";
import en from "./en.json";

export const RTL_LANGUAGES = new Set(["ar"]);

const defaultLanguage = (import.meta.env.VITE_DEFAULT_UI_LANGUAGE as string) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: defaultLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function applyDocumentDirection(language: string) {
  const dir = RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = language;
}

applyDocumentDirection(defaultLanguage);

export default i18n;
