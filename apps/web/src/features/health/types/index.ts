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
