from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse

from src.bootstrap.dependencies import (
    get_authorization_repository,
    get_club_repository,
    get_optional_auth_identity_provider,
)
from src.config import get_settings
from src.modules.auth.application.commands.finalize_auth_session import (
    FinalizeAuthSession,
)
from src.modules.auth.application.commands.resolve_authorized_access import (
    ResolveAuthorizedAccess,
)
from src.modules.auth.application.commands.start_login import StartLogin
from src.modules.auth.application.ports.authorization_repository import AuthorizationRepository
from src.modules.auth.application.ports.identity_provider import (
    AuthIdentityProvider,
    AuthIdentityProviderError,
)
from src.modules.auth.presentation.http.dependencies import (
    attach_csrf_cookie,
    attach_session_cookie,
    begin_auth_flow,
    build_developer_bypass_access,
    build_developer_bypass_user,
    clear_auth_session,
    clear_csrf_cookie,
    clear_session_cookie,
    consume_auth_flow_state,
    delete_auth_session,
    ensure_csrf_token,
    get_developer_bypass_role,
    get_requested_developer_bypass_role,
    get_session_access,
    get_session_id,
    get_session_user,
    persist_session_user,
    refresh_session_access,
    require_csrf,
    serialize_access_for_response,
    touch_auth_session,
)
from src.modules.clubs.application.ports.club_repository import ClubRepository

router = APIRouter(prefix="/auth", tags=["auth"])

PROXIED_AUTH_REQUEST_HEADER = "x-clubcrm-proxied-auth"
APP_REDIRECT_HEADER = "x-clubcrm-app-redirect"


def mark_app_redirect(response: RedirectResponse) -> None:
    response.headers[APP_REDIRECT_HEADER] = "1"


def build_public_callback_url(request: Request) -> str:
    auth_settings = get_settings().auth
    if request.headers.get(PROXIED_AUTH_REQUEST_HEADER) == "1":
        callback_path = request.app.url_path_for("auth_callback")
        forwarded_proto = request.headers.get("x-forwarded-proto")
        forwarded_host = request.headers.get("x-forwarded-host")

        if isinstance(forwarded_host, str) and forwarded_host:
            callback_scheme = (
                forwarded_proto
                if isinstance(forwarded_proto, str) and forwarded_proto
                else request.url.scheme
            )
            return f"{callback_scheme}://{forwarded_host}{callback_path}"

        callback_url = request.url_for("auth_callback")

        if isinstance(forwarded_proto, str) and forwarded_proto:
            callback_url = callback_url.replace(scheme=forwarded_proto)

        return str(callback_url)

    if auth_settings.public_api_base_url:
        callback_path = request.app.url_path_for("auth_callback")
        return f"{auth_settings.public_api_base_url.rstrip('/')}{callback_path}"

    return str(request.url_for("auth_callback"))


