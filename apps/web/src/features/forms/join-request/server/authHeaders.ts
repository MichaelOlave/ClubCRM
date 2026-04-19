import { getAdminApiHeaders } from "@/lib/api/adminAuthHeaders";

type Options = {
  includeCsrf?: boolean;
  originPath?: string;
};

export async function getJoinRequestApiAuthHeaders({
  includeCsrf = false,
  originPath,
}: Options = {}): Promise<Headers> {
  return getAdminApiHeaders({ includeCsrf, originPath });
}
