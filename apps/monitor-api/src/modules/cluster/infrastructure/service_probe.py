from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Literal
from urllib import error, request
from urllib.parse import urlparse

ProbeStatus = Literal["ok", "degraded", "failed"]


@dataclass(frozen=True)
class ProbeTarget:
    service: str
    url: str
    headers: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ProbeResult:
    service: str
    url: str
    status: ProbeStatus
    checked_at: float
    latency_ms: float | None
    status_code: int | None
    detail: str | None


def parse_probe_targets(raw: str | None) -> list[ProbeTarget]:
    if raw is None:
        return []

    targets: list[ProbeTarget] = []
    seen: set[str] = set()
    for chunk in raw.replace("\n", ",").split(","):
        entry = chunk.strip()
        if not entry:
            continue

        service, url = _parse_probe_target(entry)
        if not url or url in seen:
            continue
        seen.add(url)

        # Automatically inject Host header for cluster IPs to ensure correct routing
        headers = {}
        if any(ip in url for ip in ["100.122.118.85", "100.67.65.5", "100.99.187.90"]):
            headers["Host"] = "clubcrm.local"

        targets.append(ProbeTarget(service=service, url=url, headers=headers))
    return targets


def run_probe(
    target: ProbeTarget,
    *,
    timeout_seconds: float,
    degraded_latency_ms: float,
) -> ProbeResult:
    started_at = time.time()
    latency_ms: float | None = None
    status_code: int | None = None

    try:
        req = request.Request(target.url, method="GET")
        for key, value in target.headers.items():
            req.add_header(key, value)

        response = request.urlopen(
            req,
            timeout=timeout_seconds,
        )
        with response:
            status_code = getattr(response, "status", None) or response.getcode()
            response.read(1)
    except error.HTTPError as exc:
        latency_ms = (time.time() - started_at) * 1000
        status_code = exc.code
        return ProbeResult(
            service=target.service,
            url=target.url,
            status="degraded",
            checked_at=time.time(),
            latency_ms=latency_ms,
            status_code=status_code,
            detail=f"HTTP {status_code}",
        )
    except Exception as exc:
        return ProbeResult(
            service=target.service,
            url=target.url,
            status="failed",
            checked_at=time.time(),
            latency_ms=None,
            status_code=None,
            detail=str(exc) or exc.__class__.__name__,
        )

    latency_ms = (time.time() - started_at) * 1000
    if status_code is None:
        return ProbeResult(
            service=target.service,
            url=target.url,
            status="failed",
            checked_at=time.time(),
            latency_ms=None,
            status_code=None,
            detail="missing HTTP status",
        )

    if 200 <= status_code < 300 and latency_ms <= degraded_latency_ms:
        status = "ok"
        detail = None
    elif 200 <= status_code < 300:
        status = "degraded"
        detail = f"slow response ({latency_ms:.0f} ms)"
    else:
        status = "degraded"
        detail = f"HTTP {status_code}"

    return ProbeResult(
        service=target.service,
        url=target.url,
        status=status,
        checked_at=time.time(),
        latency_ms=latency_ms,
        status_code=status_code,
        detail=detail,
    )


def _parse_probe_target(entry: str) -> tuple[str, str]:
    service, separator, url = entry.partition("=")
    if separator:
        return service.strip() or _derive_service_name(url), url.strip()
    return _derive_service_name(entry), entry


def _derive_service_name(url: str) -> str:
    parsed = urlparse(url)
    if parsed.hostname:
        return parsed.hostname
    return url.strip() or "service"
