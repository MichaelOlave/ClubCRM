import type { LoginViewModel } from "@/features/auth/types";

export async function getLoginViewModel(): Promise<LoginViewModel> {
  return {
    title: "Sign in to ClubCRM",
    description:
      "Organization admins and club managers will authenticate here once the API auth slice is connected.",
    helperText:
      "This screen is intentionally UI-first for now. The route group and shared form primitives are ready for the real auth workflow.",
  };
}
