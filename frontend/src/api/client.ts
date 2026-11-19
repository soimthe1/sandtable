import type { GenerateCoaResponse, LaydownSketch, Scenario, ScenarioFreeText, ScenarioInput, UiLanguage } from "../types/schema";

// In dev, Vite proxies /api to the FastAPI backend (see vite.config.ts).
// In production, set VITE_API_BASE_URL if the frontend isn't served from
// the same origin as the backend.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* response wasn't JSON - fall back to statusText */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function importScenario(file: File): Promise<Scenario> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/scenario/import`, { method: "POST", body: form });
  return asJson<Scenario>(res);
}

// URL-based counterpart to importScenario, for the loosely-coupled handoff
// from a geospatial workstation (see useSessionStore.ts's handling of the
// ?scenario_url= launch parameter). The backend fetches `url` server-side -
// this call never touches the URL's host directly, so it isn't subject to
// that host's CORS policy.
export async function importScenarioUrl(url: string): Promise<Scenario> {
  const res = await fetch(`${API_BASE}/api/scenario/import-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return asJson<Scenario>(res);
}

// Absolute URL a workstation can GET to fetch an exported COA back - the
// write half of the URL handoff (see routers/export.py's export_coa_by_url).
// Built from window.location.origin, not API_BASE: this URL is handed to a
// *different* origin (the workstation), so it must be a full absolute URL
// regardless of whether this app happens to be running behind a same-origin
// proxy in production.
export function exportCoaUrl(sessionId: string, coaId: string): string {
  return `${window.location.origin}${API_BASE}/api/export/coa/${sessionId}/${coaId}`;
}

// Reads a relative disposition sketch out of the typed scenario text, so a
// scenario with no imported scenario.json still has something to draw. An
// empty sketch is a normal result, not an error - see the backend's
// LaydownSketch for why this is extraction and not geocoding.
export async function buildSketch(freeText: ScenarioFreeText, uiLanguage: UiLanguage): Promise<LaydownSketch> {
  const res = await fetch(`${API_BASE}/api/scenario/sketch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ free_text: freeText, ui_language: uiLanguage }),
  });
  return asJson<LaydownSketch>(res);
}

export async function generateCoas(input: ScenarioInput): Promise<GenerateCoaResponse> {
  const res = await fetch(`${API_BASE}/api/coa/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson<GenerateCoaResponse>(res);
}

export async function reviseCoa(
  sessionId: string,
  coaId: string,
  changeRequest: string,
  uiLanguage: "en" | "ar",
): Promise<GenerateCoaResponse> {
  const res = await fetch(`${API_BASE}/api/coa/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      coa_id: coaId,
      change_request: changeRequest,
      ui_language: uiLanguage,
    }),
  });
  return asJson<GenerateCoaResponse>(res);
}

export async function exportCoa(sessionId: string, coaId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/export/coa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, coa_id: coaId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? res.statusText);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `${coaId}-coa_result.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
