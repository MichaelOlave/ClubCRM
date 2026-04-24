import type { HealthCheckResult } from "@/features/health/types";
import { HealthMetaCard } from "@/features/health/components/HealthMetaCard";
import { HealthStatusCard } from "@/features/health/components/HealthStatusCard";

type Props = {
  health: HealthCheckResult;
  refreshHref?: string;
};

export function HealthOverview({ health, refreshHref }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_0.4fr]">
      <HealthStatusCard connected={health.connected} details={health.details} />
      <HealthMetaCard endpoint={health.endpoint} refreshHref={refreshHref} status={health.status} />
    </div>
  );
}
