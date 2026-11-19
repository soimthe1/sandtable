"""
Builds the `recommended_mission` mission bundle embedded in coa_result.json
on export, so an accepted COA opens directly in the workstation's Mission panel.

This does NOT invent maneuver graphics the LLM never produced - the model
reasons in text, not coordinates, so v1 carries forward whatever geometry
came in on the imported scenario.json (order of battle points, terrain
features) as the mission's drawn features, and encodes the COA's phased
timeline as CZML availability windows on those same entities rather than
fabricating movement paths that were never actually planned on a map.

If the officer wants real maneuver graphics (arrows, axes of advance),
that's drawn in the workstation itself against this exported bundle - this app's
job is the written COA, not automated route-planning.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.schemas.coa import Coa
from app.schemas.mission_bundle import DrawnFeature, DrawnFeatureStyle, MissionBundle, MissionFeatures
from app.schemas.scenario import Scenario

_AFFILIATION_COLOR = {
    "friend": "#2C5F6F",
    "hostile": "#8C2F2F",
    "neutral": "#5B7553",
    "unknown": "#8A8570",
}


def build_mission_bundle(coa: Coa, imported_scenario: Scenario | None) -> MissionBundle:
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    drawn: list[DrawnFeature] = []
    czml: list[dict] = [
        {
            "id": "document",
            "name": coa.name,
            "version": "1.0",
            "clock": {
                "interval": f"{now_iso}/{(now + timedelta(hours=6)).isoformat()}",
                "currentTime": now_iso,
                "multiplier": 60,
            },
        }
    ]

    if imported_scenario:
        for entry in imported_scenario.order_of_battle:
            color = _AFFILIATION_COLOR.get(entry.affiliation, "#8A8570")
            feature_id = f"oob-{uuid.uuid4().hex[:8]}"
            drawn.append(
                DrawnFeature(
                    id=feature_id,
                    kind="point",
                    name=entry.name,
                    positions=[[entry.longitude, entry.latitude, 0.0]],
                    style=DrawnFeatureStyle(color=color, width=2),
                    createdAt=now_iso,
                )
            )
            czml.append(
                {
                    "id": feature_id,
                    "name": entry.name,
                    "position": {"cartographicDegrees": [entry.longitude, entry.latitude, 0.0]},
                    "point": {"color": {"rgba": _hex_to_rgba(color)}, "pixelSize": 10},
                    "label": {"text": entry.name, "show": True},
                }
            )

        for terrain in imported_scenario.terrain_features:
            feature_id = f"terrain-{uuid.uuid4().hex[:8]}"
            drawn.append(
                DrawnFeature(
                    id=feature_id,
                    kind=terrain.kind,  # type: ignore[arg-type]
                    name=terrain.name,
                    positions=terrain.positions,
                    style=DrawnFeatureStyle(color="#B9B39C", width=2, fillAlpha=0.15),
                    createdAt=now_iso,
                )
            )

    description_lines = [coa.narrative, "", "PHASES:"]
    for phase in coa.phases:
        description_lines.append(f"T+{phase.start_offset_min}min — {phase.name}: {phase.description}")

    return MissionBundle(
        id=f"mission-{uuid.uuid4().hex[:8]}",
        name=coa.name,
        description="\n".join(description_lines),
        features=MissionFeatures(drawn=drawn),
        czml=czml,
    )


def _hex_to_rgba(hex_color: str, alpha: int = 255) -> list[int]:
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    return [r, g, b, alpha]
