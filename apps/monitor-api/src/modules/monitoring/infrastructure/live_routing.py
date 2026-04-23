from __future__ import annotations

from urllib.parse import urljoin

import httpx

DEFAULT_CLUBCRM_DEMO_PATH = "/demo/failover"
FALLBACK_CLUBCRM_DEMO_PATH = "/system/health"
LIVE_ROUTING_PATH = "/system/health/live-routing"


def normalize_demo_url(raw_url: str) -> str:
    try:
        url = httpx.URL(raw_url)
    except Exception:
        return raw_url

    if url.path in {"", "/", "/login"}:
        return str(url.copy_with(path=DEFAULT_CLUBCRM_DEMO_PATH, query=None, fragment=None))

    return str(url)


def build_demo_url_candidates(preferred_url: str) -> list[str]:
    normalized = normalize_demo_url(preferred_url)
    return list(
        dict.fromkeys(
            [
                normalized,
                urljoin(normalized, DEFAULT_CLUBCRM_DEMO_PATH),
                urljoin(normalized, FALLBACK_CLUBCRM_DEMO_PATH),
            ]
        )
    )


def build_live_routing_url(demo_url: str) -> str:
    return urljoin(demo_url, LIVE_ROUTING_PATH)


async def resolve_live_routing_url(preferred_demo_url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=2.0) as client:
        for candidate in build_demo_url_candidates(preferred_demo_url):
            try:
                response = await client.get(candidate)
            except Exception:
                continue

            if 200 <= response.status_code < 300:
                return build_live_routing_url(candidate)

    return build_live_routing_url(normalize_demo_url(preferred_demo_url))


async def fetch_live_routing_snapshot(preferred_demo_url: str) -> tuple[str, dict]:
    live_routing_url = await resolve_live_routing_url(preferred_demo_url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=2.0) as client:
        response = await client.get(
            live_routing_url,
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        return live_routing_url, response.json()
