from __future__ import annotations

from collections.abc import Iterable

from src.modules.monitoring.domain.models import (
    KubernetesNodeSnapshot,
    KubernetesPodSnapshot,
    VmSnapshot,
)

_CLUBCRM_NAMESPACE = "clubcrm"
_CLUBCRM_WEB_PREFIX = "clubcrm-web"


def serialize_demo_snapshot(
    *,
    nodes: Iterable[KubernetesNodeSnapshot],
    pods: Iterable[KubernetesPodSnapshot],
    vms: Iterable[VmSnapshot],
) -> dict:
    pod_list = list(pods)
    node_list = list(nodes)
    vm_list = list(vms)
    running_web_pods = _collect_running_web_pods(pod_list, vm_list)
    failover_target = running_web_pods[0] if running_web_pods else None
    ready_node_names = [node.name for node in node_list if node.status == "Ready"]
    healthy_vm_count = sum(
        1
        for vm in vm_list
        if vm.power_state == "running" and vm.last_seen_at is not None
    )
    active_node_name = failover_target["node_name"].lower() if failover_target else None
    standby_node_names = [
        node_name
        for node_name in _unique_node_names(running_web_pods)
        if node_name.lower() != active_node_name
    ]

    return {
        "failover_target": failover_target,
        "node_vm_map": {
            node_name.lower(): vm_id for node_name, vm_id in _build_node_vm_map(vm_list).items()
        },
        "ready_node_names": ready_node_names,
        "healthy_vm_count": healthy_vm_count,
        "running_web_pods": running_web_pods,
        "standby_node_names": standby_node_names,
    }


def _collect_running_web_pods(
    pods: list[KubernetesPodSnapshot], vms: list[VmSnapshot]
) -> list[dict[str, str | None]]:
    running_web_pods = [
        _serialize_web_pod(pod, vms)
        for pod in pods
        if _is_clubcrm_web_pod(pod) and pod.status == "Running"
    ]
    if running_web_pods:
        return running_web_pods

    return [_serialize_web_pod(pod, vms) for pod in pods if _is_clubcrm_web_pod(pod)]


def _serialize_web_pod(
    pod: KubernetesPodSnapshot, vms: list[VmSnapshot]
) -> dict[str, str | None]:
    return {
        "namespace": pod.namespace,
        "name": pod.name,
        "status": pod.status,
        "node_name": pod.node_name,
        "vm_id": _resolve_vm_id_for_node(pod.node_name, vms),
    }


def _is_clubcrm_web_pod(pod: KubernetesPodSnapshot) -> bool:
    return pod.namespace == _CLUBCRM_NAMESPACE and pod.name.startswith(_CLUBCRM_WEB_PREFIX)


def _build_node_vm_map(vms: list[VmSnapshot]) -> dict[str, str]:
    return {vm.id: vm.id for vm in vms}


def _resolve_vm_id_for_node(node_name: str | None, vms: list[VmSnapshot]) -> str | None:
    if not node_name:
        return None

    exact_match = next((vm for vm in vms if vm.id == node_name), None)
    if exact_match:
        return exact_match.id

    normalized_node_name = node_name.strip().lower()
    case_insensitive_match = next(
        (vm for vm in vms if vm.id.strip().lower() == normalized_node_name),
        None,
    )
    if case_insensitive_match:
        return case_insensitive_match.id

    if not normalized_node_name:
        return None

    return f"{normalized_node_name[:1].upper()}{normalized_node_name[1:]}"


def _unique_node_names(pods: list[dict[str, str | None]]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for pod in pods:
        node_name = pod["node_name"]
        if not node_name or node_name in seen:
            continue

        seen.add(node_name)
        ordered.append(node_name)

    return ordered
