from dataclasses import asdict, replace
from datetime import UTC, datetime
from secrets import compare_digest, token_urlsafe
from typing import Literal

from fastapi import HTTPException, Request, Response, status

from src.bootstrap.dependencies import (
    get_auth_session_store,
    get_authorization_repository,
    get_club_repository,
)
from src.config import get_settings
from src.modules.auth.application.commands.resolve_authorized_access import (
    ResolveAuthorizedAccess,
)
from src.modules.auth.application.ports.auth_session_store import AuthSessionRecord
from src.modules.auth.application.ports.authorization_repository import AuthorizationRepository
from src.modules.auth.application.queries.get_current_user import GetCurrentUser
from src.modules.auth.application.queries.get_session_access import GetSessionAccess
from src.modules.auth.domain.entities import AppAccess, CurrentUser
from src.modules.clubs.application.ports.club_repository import ClubRepository

DeveloperBypassRole = Literal["org_admin", "club_manager"]

DEFAULT_DEVELOPER_BYPASS_ORGANIZATION_ID = "dev-org-bypass"
DEVELOPER_BYPASS_ROLE_QUERY_PARAM = "role"


def parse_developer_bypass_role(role: str | None) -> DeveloperBypassRole:
    return "club_manager" if role == "club_manager" else "org_admin"


def get_requested_developer_bypass_role(request: Request) -> DeveloperBypassRole | None:
    requested_role = request.query_params.get(DEVELOPER_BYPASS_ROLE_QUERY_PARAM)
    if not isinstance(requested_role, str) or not requested_role:
        return None

    return parse_developer_bypass_role(requested_role)


def get_developer_bypass_role(current_user: CurrentUser) -> DeveloperBypassRole | None:
    if current_user.sub == "dev-auth-bypass-club-manager":
        return "club_manager"

    if current_user.sub in {"dev-auth-bypass-org-admin", "dev-auth-bypass-user"}:
        return "org_admin"

    return None


def build_developer_bypass_user(role: DeveloperBypassRole = "org_admin") -> CurrentUser:
    if role == "club_manager":
        return CurrentUser(
            sub="dev-auth-bypass-club-manager",
            email="club-manager@clubcrm.local",
            name="Local Club Manager",
            email_verified=True,
        )

    return CurrentUser(
        sub="dev-auth-bypass-user",
        email="developer@clubcrm.local",
        name="Local Developer",
        email_verified=True,
    )


def _get_developer_bypass_organization_id(
    *,
    authorization_repository: AuthorizationRepository,
    club_repository: ClubRepository,
) -> str:
    admin_resolution = ResolveAuthorizedAccess(repository=authorization_repository).execute(
        build_developer_bypass_user("org_admin")
    )
    if admin_resolution.access is not None:
        return admin_resolution.access.organization_id

    clubs = club_repository.list_clubs()
    if clubs:
        return clubs[0].organization_id

    return DEFAULT_DEVELOPER_BYPASS_ORGANIZATION_ID


def build_developer_bypass_access(
    role: DeveloperBypassRole,
    *,
    authorization_repository: AuthorizationRepository | None = None,
    club_repository: ClubRepository | None = None,
) -> AppAccess:
    active_authorization_repository = authorization_repository or get_authorization_repository()
    active_club_repository = club_repository or get_club_repository()

    organization_id = _get_developer_bypass_organization_id(
        authorization_repository=active_authorization_repository,
        club_repository=active_club_repository,
    )
    if role == "org_admin":
        admin_resolution = ResolveAuthorizedAccess(
            repository=active_authorization_repository
        ).execute(build_developer_bypass_user("org_admin"))
        if admin_resolution.access is not None:
            return admin_resolution.access

        return AppAccess(
            primary_role="org_admin",
            organization_id=organization_id,
            managed_club_ids=(),
        )

    resolved_access = (
        ResolveAuthorizedAccess(repository=active_authorization_repository)
        .execute(build_developer_bypass_user("club_manager"))
        .access
    )
    if resolved_access is not None and resolved_access.managed_club_ids:
        return AppAccess(
            primary_role="club_manager",
            organization_id=resolved_access.organization_id,
            managed_club_ids=resolved_access.managed_club_ids,
        )

    managed_clubs = active_club_repository.list_clubs(organization_id)
    managed_club_ids = (managed_clubs[0].id,) if managed_clubs else ()
    return AppAccess(
        primary_role="club_manager",
        organization_id=organization_id,
        managed_club_ids=managed_club_ids,
    )


