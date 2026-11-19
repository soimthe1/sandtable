import { useCallback, useEffect, useState } from "react";

import { buildSketch, exportCoa, exportCoaUrl, generateCoas, importScenarioUrl, reviseCoa } from "../api/client";
import type { Coa, CoaResult, GenerationWarning, LaydownSketch, Scenario, ScenarioFreeText, ScenarioInput, UiLanguage } from "../types/schema";

const EMPTY_FREE_TEXT = {
  mission_statement: "",
  terrain_description: "",
  force_composition_notes: "",
  constraints_roe: "",
  additional_notes: "",
};

export function useSessionStore(uiLanguage: UiLanguage) {
  const [freeText, setFreeText] = useState({ ...EMPTY_FREE_TEXT });
  const [importedScenario, setImportedScenarioRaw] = useState<Scenario | null>(null);
  // Where the loaded scenario came from, so the UI can say "Imported" only
  // when something was actually imported. A sample is generated locally and
  // must not be labelled as an import from the workstation.
  const [scenarioSource, setScenarioSource] = useState<"import" | "sample" | null>(null);

  // Relative disposition sketch read back from the typed free text, for
  // scenarios with no imported scenario.json. Held separately from
  // importedScenario and never merged into it - see LaydownSketch.
  const [sketch, setSketch] = useState<LaydownSketch | null>(null);
  const [sketching, setSketching] = useState(false);
  // Snapshot of the free text the current sketch was read from. Used to
  // decide whether a regenerate should re-read the text or keep the sketch
  // as it stands - see the re-read guard in generate().
  const [sketchSourceText, setSketchSourceText] = useState<string | null>(null);

  const setImportedScenario = useCallback((scenario: Scenario) => {
    setImportedScenarioRaw(scenario);
    setScenarioSource("import");
    // A surveyed scenario supersedes anything read out of prose - drop the
    // sketch rather than showing two competing laydowns.
    setSketch(null);
    setSketchSourceText(null);
  }, []);
  const [importingFromUrl, setImportingFromUrl] = useState(false);

  // Set once on load from ?return_url= (see effect below). When present,
  // this is a launch from a geospatial workstation rather than a standalone
  // visit, and the UI offers a "return to workstation" action alongside the
  // normal file download once a COA is exported.
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<CoaResult | null>(null);
  const [warnings, setWarnings] = useState<GenerationWarning[]>([]);

  const [generating, setGenerating] = useState(false);
  const [revisingCoaId, setRevisingCoaId] = useState<string | null>(null);
  const [exportingCoaId, setExportingCoaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loosely-coupled launch handoff: a workstation opens Sandtable with
  // ?scenario_url=<url-to-scenario.json>[&return_url=<page-to-return-to>]
  // instead of the officer manually downloading/uploading scenario.json.
  // See app/routers/scenario.py's import-url endpoint for the backend half.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioUrl = params.get("scenario_url");
    const returnUrlParam = params.get("return_url");

    if (returnUrlParam) setReturnUrl(returnUrlParam);

    if (scenarioUrl) {
      setImportingFromUrl(true);
      importScenarioUrl(scenarioUrl)
        .then((scenario) => {
          setImportedScenarioRaw(scenario);
          setScenarioSource("import");
        })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setImportingFromUrl(false));
    }

    // Drop the launch params from the visible URL once read, so a page
    // refresh mid-session doesn't silently re-fetch/re-import.
    if (scenarioUrl || returnUrlParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("scenario_url");
      url.searchParams.delete("return_url");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = useCallback((field: keyof typeof EMPTY_FREE_TEXT, value: string) => {
    setFreeText((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Onboarding aid: replace the form with one of the canned example
  // scenarios (frontend/src/data/sampleScenarios.ts) so a new officer can
  // see a plausible, fully-filled-out scenario and generate a real result
  // within a minute, instead of guessing what each field wants.
  //
  // Samples carry a matching fictional scenario.json, so loading one also
  // populates the sand table / roster / COA thumbnails - without this the
  // whole visual layer stays empty until a real workstation file is imported.
  // Typed structurally rather than importing SampleScenario so the store
  // stays decoupled from data/.
  const loadSample = useCallback((sample: { freeText: ScenarioFreeText; scenario: Scenario }) => {
    setFreeText({ ...sample.freeText });
    setImportedScenarioRaw(sample.scenario);
    setScenarioSource("sample");
    setSketch(null);
    setSketchSourceText(null);
  }, []);

  /**
   * Reads the sketch from the current text WITHOUT generating COAs.
   *
   * The order matters: the sketch is fed to the COA prompt, so if it misreads
   * the laydown the COAs get drafted from a wrong picture. Building it as its
   * own step lets the officer see and correct the laydown first, then spend
   * the (much longer) generation on a sketch they've agreed with.
   */
  const buildSketchNow = useCallback(async () => {
    if (importedScenario) return;
    const hasText = Object.values(freeText).some((v) => v.trim().length > 0);
    if (!hasText) return;
    setError(null);
    setSketching(true);
    try {
      const next = await buildSketch(freeText, uiLanguage);
      setSketch(next);
      setSketchSourceText(JSON.stringify(freeText));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSketching(false);
    }
  }, [freeText, importedScenario, uiLanguage]);

  const generate = useCallback(async () => {
    setError(null);
    setGenerating(true);
    try {
      // With no imported scenario.json there is nothing to draw, so read a
      // relative sketch out of the typed text first and hand it to the
      // planner too. Best-effort: a failed or empty sketch must not block
      // COA generation, which works fine from prose alone.
      let activeSketch = sketch;
      if (!importedScenario) {
        const hasText = Object.values(freeText).some((v) => v.trim().length > 0);
        const textKey = JSON.stringify(freeText);
        // Only re-read the text when the text actually changed. Regenerating
        // with the same wording used to silently discard the officer's own
        // corrections (they drag a misread unit into place, hit generate
        // again, and their fix is gone) - their edit is better evidence than
        // a re-read of prose that hasn't changed.
        const textUnchanged = sketch !== null && sketchSourceText === textKey;
        if (hasText && !textUnchanged) {
          setSketching(true);
          try {
            activeSketch = await buildSketch(freeText, uiLanguage);
            setSketch(activeSketch);
            setSketchSourceText(textKey);
          } catch {
            activeSketch = null;
          } finally {
            setSketching(false);
          }
        }
      }

      const input: ScenarioInput = {
        free_text: freeText,
        imported_scenario: importedScenario,
        sketch: importedScenario ? null : activeSketch,
        ui_language: uiLanguage,
      };
      const response = await generateCoas(input);
      setSessionId(response.session_id);
      setResult(response.result);
      setWarnings(response.warnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [freeText, importedScenario, sketch, sketchSourceText, uiLanguage]);

  const revise = useCallback(
    async (coaId: string, changeRequest: string) => {
      if (!sessionId) return;
      setError(null);
      setRevisingCoaId(coaId);
      try {
        const response = await reviseCoa(sessionId, coaId, changeRequest, uiLanguage);
        setResult(response.result);
        setWarnings(response.warnings);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRevisingCoaId(null);
      }
    },
    [sessionId, uiLanguage],
  );

  const doExport = useCallback(
    async (coaId: string) => {
      if (!sessionId) return;
      setError(null);
      setExportingCoaId(coaId);
      try {
        await exportCoa(sessionId, coaId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setExportingCoaId(null);
      }
    },
    [sessionId],
  );

  // Sends the officer back to the launching workstation with a
  // coa_result_url query param pointing at the GET-able export endpoint -
  // the write half of the URL handoff. Kept as an explicit, separate action
  // from doExport (rather than auto-navigating on export) so the officer
  // always chooses when to leave Sandtable.
  const returnToWorkstation = useCallback(
    (coaId: string) => {
      if (!sessionId || !returnUrl) return;
      const target = new URL(returnUrl);
      target.searchParams.set("coa_result_url", exportCoaUrl(sessionId, coaId));
      window.location.href = target.toString();
    },
    [sessionId, returnUrl],
  );

  const coas: Coa[] = result?.coas ?? [];

  return {
    freeText,
    updateField,
    loadSample,
    importedScenario,
    setImportedScenario,
    scenarioSource,
    sketch,
    setSketch,
    sketching,
    buildSketchNow,
    importingFromUrl,
    returnUrl,
    sessionId,
    result,
    coas,
    warnings,
    generating,
    revisingCoaId,
    exportingCoaId,
    error,
    setError,
    generate,
    revise,
    doExport,
    returnToWorkstation,
  };
}
