export type ServiceHistoryPoint = {
  checked_at: string;
  available: boolean;
  latency_ms: number | null;
  status_code: number | null;
  error: string | null;
};

export type MonitoringService = {
  target_url: string;
  status: "up" | "down";
  uptime_percentage: number;
  history: ServiceHistoryPoint[];
  latest: ServiceHistoryPoint | null;
};

export type MonitoringContainer = {
  name: string;
  status: string;
  image: string | null;
};

export type MonitoringVm = {
  id: string;
  power_state: string;
  agent_status: "online" | "offline" | "stale";
  cpu_percent: number;
  memory_percent: number;
  last_seen_at: string | null;
  last_monotonic_time: number | null;
  containers: MonitoringContainer[];
  pending_commands: number;
};

export type MonitoringKubernetesNode = {
  name: string;
  status: string;
};

export type MonitoringKubernetesPod = {
  namespace: string;
  name: string;
  status: string;
  node_name: string | null;
};

export type MonitoringKubernetesStorageClass = {
  name: string;
  provisioner: string;
  is_default: boolean;
  volume_binding_mode: string | null;
  reclaim_policy: string | null;
};

export type MonitoringKubernetesPvc = {
  namespace: string;
  name: string;
  status: string;
  storage_class_name: string | null;
  requested_storage: string | null;
  volume_name: string | null;
  volume_status: string | null;
};

export type MonitoringLonghornVolume = {
  namespace: string;
  name: string;
  state: string;
  robustness: string;
  size: string | null;
  node_id: string | null;
  ready: boolean;
};

export type MonitoringEvent = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  message: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type MonitoringSnapshot = {
  service: MonitoringService;
  vms: MonitoringVm[];
  containers: Record<string, MonitoringContainer[]>;
  kubernetes: {
    connected: boolean;
    source: string;
    last_updated_at: string | null;
    nodes: MonitoringKubernetesNode[];
    pods: MonitoringKubernetesPod[];
    storage_classes: MonitoringKubernetesStorageClass[];
    pvcs: MonitoringKubernetesPvc[];
    longhorn_volumes: MonitoringLonghornVolume[];
  };
  events: MonitoringEvent[];
  generated_at: string;
};
