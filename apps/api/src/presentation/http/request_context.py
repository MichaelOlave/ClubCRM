from dataclasses import dataclass
from urllib.parse import urlparse

from fastapi import Request

from src.modules.auth.domain.entities import CurrentUser

ORIGIN_PATH_HEADER_NAME = "X-ClubCRM-Origin-Path"


@dataclass(frozen=True)
class AuthenticatedRequestContext:
    current_user: CurrentUser
    request_id: str
    api_route: str
    http_method: str
    origin_path: str | None


def _get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if isinstance(request_id, str) and request_id:
        return request_id

    return ""


def _get_api_route(request: Request) -> str:
    route = request.scope.get("route")
    route_path = getattr(route, "path", None)
    if isinstance(route_path, str) and route_path:
        return route_path

    return request.url.path


def _get_origin_path(request: Request) -> str | None:
    forwarded_origin_path = request.headers.get(ORIGIN_PATH_HEADER_NAME)
    if isinstance(forwarded_origin_path, str) and forwarded_origin_path.strip():
        return forwarded_origin_path.strip()

    referer = request.headers.get("referer")
    if not isinstance(referer, str) or not referer.strip():
        return None

    parsed = urlparse(referer)
    if not parsed.path:
        return None

    if parsed.query:
        return f"{parsed.path}?{parsed.query}"

    return parsed.path


def _build_context(request: Request, current_user: CurrentUser) -> AuthenticatedRequestContext:
    return AuthenticatedRequestContext(
        current_user=current_user,
        request_id=_get_request_id(request),
        api_route=_get_api_route(request),
        http_method=request.method,
        origin_path=_get_origin_path(request),
    )


def get_authenticated_request_context(request: Request) -> AuthenticatedRequestContext:
    from src.modules.auth.presentation.http.dependencies import require_authenticated_user

    current_user = require_authenticated_user(request)
    return _build_context(request, current_user)


def get_authenticated_write_context(request: Request) -> AuthenticatedRequestContext:
    from src.modules.auth.presentation.http.dependencies import (
        require_authenticated_user,
        require_csrf,
    )

    current_user = require_authenticated_user(request)
    require_csrf(request)
    return _build_context(request, current_user)
