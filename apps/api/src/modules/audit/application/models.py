from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from src.modules.audit.domain.entities import AuditLog


@dataclass(frozen=True)
class AuditLogWrite:
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


@dataclass(frozen=True)
class AuditLogFilters:
    action: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    actor_query: str | None = None
    occurred_from: datetime | None = None
    occurred_to: datetime | None = None
    limit: int = 50
    offset: int = 0


@dataclass(frozen=True)
class AuditLogPage:
    items: list["AuditLog"]
    page: int
    page_size: int
    has_next: bool
