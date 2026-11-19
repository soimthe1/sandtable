/**
 * Verbose "what's happening right now" feed shown while a generate/revise
 * call is in flight. The backend's /api/coa/generate and /revise are a
 * single blocking request (see backend/app/services/coa_generator.py) -
 * there is no server-sent progress to subscribe to - so this is a
 * client-driven staged checklist, purposely worded to match what the
 * pipeline actually does (draft -> red-team critique -> risk-guardrail
 * check -> finalize), not generic filler.
 *
 * It never claims to be ahead of reality: it stops advancing once it
 * reaches the last stage and just holds there (with a running elapsed-time
 * counter) for as long as the real call takes, and the whole thing unmounts
 * the instant the real response lands - so on a fast local model the
 * officer might only ever see the first two stages, which is fine, it's a
 * waiting indicator, not a claim that discrete backend steps just occurred.
 */
import { useEffect, useRef, useState } from "react";

import { CheckIcon, PendingDotIcon, SpinnerIcon } from "./icons";

interface Props {
  active: boolean;
  stages: string[];
  /** Roughly how long each stage should hold before advancing, in ms. */
  stageDurationMs?: number;
}

export function GeneratingStatus({ active, stages, stageDurationMs = 1500 }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      setElapsedSec(0);
      startRef.current = null;
      return;
    }

    startRef.current = Date.now();
    const stageTimer = window.setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, stageDurationMs);
    const clockTimer = window.setInterval(() => {
      if (startRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);

    return () => {
      window.clearInterval(stageTimer);
      window.clearInterval(clockTimer);
    };
    // stages/stageDurationMs are static per caller - only `active` toggling matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="generating-panel" role="status" aria-live="polite">
      {stages.map((stage, i) => {
        const isDone = i < stageIndex;
        const isActive = i === stageIndex;
        return (
          <div
            key={stage}
            className={`generating-stage${isDone ? " is-done" : ""}${isActive ? " is-active" : ""}`}
          >
            <span className="icon-chip">
              {isDone ? (
                <CheckIcon size={11} />
              ) : isActive ? (
                <SpinnerIcon size={11} className="spin" />
              ) : (
                <PendingDotIcon size={8} />
              )}
            </span>
            <span className="generating-label">{stage}</span>
            {isActive && <span className="generating-elapsed">{elapsedSec}s</span>}
          </div>
        );
      })}
    </div>
  );
}
