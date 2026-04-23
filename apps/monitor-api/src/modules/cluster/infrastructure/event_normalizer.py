from __future__ import annotations

import time

from src.modules.cluster.domain.models import (
    ClusterEvent,
    NodeDown,
    NodeReady,
    NodeState,
    PodCrashed,
    PodCreated,
    PodDeleted,
    PodMoved,
    PodState,
    PodStatusChanged,
)


def parse_node(raw: dict) -> NodeState:
    metadata = raw.get("metadata") or {}
    status_block = raw.get("status") or {}
    conditions = status_block.get("conditions") or []
    ready_status = "Unknown"
    for condition in conditions:
        if condition.get("type") == "Ready":
            ready_status = "Ready" if condition.get("status") == "True" else "NotReady"
            break

    labels = metadata.get("labels") or {}
    roles: list[str] = []
    for key in labels:
        if key.startswith("node-role.kubernetes.io/"):
            role = key.split("/", 1)[1]
            if role:
                roles.append(role)

    return NodeState(name=metadata.get("name", ""), status=ready_status, roles=sorted(roles))


def parse_pod(raw: dict) -> PodState:
    metadata = raw.get("metadata") or {}
    spec = raw.get("spec") or {}
    status_block = raw.get("status") or {}
    return PodState(
        namespace=metadata.get("namespace", ""),
        name=metadata.get("name", ""),
        status=status_block.get("phase", "Unknown"),
        node_name=spec.get("nodeName"),
        uid=metadata.get("uid"),
    )


def pod_terminated_reason(raw: dict) -> str | None:
    status_block = raw.get("status") or {}
    for container_status in status_block.get("containerStatuses") or []:
        last_state = container_status.get("lastState") or {}
        terminated = last_state.get("terminated") or {}
        reason = terminated.get("reason")
        if reason in {"Error", "OOMKilled", "ContainerCannotRun", "DeadlineExceeded"}:
            return reason

        current_state = container_status.get("state") or {}
        waiting = current_state.get("waiting") or {}
        if waiting.get("reason") == "CrashLoopBackOff":
            return "CrashLoopBackOff"

    return None


def diff_node(previous: NodeState | None, current: NodeState, ts: float) -> list[ClusterEvent]:
    if previous is None:
        if current.status == "Ready":
            return [NodeReady(node=current.name, ts=ts)]
        return [NodeDown(node=current.name, ts=ts)]

    if previous.status == current.status:
        return []

    if current.status == "Ready":
        return [NodeReady(node=current.name, ts=ts)]
    return [NodeDown(node=current.name, ts=ts)]


def diff_pod(
    previous: PodState | None,
    current: PodState,
    raw: dict,
    ts: float,
) -> list[ClusterEvent]:
    events: list[ClusterEvent] = []
    if previous is None:
        events.append(
            PodCreated(
                namespace=current.namespace,
                name=current.name,
                node_name=current.node_name,
                status=current.status,
                ts=ts,
            )
        )
    else:
        if previous.node_name != current.node_name and (
            previous.node_name is not None or current.node_name is not None
        ):
            events.append(
                PodMoved(
                    namespace=current.namespace,
                    name=current.name,
                    from_node=previous.node_name,
                    to_node=current.node_name,
                    ts=ts,
                )
            )
        if previous.status != current.status:
            events.append(
                PodStatusChanged(
                    namespace=current.namespace,
                    name=current.name,
                    node_name=current.node_name,
                    from_status=previous.status,
                    to_status=current.status,
                    ts=ts,
                )
            )

    reason = pod_terminated_reason(raw)
    if reason is not None:
        events.append(
            PodCrashed(
                namespace=current.namespace,
                name=current.name,
                node_name=current.node_name,
                reason=reason,
                ts=ts,
            )
        )

    return events


def pod_deletion_event(previous: PodState, ts: float | None = None) -> PodDeleted:
    return PodDeleted(
        namespace=previous.namespace,
        name=previous.name,
        node_name=previous.node_name,
        ts=ts if ts is not None else time.time(),
    )
