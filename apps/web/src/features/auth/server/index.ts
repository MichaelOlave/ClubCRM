import type { LoginViewModel } from "@/features/auth/types";
import { getBackendAuthSession } from "@/features/auth/server/authApi";

export async function getLoginViewModel(): Promise<LoginViewModel> {
  const sessionResult = await getBackendAuthSession();

  if (sessionResult.status === "available" && sessionResult.session.authenticated) {
    return {
      title: "Sign in to ClubCRM",
      description:
        "ClubCRM now starts authentication through the FastAPI backend so the session stays backend-owned from the first redirect.",
      status: "authenticated",
      statusTitle: "Backend session active",
      statusMessage:
        "The web app found an active backend session. You can continue into the admin shell without re-entering the auth flow.",
      endpointLabel: sessionResult.endpoint,
      helperText:
        "The active session came from the backend auth module and is ready for guarded routes.",
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
    helperText: `${sessionResult.details} If your browser reaches the API on a different host port, update WEB_API_PUBLIC_BASE_URL in the repo .env file.`,
    loginHref: "/api/auth/login",
    user: null,
  };
}
