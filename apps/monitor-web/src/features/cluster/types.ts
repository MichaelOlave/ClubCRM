export type NodeStatus = "Ready" | "NotReady" | "Unknown";
export type PodStatus = "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown" | string;

export interface ClusterNode {
  name: string;
  status: NodeStatus;
  roles: string[];
}

export interface ClusterPod {
  namespace: string;
  name: string;
  status: PodStatus;
  node_name: string | null;
  uid?: string | null;
}

export interface ClusterVolume {
  name: string;
  pvc_namespace: string | null;
  pvc_name: string | null;
  workload_namespace: string | null;
  workload_name: string | null;
  workload_kind: string | null;
  attachment_node: string | null;
  state: string;
  robustness: string;
  health: string;
}

export interface ClusterReplica {
  name: string;
  volume_name: string;
  node_name: string | null;
  mode: string;
  health: string;
}

export interface ClusterSnapshot {
  type: "snapshot";
  ts: number;
  nodes: ClusterNode[];
  pods: ClusterPod[];
  volumes: ClusterVolume[];
  replicas: ClusterReplica[];
}

export type ClusterEventKind =
  | "NODE_READY"
  | "NODE_DOWN"
  | "POD_CREATED"
  | "POD_MOVED"
  | "POD_CRASHED"
  | "POD_DELETED"
  | "POD_STATUS"
  | "VOLUME_ATTACHED"
  | "VOLUME_DETACHED"
  | "VOLUME_REATTACHED"
  | "VOLUME_FAULTED"
  | "VOLUME_HEALTH_CHANGED"
  | "REPLICA_HEALTH_CHANGED"
  | "K8S_WARNING"
  | "CHAOS_STARTED"
  | "CHAOS_ENDED";

export interface NodeReadyEvent {
  kind: "NODE_READY";
  ts: number;
  node: string;
}

export interface NodeDownEvent {
  kind: "NODE_DOWN";
  ts: number;
  node: string;
}

export interface PodCreatedEvent {
  kind: "POD_CREATED";
  ts: number;
  namespace: string;
  name: string;
  node_name: string | null;
  status: string;
}

export interface PodMovedEvent {
  kind: "POD_MOVED";
  ts: number;
  namespace: string;
  name: string;
  from_node: string | null;
  to_node: string | null;
}

export interface PodCrashedEvent {
  kind: "POD_CRASHED";
  ts: number;
  namespace: string;
  name: string;
  node_name: string | null;
  reason: string;
}

export interface PodDeletedEvent {
  kind: "POD_DELETED";
  ts: number;
  namespace: string;
  name: string;
  node_name: string | null;
}

export interface PodStatusEvent {
  kind: "POD_STATUS";
  ts: number;
  namespace: string;
  name: string;
  node_name: string | null;
  from_status: string;
  to_status: string;
}

export interface VolumeAttachedEvent {
  kind: "VOLUME_ATTACHED";
  ts: number;
  volume: string;
  node_name: string | null;
  pvc_namespace: string | null;
  pvc_name: string | null;
  workload_namespace: string | null;
  workload_name: string | null;
}

export interface VolumeDetachedEvent {
  kind: "VOLUME_DETACHED";
  ts: number;
  volume: string;
  from_node: string | null;
  pvc_namespace: string | null;
  pvc_name: string | null;
  workload_namespace: string | null;
  workload_name: string | null;
}

export interface VolumeReattachedEvent {
  kind: "VOLUME_REATTACHED";
  ts: number;
  volume: string;
  from_node: string | null;
  to_node: string | null;
  pvc_namespace: string | null;
  pvc_name: string | null;
  workload_namespace: string | null;
  workload_name: string | null;
}

export interface VolumeFaultedEvent {
  kind: "VOLUME_FAULTED";
  ts: number;
  volume: string;
  node_name: string | null;
  robustness: string;
}

export interface VolumeHealthChangedEvent {
  kind: "VOLUME_HEALTH_CHANGED";
  ts: number;
  volume: string;
  node_name: string | null;
  from_health: string;
  to_health: string;
}

export interface ReplicaHealthChangedEvent {
  kind: "REPLICA_HEALTH_CHANGED";
  ts: number;
  volume: string;
  replica: string;
  node_name: string | null;
  from_health: string;
  to_health: string;
}

export interface K8sWarningEvent {
  kind: "K8S_WARNING";
  ts: number;
  involved_object_kind: string;
  involved_object_namespace: string | null;
  involved_object_name: string;
  reason: string;
  message: string;
}

export interface ChaosStartedEvent {
  kind: "CHAOS_STARTED";
  ts: number;
  experiment_kind: string;
  name: string;
  namespace: string;
}

export interface ChaosEndedEvent {
  kind: "CHAOS_ENDED";
  ts: number;
  experiment_kind: string;
  name: string;
  namespace: string;
}

export type ClusterEvent =
  | NodeReadyEvent
  | NodeDownEvent
  | PodCreatedEvent
  | PodMovedEvent
  | PodCrashedEvent
  | PodDeletedEvent
  | PodStatusEvent
  | VolumeAttachedEvent
  | VolumeDetachedEvent
  | VolumeReattachedEvent
  | VolumeFaultedEvent
  | VolumeHealthChangedEvent
  | ReplicaHealthChangedEvent
  | K8sWarningEvent
  | ChaosStartedEvent
  | ChaosEndedEvent;

export type WsFrame = ClusterSnapshot | { type: "event"; ts: number; event: ClusterEvent };

export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline";
