from dataclasses import asdict, replace
from datetime import UTC, datetime
from secrets import compare_digest, token_urlsafe

from fastapi import HTTPException, Request, Response, status

from src.bootstrap.dependencies import get_auth_session_store
from src.config import get_settings
from src.modules.auth.application.ports.auth_session_store import AuthSessionRecord
from src.modules.auth.application.queries.get_current_user import GetCurrentUser
from src.modules.auth.domain.entities import CurrentUser


def build_developer_bypass_user() -> CurrentUser:
    return CurrentUser(
        sub="dev-auth-bypass-user",
        email="developer@clubcrm.local",
        name="Local Developer",
        email_verified=True,
    )


def _build_auth_session_record(
    *,
    user: dict[str, object] | None,
    csrf_token: str | None,
    auth_flow_state: str | None,
) -> AuthSessionRecord:
    return AuthSessionRecord(
        user=user,
        csrf_token=csrf_token,
        auth_flow_state=auth_flow_state,
        created_at=datetime.now(UTC).isoformat(),
    )


def get_session_id(request: Request) -> str | None:
    auth_settings = get_settings().auth
    session_id = request.cookies.get(auth_settings.session_cookie_name)
    if isinstance(session_id, str) and session_id:
        return session_id
    return None


def _get_auth_session(request: Request) -> tuple[str, AuthSessionRecord] | None:
    session_id = get_session_id(request)
    if session_id is None:
        return None

    session = get_auth_session_store().get(session_id)
    if session is None:
        return None

    return session_id, session


def get_session_user(request: Request) -> CurrentUser | None:
    auth_session = _get_auth_session(request)
    if auth_session is None:
        return None

    session_id, session_record = auth_session
    session_payload = session_record.user
    if session_payload is None:
        return None
    if not isinstance(session_payload, dict):
        get_auth_session_store().delete(session_id)
        return None

    try:
        return GetCurrentUser().execute(session_payload)
    except ValueError:
        get_auth_session_store().delete(session_id)
        return None


def persist_session_user(request: Request, current_user: CurrentUser) -> tuple[str, str]:
    clear_auth_session(request)
    csrf_token = token_urlsafe(32)
    session_id = get_auth_session_store().create(
        _build_auth_session_record(
            user=asdict(current_user),
            csrf_token=csrf_token,
            auth_flow_state=None,
        )
    )
    return session_id, csrf_token


def clear_auth_session(request: Request) -> None:
    session_id = get_session_id(request)
    if session_id is not None:
        get_auth_session_store().delete(session_id)


def delete_auth_session(session_id: str) -> None:
    get_auth_session_store().delete(session_id)


def ensure_csrf_token(request: Request) -> str:
    auth_session = _get_auth_session(request)
    if auth_session is None:
        raise RuntimeError("Cannot issue a CSRF token without an auth session.")

    session_id, session_record = auth_session
    csrf_token = session_record.csrf_token
    if isinstance(csrf_token, str) and csrf_token:
        return csrf_token

    csrf_token = token_urlsafe(32)
    get_auth_session_store().save(
        session_id,
        replace(session_record, csrf_token=csrf_token),
    )
    return csrf_token


def begin_auth_flow(request: Request) -> tuple[str, str]:
    clear_auth_session(request)
    auth_flow_state = token_urlsafe(32)
    session_id = get_auth_session_store().create(
        _build_auth_session_record(
            user=None,
            csrf_token=None,
            auth_flow_state=auth_flow_state,
        )
    )
    return session_id, auth_flow_state


def consume_auth_flow_state(request: Request) -> str | None:
    auth_session = _get_auth_session(request)
    if auth_session is None:
        return None

    session_id, session_record = auth_session
    auth_flow_state = session_record.auth_flow_state
    if auth_flow_state is not None:
        get_auth_session_store().save(
            session_id,
            replace(session_record, auth_flow_state=None),
        )

    if isinstance(auth_flow_state, str) and auth_flow_state:
        return auth_flow_state

    return None


def touch_auth_session(request: Request) -> None:
    session_id = get_session_id(request)
    if session_id is not None:
        get_auth_session_store().touch(session_id)


def attach_session_cookie(response: Response, session_id: str) -> None:
    auth_settings = get_settings().auth
    response.set_cookie(
        key=auth_settings.session_cookie_name,
        value=session_id,
        max_age=auth_settings.session_cookie_max_age_seconds,
        path="/",
        secure=auth_settings.session_cookie_https_only,
        httponly=True,
        samesite=auth_settings.session_cookie_same_site,
    )


def clear_session_cookie(response: Response) -> None:
    auth_settings = get_settings().auth
    response.delete_cookie(
        key=auth_settings.session_cookie_name,
        path="/",
        secure=auth_settings.session_cookie_https_only,
        httponly=True,
        samesite=auth_settings.session_cookie_same_site,
    )


def attach_csrf_cookie(response: Response, csrf_token: str) -> None:
    auth_settings = get_settings().auth
    response.set_cookie(
        key=auth_settings.csrf_cookie_name,
        value=csrf_token,
        max_age=auth_settings.session_cookie_max_age_seconds,
        path="/",
        secure=auth_settings.session_cookie_https_only,
        httponly=False,
        samesite=auth_settings.session_cookie_same_site,
    )


def clear_csrf_cookie(response: Response) -> None:
    auth_settings = get_settings().auth
    response.delete_cookie(
        key=auth_settings.csrf_cookie_name,
        path="/",
        secure=auth_settings.session_cookie_https_only,
        httponly=False,
        samesite=auth_settings.session_cookie_same_site,
    )


def require_authenticated_user(request: Request) -> CurrentUser:
    current_user = get_session_user(request)
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return current_user


def require_csrf(request: Request) -> None:
    auth_settings = get_settings().auth
    auth_session = _get_auth_session(request)
    session_token = auth_session[1].csrf_token if auth_session is not None else None
    cookie_token = request.cookies.get(auth_settings.csrf_cookie_name)
    csrf_header = request.headers.get(auth_settings.csrf_header_name)

    if not all(
        isinstance(token, str) and token for token in (session_token, cookie_token, csrf_header)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing CSRF token.",
        )

    if not (
        isinstance(session_token, str)
        and isinstance(cookie_token, str)
        and isinstance(csrf_header, str)
        and compare_digest(session_token, cookie_token)
        and compare_digest(session_token, csrf_header)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token.",
        )
