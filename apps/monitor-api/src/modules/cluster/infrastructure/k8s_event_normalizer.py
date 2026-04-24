from __future__ import annotations

import time
from datetime import UTC, datetime

from src.modules.cluster.domain.models import K8sWarning


def parse_k8s_warning(raw: dict) -> K8sWarning | None:
    if raw.get("type") != "Warning":
        return None

    involved = raw.get("involvedObject") or {}
    obj_kind = involved.get("kind") or "Unknown"
    obj_namespace = involved.get("namespace") or None
    obj_name = involved.get("name") or ""
    reason = raw.get("reason") or "Unknown"
    message = (raw.get("message") or "").strip()
    ts = _parse_timestamp(raw)

    return K8sWarning(
        involved_object_kind=obj_kind,
        involved_object_namespace=obj_namespace if obj_namespace else None,
        involved_object_name=obj_name,
        reason=reason,
        message=message,
        ts=ts,
    )


def _parse_timestamp(raw: dict) -> float:
    ts_str = raw.get("lastTimestamp") or raw.get("eventTime")
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
