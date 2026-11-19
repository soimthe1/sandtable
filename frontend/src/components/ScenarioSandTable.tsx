/**
 * A schematic "sand table" plot of an imported scenario.json - the order of
 * battle and terrain features drawn as a simple 2D diagram, purely from the
 * lon/lat already on the Scenario object. This is NOT a map: no basemap, no
 * tiles, no projection beyond a per-axis min/max normalize into the panel,
 * and it says so on screen ("SCHEMATIC - NOT TO SCALE"). Real geospatial
 * accuracy is the workstation's job; this exists purely so a text-only order of
 * battle list becomes something an officer can glance at.
 *
 * Units use simplified MIL-STD/APP-6 frame shapes (friendly rectangle,
 * hostile diamond, neutral square, unknown quatrefoil) rather than plain
 * dots - correct symbology costs nothing and reads as a tactical plot
 * instead of a scatter chart.
 *
 * The radar sweep behind the plot is DECORATIVE. It rotates at a fixed rate
 * and represents no sensor, no coverage arc, and no detection state - it
 * exists to make the panel read as live. Do not wire it to data and imply
 * otherwise.
 *
 * `activeUnit` highlights one order-of-battle entry (driven by hovering the
 * roster beside it); `phaseIndex` is set while a COA's phase playback is
 * running so the plot can pulse in sympathy with the timeline.
 */
import { useTranslation } from "react-i18next";

import { AFFILIATION_COLOR } from "../lib/affiliation";
import type { Affiliation, Scenario, TerrainFeature } from "../types/schema";
import { MapPinIcon } from "./icons";
import { PlotZoom } from "./PlotZoom";
import { UnitFrame } from "./UnitFrame";

interface Props {
  scenario: Scenario | null;
  activeUnit?: string | null;
  /**
   * Thumbnail mode, used inside COA cards: no radar, no unit labels, no
   * caption - just the plot, framed in that COA's accent. The full panel
   * beside the form stays the authoritative one.
   */
  compact?: boolean;
  /** COA accent color, thumbnail mode only - tints the frame, not the units. */
  accent?: string;
}

const AFFILIATION_ORDER_LEGEND: Affiliation[] = ["friend", "hostile", "neutral", "unknown"];

const VIEW_W = 320;
const VIEW_H = 190;
const MARGIN = 30;

interface Bounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

function computeBounds(lons: number[], lats: number[]): Bounds {
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  // Guard against a single point / a perfectly straight line, which would
  // otherwise divide by zero below - pad out to a small fixed span instead.
  const lonSpan = maxLon - minLon || 0.01;
  const latSpan = maxLat - minLat || 0.01;
  return { minLon, maxLon: minLon + lonSpan, minLat, maxLat: minLat + latSpan };
}

