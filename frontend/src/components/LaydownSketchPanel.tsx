/**
 * Draws (and lets the officer correct) the relative disposition sketch read
 * out of their own free text.
 *
 * This is the typed-scenario counterpart to ScenarioSandTable, and the two
 * are deliberately NOT the same component:
 *
 *   ScenarioSandTable  - surveyed lon/lat from an imported scenario.json.
 *                        A schematic of real positions.
 *   LaydownSketchPanel - relative x/y in a blank square, derived from prose.
 *                        No coordinates, no scale, no north-referenced grid.
 *
 * Keeping them separate is the point: merging them would let text-derived
 * placements inherit the visual authority of surveyed ones. The caption says
 * on screen where the arrangement came from, and units are draggable because
 * reading prose is fallible - a sketch the officer can correct is honest, a
 * fixed one that quietly misplaces their forces is not.
 *
 * Dragging edits the officer's own sketch. It never writes back to an
 * imported scenario and never produces coordinates.
 */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AFFILIATION_COLOR } from "../lib/affiliation";
import type { Affiliation, LaydownSketch, SketchFeature, SketchUnit } from "../types/schema";
import { PlotZoom } from "./PlotZoom";
import { UnitFrame } from "./UnitFrame";

interface Props {
  sketch: LaydownSketch | null;
  onChange?: (sketch: LaydownSketch) => void;
  /** Thumbnail mode for COA cards: no editing, no captions. */
  compact?: boolean;
  accent?: string;
}

const VIEW_W = 320;
const VIEW_H = 190;
const PAD = 26;

/** Relative 0..1 -> panel coordinates. */
function toPanel(x: number, y: number): [number, number] {
  return [PAD + x * (VIEW_W - PAD * 2), PAD + y * (VIEW_H - PAD * 2)];
}

/** Panel coordinates -> relative 0..1, clamped to the frame. */
function toRelative(px: number, py: number): [number, number] {
  const x = (px - PAD) / (VIEW_W - PAD * 2);
  const y = (py - PAD) / (VIEW_H - PAD * 2);
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
}

function featurePath(feature: SketchFeature): string {
  const pts = feature.points.map(([x, y]) => toPanel(x, y));
  if (pts.length === 0) return "";
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return feature.kind === "area" ? `${d} Z` : d;
}

