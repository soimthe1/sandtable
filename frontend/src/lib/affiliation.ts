/**
 * Shared MIL-STD-2525C-flavored affiliation palette. Was previously
 * duplicated inline in ScenarioSandTable.tsx and mission_bundle_builder.py's
 * _AFFILIATION_COLOR (backend) - this is the one place the frontend defines
 * it, so OrderOfBattleRoster and ScenarioSandTable can't drift apart.
 */
import type { Affiliation } from "../types/schema";

// Standard MIL-STD reading - blue friendly, red hostile, green neutral,
// amber unknown - at brightnesses that hold up on the dark ops-room ground
// (tokens.css). Retuned from the old dark-on-cream values, which were
// near-invisible once the theme flipped.
export const AFFILIATION_COLOR: Record<Affiliation, string> = {
  friend: "#4EA9DE",
  hostile: "#E8595B",
  neutral: "#6FBF4F",
  unknown: "#D9BC5C",
};

// Fixed display order, not insertion order - friend/hostile first regardless
// of how the imported scenario.json happened to list its order_of_battle.
export const AFFILIATION_ORDER: Affiliation[] = ["friend", "hostile", "neutral", "unknown"];
