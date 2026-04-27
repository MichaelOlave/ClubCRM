from datetime import UTC, datetime
from typing import Any
from uuid import uuid4


def build_event(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "eventId": str(uuid4()),
        "eventType": event_type,
        "occurredAt": datetime.now(UTC).isoformat(),
        "data": data,
    }
