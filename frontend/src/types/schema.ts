export type UiLanguage = "en" | "ar";

// --- scenario.json (workstation -> Sandtable) ---
export interface GeoPoint {
  longitude: number;
  latitude: number;
}

export type Affiliation = "friend" | "hostile" | "neutral" | "unknown";

export interface OrderOfBattleEntry {
  name: string;
  sidc: string;
  affiliation: Affiliation;
  longitude: number;
  latitude: number;
}

export type TerrainKind = "polygon" | "polyline" | "point" | "rectangle" | "circle" | "volume";

export interface TerrainFeature {
  name: string;
  kind: TerrainKind;
  positions: number[][];
}

export interface Scenario {
  version: string;
  mission_name: string;
  generated_at: string;
  home: GeoPoint;
  order_of_battle: OrderOfBattleEntry[];
  terrain_features: TerrainFeature[];
  constraints: string;
}

// --- what the on-screen form collects ---
export interface ScenarioFreeText {
  mission_statement: string;
  terrain_description: string;
  force_composition_notes: string;
  constraints_roe: string;
  additional_notes: string;
}

// --- relative disposition sketch (read back from the officer's free text) ---
// x/y are fractions of a blank square (0,0 = north-west), NOT coordinates.
// See backend LaydownSketch: free text carries no survey data, so anything
// derived from prose stays in this relative frame and is never exported as
// geometry or merged into an imported Scenario.
export interface SketchUnit {
  name: string;
  affiliation: Affiliation;
  x: number;
  y: number;
  basis: string;
}

export type SketchFeatureKind = "line" | "area" | "point";

export interface SketchFeature {
  name: string;
  kind: SketchFeatureKind;
  points: number[][];
}

export interface LaydownSketch {
  units: SketchUnit[];
  features: SketchFeature[];
  note: string;
}

export interface ScenarioInput {
  free_text: ScenarioFreeText;
  imported_scenario: Scenario | null;
  sketch: LaydownSketch | null;
  ui_language: UiLanguage;
}

// --- coa_result.json (Sandtable -> workstation / export) ---
export interface CoaPhase {
  name: string;
  description: string;
  start_offset_min: number;
}

export interface RiskFactor {
  factor: string;
  assessment: string;
}

export interface DrawnFeatureStyle {
  color: string;
  width: number;
  fillAlpha: number;
  extrudeHeight?: number | null;
}

export type DrawnKind =
  | "point"
  | "polyline"
  | "polygon"
  | "rectangle"
  | "circle"
  | "volume"
  | "measure-distance"
  | "measure-area";

export interface DrawnFeature {
  id: string;
  kind: DrawnKind;
  name: string;
  positions: number[][];
  style: DrawnFeatureStyle;
  createdAt: string;
}

export interface MissionBundle {
  id: string;
  name: string;
  description: string;
  features: { drawn: DrawnFeature[] };
  czml: Record<string, unknown>[];
}

export interface Coa {
  id: string;
  name: string;
  narrative: string;
  phases: CoaPhase[];
  red_team_critique: string;
  risk_factors: RiskFactor[];
  recommended_mission: MissionBundle | null;
}

export interface CoaResult {
  version: string;
  scenario_ref: string;
  generated_at: string;
  coas: Coa[];
}

export interface GenerationWarning {
  coa_id: string;
  message: string;
}

export interface GenerateCoaResponse {
  session_id: string;
  result: CoaResult;
  warnings: GenerationWarning[];
}
