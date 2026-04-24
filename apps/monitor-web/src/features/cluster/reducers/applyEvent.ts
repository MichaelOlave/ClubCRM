import type {
  ClusterEvent,
  ClusterNode,
  ClusterPod,
  ClusterReplica,
  ClusterSnapshot,
  ServiceProbe,
  ClusterVolume,
} from "@/features/cluster/types";

export interface ClusterStateShape {
  ts: number;
  nodes: ClusterNode[];
  pods: ClusterPod[];
  volumes: ClusterVolume[];
  replicas: ClusterReplica[];
  probes: ServiceProbe[];
}

export function snapshotToState(snapshot: ClusterSnapshot): ClusterStateShape {
  return {
    ts: snapshot.ts,
    nodes: snapshot.nodes,
    pods: snapshot.pods,
    volumes: snapshot.volumes,
    replicas: snapshot.replicas,
    probes: snapshot.probes,
  };
}

export function applyEvent(state: ClusterStateShape, event: ClusterEvent): ClusterStateShape {
  switch (event.kind) {
    case "NODE_READY":
      return upsertNode(state, event.node, "Ready", event.ts);
    case "NODE_DOWN":
      return upsertNode(state, event.node, "NotReady", event.ts);
    case "POD_CREATED": {
      const pod: ClusterPod = {
        namespace: event.namespace,
        name: event.name,
        status: event.status,
        node_name: event.node_name,
      };
      return { ...state, ts: event.ts, pods: upsertPod(state.pods, pod) };
    }
    case "POD_MOVED":
      return {
        ...state,
        ts: event.ts,
        pods: state.pods.map((pod) =>
          pod.namespace === event.namespace && pod.name === event.name
            ? { ...pod, node_name: event.to_node }
            : pod
        ),
      };
    case "POD_STATUS":
      return {
        ...state,
        ts: event.ts,
        pods: state.pods.map((pod) =>
          pod.namespace === event.namespace && pod.name === event.name
            ? { ...pod, status: event.to_status }
            : pod
        ),
      };
    case "POD_CRASHED":
      return { ...state, ts: event.ts };
    case "POD_DELETED":
      return {
        ...state,
        ts: event.ts,
        pods: state.pods.filter(
          (pod) => !(pod.namespace === event.namespace && pod.name === event.name)
        ),
      };
    case "VOLUME_ATTACHED":
      return {
        ...state,
        ts: event.ts,
        volumes: upsertVolume(state.volumes, {
          name: event.volume,
          pvc_namespace: event.pvc_namespace,
          pvc_name: event.pvc_name,
          workload_namespace: event.workload_namespace,
          workload_name: event.workload_name,
          workload_kind: null,
          attachment_node: event.node_name,
          state: "attached",
          robustness: "healthy",
          health: "healthy",
        }),
      };
    case "VOLUME_DETACHED":
      return {
        ...state,
        ts: event.ts,
        volumes: state.volumes.map((volume) =>
          volume.name === event.volume
            ? { ...volume, attachment_node: null, state: "detached" }
            : volume
        ),
      };
    case "VOLUME_REATTACHED":
      return {
        ...state,
        ts: event.ts,
        volumes: state.volumes.map((volume) =>
          volume.name === event.volume
            ? {
                ...volume,
                attachment_node: event.to_node,
                state: "attached",
              }
            : volume
        ),
      };
    case "VOLUME_FAULTED":
      return {
        ...state,
        ts: event.ts,
        volumes: state.volumes.map((volume) =>
          volume.name === event.volume
            ? {
                ...volume,
                attachment_node: event.node_name,
                robustness: event.robustness,
                health: "faulted",
              }
            : volume
        ),
      };
    case "VOLUME_HEALTH_CHANGED":
      return {
        ...state,
        ts: event.ts,
        volumes: state.volumes.map((volume) =>
          volume.name === event.volume
            ? {
                ...volume,
                attachment_node: event.node_name,
                health: event.to_health,
              }
            : volume
        ),
      };
    case "REPLICA_HEALTH_CHANGED":
      return {
        ...state,
        ts: event.ts,
        replicas: upsertReplica(state.replicas, {
          name: event.replica,
          volume_name: event.volume,
          node_name: event.node_name,
          mode: "RW",
          health: event.to_health,
        }),
      };
    case "PROBE_OK":
      return {
        ...state,
        ts: event.ts,
        probes: upsertProbe(state.probes, {
          service: event.service,
          url: event.url,
          status: "ok",
          last_checked_at: event.ts,
          last_transition_at: event.ts,
          last_latency_ms: event.latency_ms,
          last_status_code: event.status_code,
          last_error: null,
        }),
      };
    case "PROBE_DEGRADED":
      return {
        ...state,
        ts: event.ts,
        probes: upsertProbe(state.probes, {
          service: event.service,
          url: event.url,
          status: "degraded",
          last_checked_at: event.ts,
          last_transition_at: event.ts,
          last_latency_ms: event.latency_ms,
          last_status_code: event.status_code,
          last_error: event.reason,
        }),
      };
    case "PROBE_FAILED":
      return {
        ...state,
        ts: event.ts,
        probes: upsertProbe(state.probes, {
          service: event.service,
          url: event.url,
          status: "failed",
          last_checked_at: event.ts,
          last_transition_at: event.ts,
          last_latency_ms: null,
          last_status_code: null,
          last_error: event.error,
        }),
      };
    case "K8S_WARNING":
    case "CHAOS_STARTED":
    case "CHAOS_ENDED":
      return { ...state, ts: event.ts };
    default:
      return state;
  }
}

function upsertNode(
  state: ClusterStateShape,
  name: string,
  status: ClusterNode["status"],
  ts: number
): ClusterStateShape {
  const existing = state.nodes.find((n) => n.name === name);
  if (existing) {
    return {
      ...state,
      ts,
      nodes: state.nodes.map((n) => (n.name === name ? { ...n, status } : n)),
    };
  }
  return {
    ...state,
    ts,
    nodes: [...state.nodes, { name, status, roles: [] }],
  };
}

function upsertPod(pods: ClusterPod[], pod: ClusterPod): ClusterPod[] {
  const index = pods.findIndex(
    (existing) => existing.namespace === pod.namespace && existing.name === pod.name
  );
  if (index === -1) {
    return [...pods, pod];
  }
  const next = pods.slice();
  next[index] = { ...next[index], ...pod };
  return next;
}

function upsertVolume(volumes: ClusterVolume[], volume: ClusterVolume): ClusterVolume[] {
  const index = volumes.findIndex((existing) => existing.name === volume.name);
  if (index === -1) {
    return [...volumes, volume];
  }
  const next = volumes.slice();
  next[index] = { ...next[index], ...volume };
  return next;
}

function upsertReplica(replicas: ClusterReplica[], replica: ClusterReplica): ClusterReplica[] {
  const index = replicas.findIndex((existing) => existing.name === replica.name);
  if (index === -1) {
    return [...replicas, replica];
  }
  const next = replicas.slice();
  next[index] = { ...next[index], ...replica };
  return next;
}

function upsertProbe(probes: ServiceProbe[], probe: ServiceProbe): ServiceProbe[] {
  const index = probes.findIndex((existing) => existing.service === probe.service);
  if (index === -1) {
    return [...probes, probe];
  }
  const next = probes.slice();
  next[index] = { ...next[index], ...probe };
  return next;
}
