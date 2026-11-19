/**
 * A swimlane (Gantt-style) view of a COA's phased timeline, with playback.
 * One lane per phase, laid on a shared T+ axis: a lane starts at that
 * phase's real start_offset_min and runs until the next phase begins. Press
 * ▶ and a playhead walks the lanes in order, advancing the highlight here
 * and on the text list below.
 *
 * Honesty notes, because this looks like a scheduling tool and isn't one:
 *
 * - Lane WIDTH is derived, not authored. The model gives a start offset per
 *   phase and no duration, so a lane simply runs to the next phase's start.
 *   The final lane has no successor and gets a nominal tail (TAIL_RATIO of
 *   the total span) purely so it's visible - that tail is not an estimated
 *   duration and must never be labeled as one.
 * - Playback advances an array index at a fixed 1.6s per phase. It is a
 *   reader's aid for stepping through a plan the model already wrote - not
 *   a simulation, not a rehearsal, not time-accurate. Do not rename it
 *   "simulate" or drive a clock from it.
 *
 * CoaCard owns activeIndex and passes it back down, so hovering a row in
 * the text list and the playhead stay in sync.
 */
import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CoaPhase } from "../types/schema";
import { iconForPhase, PauseIcon, PlayIcon } from "./icons";

interface Props {
  phases: CoaPhase[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
}

const STEP_MS = 1600;
/** Nominal tail for the last lane, as a fraction of the total span. Not a duration estimate. */
const TAIL_RATIO = 0.18;

export function PhaseTimeline({ phases, activeIndex, onSelect }: Props) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  // The interval callback needs the *current* index without re-creating the
  // interval on every step (which would reset the timer each tick).
  const indexRef = useRef<number | null>(activeIndex);
  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!playing) return;

    if (indexRef.current === null || indexRef.current >= phases.length - 1) {
      indexRef.current = 0;
      onSelect(0);
    }

    const id = window.setInterval(() => {
      const next = (indexRef.current ?? 0) + 1;
      if (next >= phases.length) {
        setPlaying(false);
        return;
      }
      indexRef.current = next;
      onSelect(next);
    }, STEP_MS);

    return () => window.clearInterval(id);
    // onSelect is a setState updater from CoaCard and is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, phases.length]);

  if (phases.length === 0) return null;

  const starts = phases.map((p) => p.start_offset_min);
  const min = Math.min(...starts);
  const rawSpan = Math.max(...starts) - min;
  const tail = rawSpan > 0 ? rawSpan * TAIL_RATIO : 1;
  const total = rawSpan + tail;

  const pct = (minutes: number) => ((minutes - min) / total) * 100;

  const laneFor = (i: number) => {
    const start = starts[i];
    const end = i < phases.length - 1 ? starts[i + 1] : min + total;
    return { left: pct(start), width: Math.max(pct(end) - pct(start), 4) };
  };

  // Axis ticks: first, last real start, and the midpoint between them.
  const tickValues =
    rawSpan > 0 ? [min, min + Math.round(rawSpan / 2), min + rawSpan] : [min];

  // Fraction (0-1) along the track, not a percentage of the whole grid -
  // the playhead has to clear the fixed-width lane-label column, which the
  // CSS does with calc(var(--lane-label) + (100% - var(--lane-label)) * f).
  const playheadFrac = activeIndex === null ? null : laneFor(activeIndex).left / 100;

  return (
    <div
      className="swimlane"
      style={playheadFrac !== null ? ({ ["--playhead" as string]: playheadFrac } as React.CSSProperties) : undefined}
    >
      <div className="swimlane-grid" role="group" aria-label={t("coa.phases") ?? undefined}>
        <div className="swimlane-play-cell">
          <button
            type="button"
            className={`phase-play${playing ? " is-playing" : ""}`}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? (t("coa.pause_phases") ?? undefined) : (t("coa.play_phases") ?? undefined)}
            title={playing ? (t("coa.pause_phases") ?? undefined) : (t("coa.play_phases") ?? undefined)}
          >
            {playing ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
          </button>
        </div>

        <div className="swimlane-axis" aria-hidden="true">
          {tickValues.map((v, i) => (
            <span key={i} className="swimlane-tick mono" style={{ insetInlineStart: `${pct(v)}%` }}>
              {t("coa.offset", { min: v })}
            </span>
          ))}
        </div>

        {playheadFrac !== null && <div className="swimlane-playhead" aria-hidden="true" />}

        {phases.map((phase, i) => {
          const { left, width } = laneFor(i);
          const Icon = iconForPhase(phase.name, phase.description);
          const isActive = activeIndex === i;
          const isPast = activeIndex !== null && i < activeIndex;
          const label = `${t("coa.offset", { min: phase.start_offset_min })} — ${phase.name}`;
          return (
            <Fragment key={i}>
              <div className={`swimlane-label${isActive ? " is-active" : ""}`} title={phase.name}>
                <Icon size={11} />
                <span>{phase.name}</span>
              </div>
              <div className="swimlane-track">
                <button
                  type="button"
                  className={`swimlane-bar${isActive ? " is-active" : ""}${isPast ? " is-past" : ""}`}
                  style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                  onClick={() => {
                    setPlaying(false);
                    onSelect(i);
                  }}
                  onMouseEnter={() => onSelect(i)}
                  onFocus={() => onSelect(i)}
                  aria-label={label}
                  aria-pressed={isActive}
                  title={label}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
