import type { MonitoringSnapshot } from "@/features/monitoring/types";

export type ActiveWebPodTarget = {
  instanceId: string;
  podName: string | null;
  namespace: string | null;
  nodeName: string | null;
};

export type ResolvedDemoFailoverTarget = {
  namespace: string;
  podName: string | null;
  nodeName: string | null;
  vmId: string | null;
};

export function resolveDemoFailoverTarget(
  snapshot: MonitoringSnapshot,
  activeWebPodTarget: ActiveWebPodTarget | null
): ResolvedDemoFailoverTarget {
  const demo = getDemoSnapshot(snapshot);
  const fallbackTarget = demo.failover_target ?? resolveFallbackTarget(snapshot);
  const nodeVmMap =
    Object.keys(demo.node_vm_map).length > 0 ? demo.node_vm_map : buildNodeVmMap(snapshot);
  const normalizedNodeName = activeWebPodTarget?.nodeName?.trim().toLowerCase() ?? null;
  const mappedVmId = normalizedNodeName ? (nodeVmMap[normalizedNodeName] ?? null) : null;

  return {
    namespace: activeWebPodTarget?.namespace ?? fallbackTarget?.namespace ?? "clubcrm",
    podName: activeWebPodTarget?.podName ?? fallbackTarget?.name ?? null,
    nodeName: activeWebPodTarget?.nodeName ?? fallbackTarget?.node_name ?? null,
    vmId: mappedVmId ?? fallbackTarget?.vm_id ?? null,
  };
}

function getDemoSnapshot(snapshot: MonitoringSnapshot) {
  return (
    snapshot.demo ?? {
      failover_target: null,
      node_vm_map: {},
      ready_node_names: [],
      healthy_vm_count: 0,
      running_web_pods: [],
      standby_node_names: [],
    }
  );
}

function resolveFallbackTarget(snapshot: MonitoringSnapshot) {
  const fallbackWebPod =
    snapshot.kubernetes.pods.find(
      (pod) =>
        pod.namespace === "clubcrm" &&
        pod.name.startsWith("clubcrm-web") &&
        pod.status === "Running"
    ) ??
    snapshot.kubernetes.pods.find(
      (pod) => pod.namespace === "clubcrm" && pod.name.startsWith("clubcrm-web")
    ) ??
    null;

  return fallbackWebPod
    ? {
        namespace: fallbackWebPod.namespace,
        name: fallbackWebPod.name,
        status: fallbackWebPod.status,
        node_name: fallbackWebPod.node_name,
        vm_id: resolveVmIdForNode(fallbackWebPod.node_name, snapshot),
      }
    : null;
}

function buildNodeVmMap(snapshot: MonitoringSnapshot) {
  return Object.fromEntries(
    snapshot.vms.map((vm) => [vm.id.trim().toLowerCase(), vm.id])
  ) as Record<string, string>;
}

function resolveVmIdForNode(nodeName: string | null, snapshot: MonitoringSnapshot) {
  if (!nodeName) {
    return null;
  }

  const normalizedNodeName = nodeName.trim().toLowerCase();
  const exactMatch = snapshot.vms.find((vm) => vm.id.trim().toLowerCase() === normalizedNodeName);
  if (exactMatch) {
    return exactMatch.id;
  }

  return `${normalizedNodeName.slice(0, 1).toUpperCase()}${normalizedNodeName.slice(1)}`;
}