@router.get("/login", name="auth_login")
async def login(
    request: Request,
    authorization_repository: Annotated[
        AuthorizationRepository,
        Depends(get_authorization_repository),
    ],
    club_repository: Annotated[
        ClubRepository,
        Depends(get_club_repository),
    ],
    provider: Annotated[
        AuthIdentityProvider | None,
        Depends(get_optional_auth_identity_provider),
    ],
) -> RedirectResponse:
    auth_settings = get_settings().auth
    requested_bypass_role = (
        get_requested_developer_bypass_role(request) if auth_settings.bypass_enabled else None
    )

    if auth_settings.bypass_enabled and requested_bypass_role is not None:
        current_user = build_developer_bypass_user(requested_bypass_role)
        current_access = build_developer_bypass_access(
            requested_bypass_role,
            authorization_repository=authorization_repository,
            club_repository=club_repository,
        )
        session_id, csrf_token = persist_session_user(request, current_user, current_access)

        response = RedirectResponse(
            url=auth_settings.login_success_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
        mark_app_redirect(response)
        attach_session_cookie(response, session_id)
        attach_csrf_cookie(response, csrf_token)
        return response

    current_user = get_session_user(request)
    if current_user is not None:
        developer_bypass_role = get_developer_bypass_role(current_user)
        if auth_settings.bypass_enabled and developer_bypass_role is not None:
            current_access = build_developer_bypass_access(
                developer_bypass_role,
                authorization_repository=authorization_repository,
                club_repository=club_repository,
            )
        else:
            current_access = (
                ResolveAuthorizedAccess(repository=authorization_repository)
                .execute(current_user)
                .access
            )
        session_id = get_session_id(request)
        if session_id is None:
            session_id, csrf_token = persist_session_user(request, current_user, current_access)
        else:
            refresh_session_access(request)
            csrf_token = ensure_csrf_token(request)
            touch_auth_session(request)

        response = RedirectResponse(
            url=auth_settings.login_success_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
        mark_app_redirect(response)
        attach_session_cookie(response, session_id)
        attach_csrf_cookie(response, csrf_token)
        return response

    if auth_settings.bypass_enabled:
        bypass_role = requested_bypass_role or "org_admin"
        current_user = build_developer_bypass_user(bypass_role)
        current_access = build_developer_bypass_access(
            bypass_role,
            authorization_repository=authorization_repository,
            club_repository=club_repository,
        )
        session_id, csrf_token = persist_session_user(request, current_user, current_access)

        response = RedirectResponse(
            url=auth_settings.login_success_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
        mark_app_redirect(response)
        attach_session_cookie(response, session_id)
        attach_csrf_cookie(response, csrf_token)
        return response

    if not auth_settings.is_auth0_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth0 is not configured for backend login.",
        )
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth identity provider is not configured for backend login.",
        )

    redirect_uri = build_public_callback_url(request)
    session_id, auth_flow_state = begin_auth_flow(request)

    try:
        authorization_url = await StartLogin(provider=provider).execute(
            redirect_uri=redirect_uri,
            state=auth_flow_state,
        )
    except AuthIdentityProviderError as exc:
        delete_auth_session(session_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    response = RedirectResponse(
        url=authorization_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
    attach_session_cookie(response, session_id)
    clear_csrf_cookie(response)
    return response


@router.get("/callback", name="auth_callback")
async def callback(
    request: Request,
    authorization_repository: Annotated[
        AuthorizationRepository,
        Depends(get_authorization_repository),
    ],
    club_repository: Annotated[
        ClubRepository,
        Depends(get_club_repository),
    ],
    provider: Annotated[
        AuthIdentityProvider | None,
        Depends(get_optional_auth_identity_provider),
    ],
) -> RedirectResponse:
    auth_settings = get_settings().auth
    if auth_settings.bypass_enabled:
        bypass_role = get_requested_developer_bypass_role(request) or "org_admin"
        current_user = build_developer_bypass_user(bypass_role)
        current_access = build_developer_bypass_access(
            bypass_role,
            authorization_repository=authorization_repository,
            club_repository=club_repository,
        )
        session_id, csrf_token = persist_session_user(request, current_user, current_access)

        response = RedirectResponse(
            url=auth_settings.login_success_url,
            status_code=status.HTTP_303_SEE_OTHER,
        )
        mark_app_redirect(response)
        attach_session_cookie(response, session_id)
        attach_csrf_cookie(response, csrf_token)
        return response

    if not auth_settings.is_auth0_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth0 is not configured for backend login.",
        )
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth identity provider is not configured for backend login.",
        )

    authorization_code = request.query_params.get("code")
    returned_state = request.query_params.get("state")
    expected_state = consume_auth_flow_state(request)
    if not authorization_code or not returned_state or not expected_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth0 callback did not include the expected authorization data.",
        )

    if returned_state != expected_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth0 callback state validation failed.",
        )

    redirect_uri = build_public_callback_url(request)

    try:
        current_user = await FinalizeAuthSession(provider=provider).execute(
            authorization_code=authorization_code,
            redirect_uri=redirect_uri,
        )
    except AuthIdentityProviderError as exc:
        clear_auth_session(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    clear_auth_session(request)
    current_access = (
        ResolveAuthorizedAccess(repository=authorization_repository).execute(current_user).access
    )
    session_id, csrf_token = persist_session_user(request, current_user, current_access)

    response = RedirectResponse(
        url=auth_settings.login_success_url,
        status_code=status.HTTP_303_SEE_OTHER,
    )
    mark_app_redirect(response)
    attach_session_cookie(response, session_id)
    attach_csrf_cookie(response, csrf_token)
    return response


@router.get("/session", name="auth_session")
def read_session(request: Request) -> JSONResponse:
    current_user = get_session_user(request)
    current_access = (
        refresh_session_access(request) if current_user is not None else get_session_access(request)
    )
    csrf_token = ensure_csrf_token(request) if current_user is not None else None
    response = JSONResponse(
        {
            "authenticated": current_user is not None,
            "authorized": current_access is not None,
            "csrfToken": csrf_token,
            "user": asdict(current_user) if current_user is not None else None,
            "access": serialize_access_for_response(current_access),
        }
    )

    if csrf_token is not None:
        touch_auth_session(request)
        session_id = get_session_id(request)
        if session_id is not None:
            attach_session_cookie(response, session_id)
        attach_csrf_cookie(response, csrf_token)
    else:
        clear_session_cookie(response)
        clear_csrf_cookie(response)

    return response


@router.post(
    "/logout",
    name="auth_logout",
    dependencies=[Depends(require_csrf)],
)
def logout(
    request: Request,
    provider: Annotated[
        AuthIdentityProvider | None,
        Depends(get_optional_auth_identity_provider),
    ],
) -> RedirectResponse:
    auth_settings = get_settings().auth
    clear_auth_session(request)

    redirect_url = auth_settings.logout_redirect_url
    if (
        not auth_settings.bypass_enabled
        and auth_settings.is_auth0_configured()
        and provider is not None
    ):
        redirect_url = provider.build_logout_url(auth_settings.logout_redirect_url)

    response = RedirectResponse(
        url=redirect_url,
        status_code=status.HTTP_303_SEE_OTHER,
    )
    if redirect_url == auth_settings.logout_redirect_url:
        mark_app_redirect(response)
    clear_session_cookie(response)
    clear_csrf_cookie(response)
    return response