export function LaydownSketchPanel({ sketch, onChange, compact = false, accent }: Props) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  if (!sketch || (sketch.units.length === 0 && sketch.features.length === 0)) return null;

  const editable = !compact && !!onChange;

  /** Maps a pointer event to relative coords via the SVG's own viewBox. */
  function relativeFromEvent(e: React.PointerEvent): [number, number] | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const py = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    return toRelative(px, py);
  }

  function moveUnit(index: number, e: React.PointerEvent) {
    if (!onChange || !sketch) return;
    const rel = relativeFromEvent(e);
    if (!rel) return;
    const units = sketch.units.map((u, i) => (i === index ? { ...u, x: rel[0], y: rel[1] } : u));
    onChange({ ...sketch, units });
  }

  function removeUnit(index: number) {
    if (!onChange || !sketch) return;
    onChange({ ...sketch, units: sketch.units.filter((_, i) => i !== index) });
  }

  // `live` = the interactive copy (ref + drag handlers); the zoom overlay
  // mounts a second, inert copy - see PlotZoom on why the ref can't be shared.
  // `full` forces labels on even in compact mode: a card thumbnail hides them
  // for space, but the whole point of expanding one is to read them.
  const renderPlot = (live: boolean, full = false) => {
    const showLabels = !compact || full;
    return (
    <svg
      ref={live ? svgRef : undefined}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={VIEW_W}
      height={VIEW_H}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t("sketch.aria") ?? undefined}
      onPointerMove={live ? (e) => dragging !== null && moveUnit(dragging, e) : undefined}
      onPointerUp={live ? () => setDragging(null) : undefined}
      onPointerLeave={live ? () => setDragging(null) : undefined}
    >
          <rect
            x={1}
            y={1}
            width={VIEW_W - 2}
            height={VIEW_H - 2}
            fill="none"
            stroke="var(--grid-line)"
            strokeDasharray="5 4"
          />
          {/* Dashed frame + no grid ticks: this is a sketch pad, deliberately
              not the ruled plot the surveyed sand table uses. */}

          {sketch.features.map((feature, i) => {
            if (feature.kind === "point") {
              const first = feature.points[0];
              if (!first) return null;
              const [x, y] = toPanel(first[0], first[1]);
              return (
                <g key={`f${i}`}>
                  <rect
                    x={x - 3.5}
                    y={y - 3.5}
                    width={7}
                    height={7}
                    fill="var(--paper-raised)"
                    stroke="var(--ink-soft)"
                    strokeWidth={1.2}
                    transform={`rotate(45 ${x} ${y})`}
                  />
                  {showLabels && (
                    <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fontFamily="var(--font-data)" fill="var(--ink-soft)">
                      {feature.name}
                    </text>
                  )}
                </g>
              );
            }
            return (
              <g key={`f${i}`}>
                <path
                  d={featurePath(feature)}
                  fill={feature.kind === "area" ? "color-mix(in srgb, var(--ink-soft) 12%, transparent)" : "none"}
                  stroke="var(--ink-soft)"
                  strokeWidth={1.3}
                  strokeDasharray="4 3"
                />
                {showLabels && feature.points[0] && (
                  <text
                    x={toPanel(feature.points[0][0], feature.points[0][1])[0]}
                    y={toPanel(feature.points[0][0], feature.points[0][1])[1] - 5}
                    fontSize={7}
                    fontFamily="var(--font-data)"
                    fill="var(--ink-soft)"
                  >
                    {feature.name}
                  </text>
                )}
              </g>
            );
          })}

          {sketch.units.map((unit: SketchUnit, i) => {
            const [x, y] = toPanel(unit.x, unit.y);
            const color = AFFILIATION_COLOR[unit.affiliation as Affiliation] ?? AFFILIATION_COLOR.unknown;
            const label = unit.name.length > 18 ? `${unit.name.slice(0, 17)}…` : unit.name;
            return (
              <g
                key={i}
                transform={`translate(${x}, ${y})`}
                className={`oob-marker${editable ? " is-draggable" : ""}`}
                style={{ ["--marker-color" as string]: color }}
                onPointerDown={
                  editable && live
                    ? (e) => {
                        (e.target as Element).releasePointerCapture?.(e.pointerId);
                        setDragging(i);
                      }
                    : undefined
                }
              >
                {unit.affiliation === "hostile" && (
                  <circle r={9} className="hostile-pulse-ring" fill="none" stroke={color} strokeWidth={1.5} />
                )}
                <UnitFrame affiliation={unit.affiliation as Affiliation} color={color} />
                {showLabels && (
                  <text
                    x={0}
                    y={-12}
                    textAnchor="middle"
                    fontSize={7.5}
                    fontFamily="var(--font-data)"
                    fill="var(--ink-soft)"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
      })}
      </svg>
    );
  };

  return (
    <div
      className={`sketch-panel${compact ? " is-compact" : ""}`}
      style={accent ? ({ ["--plot-accent" as string]: accent } as React.CSSProperties) : undefined}
    >
      <div className="sandtable-plot">
        <PlotZoom zoomed={renderPlot(false, true)} caption={t("sketch.derived_note")} interactive={editable}>
          {renderPlot(true)}
        </PlotZoom>
      </div>

      {compact ? (
        <div className="sandtable-thumb-tag eyebrow">{t("sketch.tag")}</div>
      ) : (
        <>
          <div className="sketch-caption eyebrow">{t("sketch.derived_note")}</div>
          {sketch.note && <div className="sketch-note">{sketch.note}</div>}

          {editable && (
            <ul className="sketch-unit-list">
              {sketch.units.map((unit, i) => (
                <li key={i} className="sketch-unit-row">
                  <span
                    className="oob-dot"
                    style={{ background: AFFILIATION_COLOR[unit.affiliation as Affiliation] }}
                    aria-hidden="true"
                  />
                  <span className="sketch-unit-name" title={unit.basis || undefined}>
                    {unit.name}
                  </span>
                  <button
                    type="button"
                    className="sketch-remove"
                    onClick={() => removeUnit(i)}
                    aria-label={t("sketch.remove", { name: unit.name }) ?? undefined}
                    title={t("sketch.remove", { name: unit.name }) ?? undefined}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
