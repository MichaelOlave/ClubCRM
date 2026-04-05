export const env = {
  apiBaseUrl: process.env.API_BASE_URL ?? null,
  authCsrfCookieName: process.env.AUTH_CSRF_COOKIE_NAME ?? "clubcrm_csrf",
  authCsrfHeaderName: process.env.AUTH_CSRF_HEADER_NAME ?? "X-CSRF-Token",
  authSessionCookieName: process.env.AUTH_SESSION_COOKIE_NAME ?? "clubcrm_session",
  webApiPublicBaseUrl: process.env.WEB_API_PUBLIC_BASE_URL ?? null,
} as const;
