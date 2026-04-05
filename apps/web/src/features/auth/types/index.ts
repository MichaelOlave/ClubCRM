export type BackendAuthUser = {
  email: string | null;
  email_verified: boolean;
  name: string | null;
  picture?: string | null;
  sub: string;
};

export type BackendAuthSession = {
  authenticated: boolean;
  csrfToken: string | null;
  user: BackendAuthUser | null;
};

export type LoginStatus = "authenticated" | "signed-out" | "unavailable";

export type LoginViewModel = {
  description: string;
  endpointLabel: string;
  helperText: string;
  loginHref: string;
  status: LoginStatus;
  statusMessage: string;
  statusTitle: string;
  title: string;
  user: BackendAuthUser | null;
};
