import { cookies, headers } from "next/headers";

import { getBackendAuthSession, getBackendLoginUrl } from "@/features/auth/server/authApi";
import type { BackendAuthUser } from "@/features/auth/types";
import type {
  ProfileBadge,
  ProfileCheck,
  ProfileField,
  ProfileSummary,
  ProfileViewModel,
} from "@/features/profile/types";
import { getInternalApiBaseUrls, getPublicApiBaseUrl } from "@/lib/api/server";
import { env } from "@/lib/env/server";

function getDisplayName(user: BackendAuthUser | null): string {
  if (user?.name) {
    return user.name;
  }

  if (user?.email) {
    return user.email;
  }

  return "Signed-in user";
}

function getInitials(user: BackendAuthUser | null): string {
  const seed = user?.name?.trim() || user?.email?.trim() || user?.sub || "ClubCRM User";
  const tokens = seed.split(/[\s@._-]+/).filter(Boolean);
  const initials = tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "CU";
}

function maskValue(value: string | null | undefined): string {
  if (!value) {
    return "Not present";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)} (${value.length} chars)`;
}

function buildSummary(user: BackendAuthUser | null): ProfileSummary {
  const badges: ProfileBadge[] = [
    {
      label: "Authenticated session",
      tone: "success",
    },
    user?.email_verified
      ? {
          label: "Email verified",
          tone: "success",
        }
      : {
          label: "Email unverified",
          tone: "warning",
        },
    user?.picture
      ? {
          label: "Picture stored",
          tone: "secondary",
        }
      : {
          label: "No picture stored",
          tone: "warning",
        },
  ];

  return {
    name: getDisplayName(user),
    email: user?.email ?? "No email returned by the provider",
    initials: getInitials(user),
    subtitle:
      "The current MVP stores user-facing identity data in the backend auth session. This page shows that stored payload and the web request context used to validate it.",
    badges,
  };
}

function buildPersonalFields(user: BackendAuthUser | null): ProfileField[] {
  return [
    {
      label: "Subject",
      value: user?.sub ?? "Unavailable",
      helperText: "Stable identity identifier currently stored in the backend auth session.",
      isCode: true,
    },
    {
      label: "Full name",
      value: user?.name ?? "Not provided",
      helperText: "Display name returned by the identity provider for this session.",
    },
    {
      label: "Email address",
      value: user?.email ?? "Not provided",
      helperText: "Email value currently attached to this signed-in session.",
    },
    {
      label: "Email verified",
      value: user ? (user.email_verified ? "Yes" : "No") : "Unknown",
      helperText: "Boolean flag provided by the backend auth payload.",
    },
    {
      label: "Picture URL",
      value: user?.picture ?? "Not provided",
      helperText: "Optional profile image URL if the auth provider supplied one.",
      isCode: Boolean(user?.picture),
    },
  ];
}

function buildSessionChecks({
  csrfCookie,
  csrfToken,
  requestSessionCookie,
  sessionEndpoint,
}: {
  csrfCookie: string | null;
  csrfToken: string | null;
  requestSessionCookie: string | null;
  sessionEndpoint: string;
}): ProfileCheck[] {
  const csrfComparison =
    !csrfCookie || !csrfToken ? "Not comparable" : csrfCookie === csrfToken ? "Match" : "Mismatch";

  return [
    {
      label: "Protected app access",
      value: "Passed",
      description:
        "This route rendered inside the authenticated admin shell, so the backend session gate already succeeded for the request.",
      status: "pass",
    },
    {
      label: "Backend session endpoint",
      value: "Reachable",
      description: `The web app loaded auth data from ${sessionEndpoint}.`,
      status: "pass",
    },
    {
      label: "HTTP-only session cookie",
      value: requestSessionCookie ? "Present" : "Missing",
      description: `Checked ${env.authSessionCookieName} on the incoming web request.`,
      status: requestSessionCookie ? "pass" : "fail",
    },
    {
      label: "Readable CSRF cookie",
      value: csrfCookie ? "Present" : "Missing",
      description: `Checked ${env.authCsrfCookieName} on the incoming web request.`,
      status: csrfCookie ? "pass" : "warn",
    },
    {
      label: "API CSRF token",
      value: csrfToken ? "Issued" : "Missing",
      description:
        "The backend session route should return a CSRF token for protected actions such as logout.",
      status: csrfToken ? "pass" : "warn",
    },
    {
      label: "CSRF cookie alignment",
      value: csrfComparison,
      description:
        csrfComparison === "Match"
          ? "The browser-facing CSRF cookie matches the token returned by /auth/session."
          : csrfComparison === "Mismatch"
            ? "The readable CSRF cookie does not match the backend session token."
            : "A comparison requires both the readable CSRF cookie and the API session token.",
      status: csrfComparison === "Match" ? "pass" : csrfComparison === "Mismatch" ? "fail" : "info",
    },
  ];
}

function buildRequestFields({
  csrfCookie,
  renderedAt,
  requestHeaders,
  requestSessionCookie,
  sessionEndpoint,
}: {
  csrfCookie: string | null;
  renderedAt: string;
  requestHeaders: Headers;
  requestSessionCookie: string | null;
  sessionEndpoint: string;
}): ProfileField[] {
  return [
    {
      label: "Rendered at",
      value: renderedAt,
      helperText: "Server-render timestamp for this exact profile request.",
      isCode: true,
    },
    {
      label: "Session endpoint",
      value: sessionEndpoint,
      helperText: "Internal API endpoint that successfully returned the auth session payload.",
      isCode: true,
    },
    {
      label: "Login handoff URL",
      value: getBackendLoginUrl(),
      helperText: "Browser-facing backend entrypoint for starting the auth flow.",
      isCode: true,
    },
    {
      label: "Public API base URL",
      value: getPublicApiBaseUrl(),
      helperText: "Origin used for browser redirects and auth handoff links.",
      isCode: true,
    },
    {
      label: "Internal API targets",
      value: getInternalApiBaseUrls().join("\n"),
      helperText: "Fallback order the web server uses when contacting the backend session route.",
      isCode: true,
    },
    {
      label: "Session cookie name",
      value: `${env.authSessionCookieName} -> ${maskValue(requestSessionCookie)}`,
      helperText: "HTTP-only backend session cookie as seen by the server render.",
      isCode: true,
    },
    {
      label: "CSRF cookie name",
      value: `${env.authCsrfCookieName} -> ${maskValue(csrfCookie)}`,
      helperText: "Readable CSRF cookie used for protected form or action requests.",
      isCode: true,
    },
    {
      label: "CSRF header name",
      value: env.authCsrfHeaderName,
      helperText: "Header the frontend must send alongside the CSRF cookie for protected writes.",
      isCode: true,
    },
    {
      label: "Request host",
      value: requestHeaders.get("host") ?? "Unavailable",
      helperText: "Host header attached to the incoming request reaching the web app.",
      isCode: true,
    },
    {
      label: "Forwarded proto",
      value: requestHeaders.get("x-forwarded-proto") ?? "Unavailable",
      helperText: "Useful when validating redirect behavior behind container or proxy boundaries.",
      isCode: true,
    },
  ];
}

export async function getProfileViewModel(): Promise<ProfileViewModel> {
  const sessionResult = await getBackendAuthSession();
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const renderedAt = new Date().toISOString();

  const requestSessionCookie = cookieStore.get(env.authSessionCookieName)?.value ?? null;
  const csrfCookie = cookieStore.get(env.authCsrfCookieName)?.value ?? null;
  const session =
    sessionResult.status === "available"
      ? sessionResult.session
      : {
          authenticated: false,
          csrfToken: null,
          user: null,
        };

  const sessionEndpoint = sessionResult.endpoint;

  return {
    summary: buildSummary(session.user),
    personalFields: buildPersonalFields(session.user),
    sessionChecks: buildSessionChecks({
      csrfCookie,
      csrfToken: session.csrfToken,
      requestSessionCookie,
      sessionEndpoint,
    }),
    requestFields: buildRequestFields({
      csrfCookie,
      renderedAt,
      requestHeaders,
      requestSessionCookie,
      sessionEndpoint,
    }),
    debugSnapshot: JSON.stringify(
      {
        renderedAt,
        sessionEndpoint,
        loginUrl: getBackendLoginUrl(),
        publicApiBaseUrl: getPublicApiBaseUrl(),
        internalApiTargets: getInternalApiBaseUrls(),
        authenticated: session.authenticated,
        user: session.user,
        csrfTokenPreview: maskValue(session.csrfToken),
        cookies: {
          session: {
            name: env.authSessionCookieName,
            present: Boolean(requestSessionCookie),
            preview: maskValue(requestSessionCookie),
          },
          csrf: {
            name: env.authCsrfCookieName,
            present: Boolean(csrfCookie),
            preview: maskValue(csrfCookie),
            matchesSessionToken:
              csrfCookie && session.csrfToken ? csrfCookie === session.csrfToken : null,
          },
        },
        request: {
          host: requestHeaders.get("host"),
          forwardedHost: requestHeaders.get("x-forwarded-host"),
          forwardedProto: requestHeaders.get("x-forwarded-proto"),
        },
      },
      null,
      2
    ),
  };
}
