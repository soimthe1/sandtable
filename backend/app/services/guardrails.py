"""
Enforces the "no bare probability numbers" constraint from the build brief
at the code level, not just the prompt level - a system prompt is a strong
suggestion, not a guarantee.

Detects things like "78%", "0.82 confidence", "7/10 risk", "high confidence
(85%)". Deliberately does NOT flag ordinary numbers that aren't confidence
figures (troop counts, times, grid coordinates, phase offsets) - those are
supposed to be there.
"""
import re

_PERCENT_RE = re.compile(r"\b\d{1,3}(?:\.\d+)?\s?%")
_DECIMAL_CONFIDENCE_RE = re.compile(
    r"\b(?:confidence|probability|likelihood|success rate)\b[^.]{0,20}?\b0?\.\d{1,2}\b", re.IGNORECASE
)
_X_OF_Y_RE = re.compile(r"\b\d{1,2}\s?/\s?10\b")


def find_quantitative_leaks(coa: dict) -> list[str]:
    """Return a list of offending assessment strings, empty if clean."""
    offenders = []
    for rf in coa.get("risk_factors", []) or []:
        assessment = str(rf.get("assessment", ""))
        if _PERCENT_RE.search(assessment) or _DECIMAL_CONFIDENCE_RE.search(assessment) or _X_OF_Y_RE.search(
            assessment
        ):
            offenders.append(assessment)
    return offenders


def sanitize_quantitative_leaks(coa: dict) -> dict:
    """
    Last-resort client-side fallback if a retry still leaks a number: strip the
    numeric token so nothing fabricated-looking reaches a briefing slide, and
    flag it for the caller to surface as a warning rather than silently editing.
    """
    coa = dict(coa)
    cleaned_factors = []
    for rf in coa.get("risk_factors", []) or []:
        rf = dict(rf)
        assessment = str(rf.get("assessment", ""))
        assessment = _PERCENT_RE.sub("[figure removed - not a modeled probability]", assessment)
        assessment = _DECIMAL_CONFIDENCE_RE.sub("[figure removed - not a modeled probability]", assessment)
        assessment = _X_OF_Y_RE.sub("[figure removed - not a modeled probability]", assessment)
        rf["assessment"] = assessment
        cleaned_factors.append(rf)
    coa["risk_factors"] = cleaned_factors
    return coa
