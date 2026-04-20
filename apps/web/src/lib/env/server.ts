function readBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const env = {
  apiBaseUrl: process.env.API_BASE_URL ?? null,
  authCsrfCookieName: process.env.AUTH_CSRF_COOKIE_NAME ?? "clubcrm_csrf",
  authCsrfHeaderName: process.env.AUTH_CSRF_HEADER_NAME ?? "X-CSRF-Token",
  authSessionCookieName: process.env.AUTH_SESSION_COOKIE_NAME ?? "clubcrm_session",
  isAuthBypass: readBooleanEnv(process.env.IS_AUTH_BYPASS, true),
  monitorAdminToken: process.env.MONITOR_ADMIN_TOKEN ?? "monitor-admin-token",
  monitorApiBaseUrl:
    process.env.MONITOR_API_BASE_URL ?? process.env.NEXT_PUBLIC_MONITOR_API_BASE_URL ?? null,
  webApiPublicBaseUrl: process.env.WEB_API_PUBLIC_BASE_URL ?? null,
} as const;
