/**
 * Branding: product name, tagline, symbol, favicon and palette.
 *
 * The committed defaults are the generic open-source identity: the app.* strings
 * in i18n/{en,ar}.json, ./symbol.svg, and the --brand-* tokens in tokens.css.
 * An organisation's own brand goes in frontend/brand.local/ (git-ignored; see
 * frontend/brand.example/ for the format). Every file there is optional and
 * picked up at build time when present, so a public clone builds with the
 * defaults and the organisation's build carries its brand, with no code change.
 *
 *   brand.local/brand.json          document title + UI string overrides per language
 *   brand.local/brand.css           --brand-* token overrides (loaded after global.css)
 *   brand.local/symbol.{svg,png}    header + nav rail symbol
 *   brand.local/favicon.{png,svg,ico}  browser tab icon (defaults to the symbol)
 */
import i18n from "../i18n";
import defaultSymbol from "./symbol.svg";

interface BrandConfig {
  documentTitle?: string;
  /** Per language, any subset of i18n/{en,ar}.json - e.g. { app: { title } }. */
  i18n?: Record<string, Record<string, unknown>>;
}

const first = <T>(modules: Record<string, T>): T | undefined => Object.values(modules)[0];

const config =
  first(import.meta.glob<BrandConfig>("/brand.local/brand.json", { eager: true, import: "default" })) ?? {};
import.meta.glob("/brand.local/brand.css", { eager: true });

export const brandSymbol =
  first(import.meta.glob<string>("/brand.local/symbol.{svg,png}", { eager: true, query: "?url", import: "default" })) ??
  defaultSymbol;

const favicon =
  first(import.meta.glob<string>("/brand.local/favicon.{png,svg,ico}", { eager: true, query: "?url", import: "default" })) ??
  brandSymbol;

for (const [language, strings] of Object.entries(config.i18n ?? {})) {
  i18n.addResourceBundle(language, "translation", strings, true, true);
}

if (config.documentTitle) document.title = config.documentTitle;

const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement("link");
icon.rel = "icon";
icon.href = favicon;
document.head.appendChild(icon);
