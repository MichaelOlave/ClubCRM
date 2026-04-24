from __future__ import annotations

import time
from datetime import UTC, datetime

from src.modules.cluster.domain.models import ChaosEnded, ChaosStarted


def parse_chaos_event(
    raw: dict,
    event_type: str,
    experiment_kind: str,
) -> ChaosStarted | ChaosEnded | None:
    metadata = raw.get("metadata") or {}
    name = metadata.get("name") or ""
    namespace = metadata.get("namespace") or ""
    ts = _parse_timestamp(raw)

    if not name or not namespace:
        return None

    if event_type == "DELETED":
        return ChaosEnded(
            experiment_kind=experiment_kind, name=name, namespace=namespace, ts=ts
        )

    desired_phase = _desired_phase(raw)

    if desired_phase in {"Stop", "stop"}:
        return ChaosEnded(
            experiment_kind=experiment_kind, name=name, namespace=namespace, ts=ts
        )

    if event_type == "ADDED" or desired_phase in {"Run", "run"}:
        return ChaosStarted(
            experiment_kind=experiment_kind, name=name, namespace=namespace, ts=ts
        )

    return None


def _desired_phase(raw: dict) -> str:
    status = raw.get("status") or {}
    experiment = status.get("experiment") or {}
    return (experiment.get("desiredPhase") or "").strip()


def _parse_timestamp(raw: dict) -> float:
    metadata = raw.get("metadata") or {}
    ts_str = (metadata.get("creationTimestamp") or "").strip()
    if ts_str:
        try:
            clean = ts_str.rstrip("Z")
            if "." in clean:
                clean = clean.split(".")[0]
            dt = datetime.fromisoformat(clean).replace(tzinfo=UTC)
            return dt.timestamp()
        except (ValueError, AttributeError):
            pass
    return time.time()