def _build_auth_session_record(
    *,
    user: dict[str, object] | None,
    access: dict[str, object] | None,
    csrf_token: str | None,
    auth_flow_state: str | None,
) -> AuthSessionRecord:
    return AuthSessionRecord(
        user=user,
        access=access,
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


def _serialize_session_access(access: AppAccess | None) -> dict[str, object] | None:
    if access is None:
        return None

    return {
        "primary_role": access.primary_role,
        "organization_id": access.organization_id,
        "managed_club_ids": list(access.managed_club_ids),
    }


def serialize_access_for_response(access: AppAccess | None) -> dict[str, object] | None:
    if access is None:
        return None

    return {
        "primaryRole": access.primary_role,
        "organizationId": access.organization_id,
        "managedClubIds": list(access.managed_club_ids),
    }


def get_session_access(request: Request) -> AppAccess | None:
    auth_session = _get_auth_session(request)
    if auth_session is None:
        return None

    session_id, session_record = auth_session
    session_payload = session_record.access
    if session_payload is None:
        return None
    if not isinstance(session_payload, dict):
        get_auth_session_store().save(session_id, replace(session_record, access=None))
        return None

    try:
        return GetSessionAccess().execute(session_payload)
    except ValueError:
        get_auth_session_store().save(session_id, replace(session_record, access=None))
        return None


def persist_session_user(
    request: Request,
    current_user: CurrentUser,
    access: AppAccess | None = None,
) -> tuple[str, str]:
    clear_auth_session(request)
    csrf_token = token_urlsafe(32)
    session_id = get_auth_session_store().create(
        _build_auth_session_record(
            user=asdict(current_user),
            access=_serialize_session_access(access),
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
            access=None,
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


def refresh_session_access(request: Request) -> AppAccess | None:
    auth_session = _get_auth_session(request)
    if auth_session is None:
        return None

    session_id, session_record = auth_session
    current_user = get_session_user(request)
    if current_user is None:
        return None

    developer_bypass_role = get_developer_bypass_role(current_user)
    if get_settings().auth.bypass_enabled and developer_bypass_role is not None:
        next_access = build_developer_bypass_access(
            developer_bypass_role,
            authorization_repository=get_authorization_repository(),
            club_repository=get_club_repository(),
        )
    else:
        next_access = (
            ResolveAuthorizedAccess(repository=get_authorization_repository())
            .execute(current_user)
            .access
        )

    next_access_payload = _serialize_session_access(next_access)
    if session_record.access != next_access_payload:
        get_auth_session_store().save(
            session_id,
            replace(session_record, access=next_access_payload),
        )

    return next_access


def require_authenticated_user(request: Request) -> CurrentUser:
    current_user = get_session_user(request)
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return current_user


def require_authorized_access(request: Request) -> AppAccess:
    require_authenticated_user(request)
    access = refresh_session_access(request)
    if access is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ClubCRM access is not provisioned for this account.",
        )

    return access


def require_org_admin_access(request: Request) -> AppAccess:
    access = require_authorized_access(request)
    if access.primary_role != "org_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization admin access is required for this action.",
        )

    return access


def ensure_club_access(access: AppAccess, club_id: str) -> None:
    if access.primary_role == "org_admin":
        return

    if club_id not in access.managed_club_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account does not have access to the requested club.",
        )


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