function project(lon: number, lat: number, b: Bounds): [number, number] {
  const x = MARGIN + ((lon - b.minLon) / (b.maxLon - b.minLon)) * (VIEW_W - MARGIN * 2);
  // Screen Y grows downward; latitude grows northward - flip it.
  const y = MARGIN + (1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * (VIEW_H - MARGIN * 2);
  return [x, y];
}

/**
 * A compass mark drawn as plain shapes, not a nested <svg> - nesting the
 * shared icon <svg> component here fought with the parent viewBox's
 * coordinate system. Wrap in a <g transform="translate(x, y)"> to position.
 */
function CompassMark({ r, spin }: { r: number; spin?: boolean }) {
  return (
    <>
      <circle r={r} fill="none" stroke="currentColor" strokeWidth={1} />
      <path
        d={`M0,${-r} L0,${-r * 0.72} M0,${r} L0,${r * 0.72} M${-r},0 L${-r * 0.72},0 M${r},0 L${r * 0.72},0`}
        stroke="currentColor"
        strokeWidth={1}
      />
      <g className={spin ? "compass-spin" : undefined}>
        <path
          d={`M0,${-r * 0.55} L${r * 0.18},${r * 0.15} L0,${r * 0.32} L${-r * 0.18},${r * 0.15} Z`}
          fill="currentColor"
          stroke="none"
        />
      </g>
    </>
  );
}

function terrainPath(feature: TerrainFeature, b: Bounds): string {
  const points = feature.positions.map(([lon, lat]) => project(lon, lat, b));
  if (points.length === 0) return "";
  const closed = feature.kind === "polygon" || feature.kind === "rectangle" || feature.kind === "circle";
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return closed ? `${d} Z` : d;
}

/** Decorative radar sweep + range rings layered behind the plot. */
function RadarLayer() {
  return (
    <div className="radar-layer" aria-hidden="true">
      <div className="radar-ring" />
      <div className="radar-ring" />
      <div className="radar-ring" />
      <div className="radar-sweep" />
    </div>
  );
}

/**
 * Legend for the frame shapes actually present in this scenario - built
 * from the data, so an all-friendly scenario doesn't advertise a hostile
 * key that isn't on the plot.
 */
function SandTableLegend({ scenario }: { scenario: Scenario }) {
  const { t } = useTranslation();
  const present = AFFILIATION_ORDER_LEGEND.filter((a) =>
    scenario.order_of_battle.some((e) => e.affiliation === a),
  );
  if (present.length === 0) return null;

  return (
    <div className="sandtable-legend">
      {present.map((a) => (
        <span key={a} className="legend-item">
          <svg width={18} height={14} viewBox="-10 -8 20 16" aria-hidden="true">
            <UnitFrame affiliation={a} color={AFFILIATION_COLOR[a]} />
          </svg>
          <span>{t(`scenario.affiliation.${a}`)}</span>
        </span>
      ))}
    </div>
  );
}

export function ScenarioSandTable({ scenario, activeUnit = null, compact = false, accent }: Props) {
  const { t } = useTranslation();

  if (!scenario) {
    if (compact) return null;
    return (
      <div className="sandtable">
        <div className="sandtable-plot" aria-hidden="true">
          <RadarLayer />
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={VIEW_W} height={VIEW_H} preserveAspectRatio="xMidYMid meet">
            <rect
              x={1}
              y={1}
              width={VIEW_W - 2}
              height={VIEW_H - 2}
              fill="none"
              stroke="var(--grid-line)"
              strokeDasharray="4 3"
            />
            <g transform={`translate(${VIEW_W / 2}, ${VIEW_H / 2})`} opacity={0.75} color="var(--acetate-1)">
              <CompassMark r={26} spin />
            </g>
          </svg>
        </div>
        <div className="sandtable-caption">
          <span className="eyebrow">{t("scenario.sandtable_placeholder")}</span>
        </div>
      </div>
    );
  }

  const oobLons = scenario.order_of_battle.map((e) => e.longitude);
  const oobLats = scenario.order_of_battle.map((e) => e.latitude);
  const terrainLons = scenario.terrain_features.flatMap((f) => f.positions.map((p) => p[0]));
  const terrainLats = scenario.terrain_features.flatMap((f) => f.positions.map((p) => p[1]));
  const allLons = [scenario.home.longitude, ...oobLons, ...terrainLons];
  const allLats = [scenario.home.latitude, ...oobLats, ...terrainLats];
  const bounds = computeBounds(allLons, allLats);
  const [homeX, homeY] = project(scenario.home.longitude, scenario.home.latitude, bounds);

  // Built as a function, not inlined, so PlotZoom can mount an independent
  // copy in the zoom overlay (see PlotZoom on why it isn't reused). `full`
  // forces labels on even in compact mode - a card thumbnail hides them for
  // space, but expanding one is precisely how you read them.
  const renderPlot = (full = false) => {
    const showLabels = !compact || full;
    return (
      <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width={VIEW_W}
          height={VIEW_H}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t("scenario.sandtable_aria", { name: scenario.mission_name })}
        >
          <rect x={1} y={1} width={VIEW_W - 2} height={VIEW_H - 2} fill="none" stroke="var(--grid-line)" />
          {/* light interior grid for the plot-paper feel */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={`v${f}`}
              x1={VIEW_W * f}
              y1={4}
              x2={VIEW_W * f}
              y2={VIEW_H - 4}
              stroke="var(--grid-line)"
              strokeWidth={0.5}
            />
          ))}
          {[0.33, 0.66].map((f) => (
            <line
              key={`h${f}`}
              x1={4}
              y1={VIEW_H * f}
              x2={VIEW_W - 4}
              y2={VIEW_H * f}
              stroke="var(--grid-line)"
              strokeWidth={0.5}
            />
          ))}

          {scenario.terrain_features.map((feature, i) => {
            if (feature.kind === "point") {
              const first = feature.positions[0];
              if (!first) return null;
              const [x, y] = project(first[0], first[1], bounds);
              return (
                <rect
                  key={`terrain-${i}`}
                  x={x - 3.5}
                  y={y - 3.5}
                  width={7}
                  height={7}
                  fill="var(--paper-raised)"
                  stroke="var(--ink-soft)"
                  strokeWidth={1.2}
                  transform={`rotate(45 ${x} ${y})`}
                />
              );
            }
            const closed =
              feature.kind === "polygon" || feature.kind === "rectangle" || feature.kind === "circle";
            return (
              <path
                key={`terrain-${i}`}
                className={closed ? undefined : "terrain-flow"}
                d={terrainPath(feature, bounds)}
                fill={closed ? "color-mix(in srgb, var(--ink-soft) 14%, transparent)" : "none"}
                stroke="var(--ink-soft)"
                strokeWidth={1.3}
                strokeDasharray="5 3"
              />
            );
          })}

          {/* home reference point */}
          <g transform={`translate(${homeX}, ${homeY})`}>
            <path d="M-7,0 L7,0 M0,-7 L0,7" stroke="var(--ink)" strokeWidth={1.4} />
            <circle r={10} fill="none" stroke="var(--ink)" strokeWidth={1} strokeDasharray="2 2" />
          </g>

          {scenario.order_of_battle.map((entry, i) => {
            const [x, y] = project(entry.longitude, entry.latitude, bounds);
            const color = AFFILIATION_COLOR[entry.affiliation] ?? AFFILIATION_COLOR.unknown;
            const label = entry.name.length > 16 ? `${entry.name.slice(0, 15)}…` : entry.name;
            const isActive = activeUnit === entry.name;
            // Anchor the label inward near the panel edges so it doesn't get
            // clipped by the viewBox (markers can sit right on the margin).
            const anchor = x > VIEW_W - 60 ? "end" : x < 60 ? "start" : "middle";
            const labelX = anchor === "end" ? 10 : anchor === "start" ? -10 : 0;
            return (
              <g
                key={`oob-${i}`}
                transform={`translate(${x}, ${y})`}
                className={`oob-marker${isActive ? " is-active" : ""}`}
                style={{ ["--marker-color" as string]: color }}
              >
                {entry.affiliation === "hostile" && (
                  <circle r={9} className="hostile-pulse-ring" fill="none" stroke={color} strokeWidth={1.5} />
                )}
                {isActive && <circle r={15} className="marker-halo" fill="none" stroke={color} strokeWidth={1.2} />}
                <UnitFrame affiliation={entry.affiliation} color={color} />
                {showLabels && (
                  <text
                    x={labelX}
                    y={-12}
                    textAnchor={anchor}
                    fontSize={7.5}
                    fontFamily="var(--font-data)"
                    fill={isActive ? color : "var(--ink-soft)"}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          <g
            transform={`translate(${VIEW_W - 24}, 22)`}
            opacity={0.85}
            color={compact ? "var(--plot-accent, var(--acetate-1))" : "var(--acetate-1)"}
          >
            <CompassMark r={12} spin={!compact} />
          </g>
      </svg>
    );
  };

  return (
    <div
      className={`sandtable${compact ? " is-compact" : ""}`}
      style={accent ? ({ ["--plot-accent" as string]: accent } as React.CSSProperties) : undefined}
    >
      <div className="sandtable-plot">
        {!compact && <RadarLayer />}
        <PlotZoom zoomed={renderPlot(true)} caption={t("scenario.sandtable_disclaimer")}>
          {renderPlot()}
        </PlotZoom>
      </div>

      {compact ? (
        // Even the thumbnail keeps the "not a map" caveat on screen - it's
        // the same schematic, just smaller, and shouldn't shed the caveat
        // by being decorative.
        <div className="sandtable-thumb-tag eyebrow">{t("scenario.sandtable_schematic_tag")}</div>
      ) : (
        <>
          <div className="sandtable-caption">
            <span className="row" style={{ gap: 6 }}>
              <MapPinIcon size={12} />
              <span className="eyebrow">{scenario.mission_name}</span>
            </span>
            <span className="mono eyebrow">
              {scenario.home.longitude.toFixed(3)}, {scenario.home.latitude.toFixed(3)}
            </span>
          </div>
          <SandTableLegend scenario={scenario} />
          <div className="eyebrow" style={{ opacity: 0.7 }}>
            {t("scenario.sandtable_disclaimer")}
          </div>
        </>
      )}
    </div>
  );
}
