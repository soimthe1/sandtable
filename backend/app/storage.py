"""
v1 deliberately has no database (see build brief non-goals: no persistent
multi-user session store, no auth, single-officer local use). A session is
just "the last generation result", kept in process memory and addressable
by a session_id so the frontend can revise/export individual COAs without
re-sending the whole result on every call.

Restarting the backend process loses in-flight sessions - that's fine for
v1. Add real persistence later only if there's a need to browse historical
COA sessions, per the build brief.
"""
import uuid
from dataclasses import dataclass, field

from app.schemas.coa import CoaResult
from app.schemas.scenario import ScenarioInput


@dataclass
class Session:
    id: str
    scenario: ScenarioInput
    result: CoaResult


_sessions: dict[str, Session] = {}


def create_session(scenario: ScenarioInput, result: CoaResult) -> Session:
    session_id = uuid.uuid4().hex
    session = Session(id=session_id, scenario=scenario, result=result)
    _sessions[session_id] = session
    return session


def get_session(session_id: str) -> Session | None:
    return _sessions.get(session_id)


def update_result(session_id: str, result: CoaResult) -> None:
    if session_id in _sessions:
        _sessions[session_id].result = result
