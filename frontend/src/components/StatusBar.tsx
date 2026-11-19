/**
 * Bottom telemetry strip. Every field here is real client-side state -
 * current activity, the live session id, counts of what's actually loaded,
 * and the ticking Zulu clock.
 *
 * Deliberately absent: anything implying backend health, model identity,
 * link quality, or classification. A status bar is exactly the place a
 * reassuring-but-invented "SYSTEM OPERATIONAL / SECURE LINK / CLASSIFIED"
 * label tends to get added; none of that is known to this component, and a
 * fabricated status indicator is the same class of error as a fabricated
 * confidence number. If a real health
 * signal is wanted here, wire it to GET /api/health/llm and show what that
 * actually returns, including its failures.
 */
import { useTranslation } from "react-i18next";

import { ZuluClock } from "./ZuluClock";

interface Props {
  generating: boolean;
  revising: boolean;
  sessionId: string | null;
  unitCount: number;
  coaCount: number;
}

export function StatusBar({ generating, revising, sessionId, unitCount, coaCount }: Props) {
  const { t } = useTranslation();

  const statusKey = generating ? "status.generating" : revising ? "status.revising" : "status.ready";
  const busy = generating || revising;

  return (
    <div className="status-bar" role="status">
      <span className="status-cell">
        <span className={`status-led${busy ? " is-busy" : ""}`} aria-hidden="true" />
        <span className="eyebrow">{t(statusKey)}</span>
      </span>

      {sessionId && (
        <span className="status-cell">
          <span className="eyebrow">{t("status.session")}</span>
          <span className="mono status-value">{sessionId.slice(0, 8)}</span>
        </span>
      )}

      <span className="status-cell">
        <span className="eyebrow">{t("status.units")}</span>
        <span className="mono status-value">{unitCount}</span>
      </span>

      <span className="status-cell">
        <span className="eyebrow">{t("status.coas")}</span>
        <span className="mono status-value">{coaCount}</span>
      </span>

      <span className="status-cell status-cell-end">
        <ZuluClock />
      </span>
    </div>
  );
}
