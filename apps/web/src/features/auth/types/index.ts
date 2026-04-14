export type BackendAuthUser = {
  email: string | null;
  email_verified: boolean;
  name: string | null;
  picture?: string | null;
  sub: string;
};

export type BackendAuthRole = "org_admin" | "club_manager";

export type BackendAuthAccess = {
  primaryRole: BackendAuthRole;
  organizationId: string;
  managedClubIds: string[];
};

export type BackendAuthSession = {
  authenticated: boolean;
  authorized: boolean;
  access: BackendAuthAccess | null;
  csrfToken: string | null;
  user: BackendAuthUser | null;
};

export type AuthorizedBackendAuthSession = BackendAuthSession & {
  authenticated: true;
  authorized: true;
  access: BackendAuthAccess;
  user: BackendAuthUser;
};

export type OrgAdminBackendAuthSession = AuthorizedBackendAuthSession & {
  access: BackendAuthAccess & {
    primaryRole: "org_admin";
  };
};

export type LoginStatus = "authorized" | "not-provisioned" | "signed-out" | "unavailable";

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
