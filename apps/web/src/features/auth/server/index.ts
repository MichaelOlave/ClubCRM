import { redirect } from "next/navigation";

import type {
  AuthorizedBackendAuthSession,
  BackendAuthSession,
  BackendAuthUser,
  LoginViewModel,
  OrgAdminBackendAuthSession,
} from "@/features/auth/types";
import { getBackendAuthSession } from "@/features/auth/server/authApi";

export function isAuthenticatedBackendAuthSession(
  session: BackendAuthSession
): session is BackendAuthSession & {
  authenticated: true;
  user: BackendAuthUser;
} {
  return session.authenticated && session.user !== null;
}

export function isAuthorizedBackendAuthSession(
  session: BackendAuthSession
): session is AuthorizedBackendAuthSession {
  return (
    session.authenticated && session.authorized && session.user !== null && session.access !== null
  );
}

export function isOrgAdminBackendAuthSession(
  session: AuthorizedBackendAuthSession
): session is OrgAdminBackendAuthSession {
  return session.access.primaryRole === "org_admin";
}

export function canAccessClub(session: AuthorizedBackendAuthSession, clubId: string): boolean {
  return (
    session.access.primaryRole === "org_admin" || session.access.managedClubIds.includes(clubId)
  );
}

export async function requireAuthorizedBackendSession(): Promise<AuthorizedBackendAuthSession> {
  const sessionResult = await getBackendAuthSession();

  if (sessionResult.status !== "available") {
    redirect("/login");
  }

  if (!isAuthorizedBackendAuthSession(sessionResult.session)) {
    redirect(
      isAuthenticatedBackendAuthSession(sessionResult.session) ? "/not-provisioned" : "/login"
    );
  }

  return sessionResult.session;
}

export async function requireOrgAdminBackendSession(
  redirectPath = "/dashboard"
): Promise<OrgAdminBackendAuthSession> {
  const session = await requireAuthorizedBackendSession();

  if (!isOrgAdminBackendAuthSession(session)) {
    redirect(redirectPath);
  }

  return session;
}

export async function getLoginViewModel(): Promise<LoginViewModel> {
  const sessionResult = await getBackendAuthSession();

  if (
    sessionResult.status === "available" &&
    isAuthorizedBackendAuthSession(sessionResult.session)
  ) {
    return {
      title: "Sign in to ClubCRM",
      description:
        "ClubCRM now starts authentication through the FastAPI backend so the session stays backend-owned from the first redirect.",
      status: "authorized",
      statusTitle: "ClubCRM access ready",
      statusMessage:
        "The web app found an active backend session with ClubCRM access. You can continue into the protected app without re-entering the auth flow.",
      endpointLabel: sessionResult.endpoint,
      helperText:
        "The active session came from the backend auth module and already includes the app authorization context for your provisioned role.",
      loginHref: "/api/auth/login",
      user: sessionResult.session.user,
    };
  }

  if (sessionResult.status === "available" && sessionResult.session.authenticated) {
    return {
      title: "Sign in to ClubCRM",
      description:
        "ClubCRM now starts authentication through the FastAPI backend so the session stays backend-owned from the first redirect.",
      status: "not-provisioned",
      statusTitle: "Signed in, but not provisioned",
      statusMessage:
        "The backend recognized your identity provider session, but this account does not currently have ClubCRM app access. Ask an organization admin to grant org-admin or club-manager access.",
      endpointLabel: sessionResult.endpoint,
      helperText:
        "Your browser has a valid backend session, but the API marked it as authenticated without an app authorization grant.",
      loginHref: "/api/auth/login",
      user: sessionResult.session.user,
    };
  }

  if (sessionResult.status === "available") {
    return {
      title: "Sign in to ClubCRM",
      description:
        "ClubCRM now starts authentication through the FastAPI backend so the session stays backend-owned from the first redirect.",
      status: "signed-out",
      statusTitle: "No backend session yet",
      statusMessage:
        "Use the button below to hand off to the backend auth flow. The API will create the session and redirect you back into the web app.",
      endpointLabel: sessionResult.endpoint,
      helperText:
        "The web app confirmed that no authenticated backend session is currently attached to this browser request.",
      loginHref: "/api/auth/login",
      user: null,
    };
  }

  return {
    title: "Sign in to ClubCRM",
    description:
      "ClubCRM now starts authentication through the FastAPI backend so the session stays backend-owned from the first redirect.",
    status: "unavailable",
    statusTitle: "Backend auth is unavailable",
    statusMessage:
      "The login handoff is wired, but the web app could not reach the backend session endpoint to confirm the current auth state.",
    endpointLabel: sessionResult.endpoint,
    helperText: `${sessionResult.details} If the web server cannot reach the API on its default target, update API_BASE_URL in the repo .env file. If your browser reaches the API on a remapped host port, keep WEB_API_PUBLIC_BASE_URL aligned with that origin.`,
    loginHref: "/api/auth/login",
    user: null,
  };
}
