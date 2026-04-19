from __future__ import annotations

import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request, WebSocket
from pydantic import BaseModel, Field
from src.bootstrap.dependencies import (
    get_kubernetes_adapter,
    get_monitoring_state,
    get_orbstack_adapter,
    get_websocket_hub,
    require_admin_token,
    require_agent_token,
)
from src.modules.monitoring.application.services import WebSocketHub
from src.modules.monitoring.application.state import MonitoringState
from src.modules.monitoring.domain.models import (
    AgentCommandResult,
    ContainerSnapshot,
)
from src.modules.monitoring.infrastructure.kubernetes import KubernetesCommandAdapter
from src.modules.monitoring.infrastructure.orbstack import OrbStackSSHAdapter

router = APIRouter(tags=["monitoring"])

MonitoringStateDep = Annotated[MonitoringState, Depends(get_monitoring_state)]
OrbStackAdapterDep = Annotated[OrbStackSSHAdapter, Depends(get_orbstack_adapter)]
KubernetesAdapterDep = Annotated[KubernetesCommandAdapter, Depends(get_kubernetes_adapter)]
WebSocketHubDep = Annotated[WebSocketHub, Depends(get_websocket_hub)]


class HeartbeatContainerPayload(BaseModel):
    name: str
    status: str
    image: str | None = None


class HeartbeatCommandResultPayload(BaseModel):
    command_id: str
    kind: str
    action: str
    target: str
    success: bool
    details: str | None = None


class HeartbeatPayload(BaseModel):
    cpu_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    memory_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    monotonic_time: float | None = None
    containers: list[HeartbeatContainerPayload] = Field(default_factory=list)
    command_results: list[HeartbeatCommandResultPayload] = Field(default_factory=list)


class HeartbeatResponse(BaseModel):
    commands: list[dict]


class VmPowerRequest(BaseModel):
    action: Literal["start", "stop", "restart"]


class ContainerControlRequest(BaseModel):
    action: Literal["start", "stop", "restart"]


class KubernetesRecycleRequest(BaseModel):
    action: Literal["recycle"] = "recycle"


@router.get("/api/snapshot")
async def get_snapshot(state: MonitoringStateDep) -> dict:
    return await state.snapshot()


@router.post("/api/agents/{vm_id}/heartbeat", response_model=HeartbeatResponse)
async def receive_heartbeat(
    vm_id: str,
    payload: HeartbeatPayload,
    request: Request,
    state: MonitoringStateDep,
) -> HeartbeatResponse:
    require_agent_token(request, vm_id)
    commands = await state.record_heartbeat(
        vm_id=vm_id,
        cpu_percent=payload.cpu_percent,
        memory_percent=payload.memory_percent,
        monotonic_time=payload.monotonic_time,
        containers=[
            ContainerSnapshot(name=item.name, status=item.status, image=item.image)
            for item in payload.containers
        ],
        command_results=[
            AgentCommandResult(
                command_id=result.command_id,
                kind=result.kind,
                action=result.action,
                target=result.target,
                success=result.success,
                details=result.details,
            )
            for result in payload.command_results
        ],
    )
    return HeartbeatResponse(commands=commands)


@router.post("/api/control/vms/{vm_id}/power")
async def control_vm_power(
    vm_id: str,
    payload: VmPowerRequest,
    request: Request,
    state: MonitoringStateDep,
    orbstack_adapter: OrbStackAdapterDep,
) -> dict:
    require_admin_token(request)
    result = await asyncio.to_thread(orbstack_adapter.power_action, vm_id, payload.action)
    await state.record_vm_power_action(
        vm_id=result.vm_id,
        action=payload.action,
        power_state=result.power_state,
    )
    return {
        "vm_id": result.vm_id,
        "action": payload.action,
        "power_state": result.power_state,
        "details": result.details,
    }


@router.post("/api/control/containers/{vm_id}/{container_name}")
async def control_container(
    vm_id: str,
    container_name: str,
    payload: ContainerControlRequest,
    request: Request,
    state: MonitoringStateDep,
) -> dict:
    require_admin_token(request)
    command = await state.queue_container_action(vm_id, container_name, payload.action)
    return {
        "vm_id": vm_id,
        "container_name": container_name,
        "queued": True,
        "command": command,
    }


@router.post("/api/control/k8s/pods/{namespace}/{pod_name}/recycle")
async def recycle_pod(
    namespace: str,
    pod_name: str,
    payload: KubernetesRecycleRequest,
    request: Request,
    state: MonitoringStateDep,
    kubernetes_adapter: KubernetesAdapterDep,
) -> dict:
    require_admin_token(request)
    details = await asyncio.to_thread(kubernetes_adapter.recycle_pod, namespace, pod_name)
    await state.record_kubernetes_control(
        namespace=namespace,
        pod_name=pod_name,
        action=payload.action,
        success=True,
        details=details,
    )
    return {
        "namespace": namespace,
        "pod_name": pod_name,
        "action": payload.action,
        "details": details,
    }


@router.websocket("/ws/stream")
async def stream_snapshots(
    websocket: WebSocket,
    state: MonitoringStateDep,
    hub: WebSocketHubDep,
) -> None:
    await hub.connect(websocket)
    try:
        await websocket.send_json(await state.snapshot())
        await hub.wait_for_disconnect(websocket)
    finally:
        hub.disconnect(websocket)
