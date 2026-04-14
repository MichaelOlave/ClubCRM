export type RuntimeInstance = {
  service: string;
  instanceId: string;
  podName: string | null;
  namespace: string | null;
  nodeName: string | null;
  platform: "kubernetes" | "local";
};

export type HealthCheckResult = {
  connected: boolean;
  status: string;
  endpoint: string;
  details: string;
  apiRuntime: RuntimeInstance | null;
};

export type LiveRoutingSnapshot = {
  checkedAt: string;
  webRuntime: RuntimeInstance;
  api: {
    connected: boolean;
    status: string;
    endpoint: string;
    runtime: RuntimeInstance | null;
  };
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
