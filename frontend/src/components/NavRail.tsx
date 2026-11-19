/**
 * Slim icon rail down the side of the window - the layout signature of an
 * ops console, and a way to jump between sections without scrolling.
 *
 * Every entry navigates to a section that actually exists on the page. Do
 * not pad this out with plausible-looking entries (Intel, Wargame, Reports,
 * Settings...) to make it look denser: a nav item that leads nowhere, or is
 * permanently disabled, implies the app has capabilities it doesn't have.
 * Add an entry when there's a section to add it for.
 *
 * Hidden below 1000px, where the layout is single-column anyway.
 */
import { useTranslation } from "react-i18next";

import { brandSymbol } from "../brand";
import { FlagIcon, MapPinIcon, RouteIcon } from "./icons";

interface Section {
  id: string;
  labelKey: string;
  Icon: typeof FlagIcon;
}

const SECTIONS: Section[] = [
  { id: "scenario-section", labelKey: "nav.mission", Icon: FlagIcon },
  { id: "plot-section", labelKey: "nav.forces", Icon: MapPinIcon },
  { id: "coa-section", labelKey: "nav.coas", Icon: RouteIcon },
];

export function NavRail() {
  const { t } = useTranslation();

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="nav-rail" aria-label={t("nav.label") ?? undefined}>
      <div className="nav-rail-mark" aria-hidden="true">
        <img src={brandSymbol} alt="" className="brand-symbol" width={30} height={30} />
      </div>
      {SECTIONS.map(({ id, labelKey, Icon }) => (
        <button
          key={id}
          type="button"
          className="nav-rail-btn"
          onClick={() => jump(id)}
          title={t(labelKey) ?? undefined}
          aria-label={t(labelKey) ?? undefined}
        >
          <Icon size={18} />
          <span className="nav-rail-label">{t(labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
