/**
 * Simplified MIL-STD-2525 / APP-6 affiliation frames, centered on the
 * origin - position with a <g transform="translate(x,y)">.
 *
 * Shared by both plots on purpose: the surveyed sand table
 * (ScenarioSandTable) and the text-derived relative sketch
 * (LaydownSketchPanel) must use identical symbology, so a unit reads the
 * same regardless of where its position came from. What differs between
 * those two panels is the frame around them and the caption under them -
 * never the symbol.
 */
import type { Affiliation } from "../types/schema";

interface Props {
  affiliation: Affiliation;
  color: string;
}

export function UnitFrame({ affiliation, color }: Props) {
  const common = {
    fill: `color-mix(in srgb, ${color} 26%, transparent)`,
    stroke: color,
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };
  switch (affiliation) {
    case "friend":
      return <rect x={-8} y={-5.5} width={16} height={11} rx={0.5} {...common} />;
    case "hostile":
      return <path d="M0,-8 L8,0 L0,8 L-8,0 Z" {...common} />;
    case "neutral":
      return <rect x={-6.5} y={-6.5} width={13} height={13} {...common} />;
    default:
      // Unknown - a rounded frame, kept simple.
      return <rect x={-7} y={-7} width={14} height={14} rx={6} {...common} />;
  }
}
