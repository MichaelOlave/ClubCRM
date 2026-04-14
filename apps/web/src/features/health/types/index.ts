export type HealthCheckResult = {
  connected: boolean;
  status: string;
  endpoint: string;
  details: string;
};

export type RedisDiagnosticsMetric = {
  detail: string;
  label: string;
  tone: "default" | "success" | "warning";
  value: string;
};

export type RedisDiagnosticsClubSummary = {
  cacheDetail: string;
  cacheStatus: string;
  clubId: string;
  clubName: string;
  hitRate: string;
  requestCount: string;
  totalAnnouncements: number;
  totalEvents: number;
  totalMembers: number;
};

export type RedisDiagnosticsView = {
  clubSummaries: RedisDiagnosticsClubSummary[];
  description: string;
  metrics: RedisDiagnosticsMetric[];
  title: string;
};

export type RedisDiagnosticsViewModel = {
  experience: RedisDiagnosticsView;
  operations: RedisDiagnosticsView;
};
