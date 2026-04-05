export type ProfileField = {
  label: string;
  value: string;
  helperText: string;
  isCode?: boolean;
};

export type ProfileCheckStatus = "pass" | "warn" | "fail" | "info";

export type ProfileCheck = {
  label: string;
  value: string;
  description: string;
  status: ProfileCheckStatus;
};

export type ProfileBadge = {
  label: string;
  tone: "success" | "warning" | "secondary";
};

export type ProfileSummary = {
  email: string;
  initials: string;
  name: string;
  subtitle: string;
  badges: ProfileBadge[];
};

export type ProfileViewModel = {
  debugSnapshot: string;
  personalFields: ProfileField[];
  requestFields: ProfileField[];
  sessionChecks: ProfileCheck[];
  summary: ProfileSummary;
};
