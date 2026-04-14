from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class AuditLog:
    id: str
    occurred_at: datetime
    actor_sub: str
    action: str
    resource_type: str
    resource_id: str
    actor_email: str | None = None
    actor_name: str | None = None
    resource_label: str | None = None
    api_route: str = ""
    http_method: str = ""
    origin_path: str | None = None
    request_id: str = ""
    summary_json: dict[str, Any] = field(default_factory=dict)
