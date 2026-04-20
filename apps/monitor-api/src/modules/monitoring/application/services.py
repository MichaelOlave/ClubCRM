from __future__ import annotations

import asyncio
import contextlib
from time import perf_counter

import httpx
from fastapi import WebSocket
from src.config import Settings
from src.modules.monitoring.application.state import MonitoringState
from src.modules.monitoring.infrastructure.kubernetes import KubernetesCommandAdapter
from src.modules.monitoring.infrastructure.vm_power import VmPowerAdapter
from starlette.websockets import WebSocketDisconnect


class WebSocketHub:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        stale_connections: list[WebSocket] = []

        for websocket in list(self._connections):
            try:
                await websocket.send_json(payload)
            except WebSocketDisconnect:
                stale_connections.append(websocket)
            except RuntimeError:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(websocket)

    async def wait_for_disconnect(self, websocket: WebSocket) -> None:
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            self.disconnect(websocket)


class MonitoringRuntime:
    def __init__(
        self,
        *,
        settings: Settings,
        state: MonitoringState,
        websocket_hub: WebSocketHub,
        vm_power_adapter: VmPowerAdapter,
        kubernetes_adapter: KubernetesCommandAdapter,
    ) -> None:
        self._settings = settings
        self._state = state
        self._websocket_hub = websocket_hub
        self._vm_power_adapter = vm_power_adapter
        self._kubernetes_adapter = kubernetes_adapter
        self._tasks: list[asyncio.Task] = []

    async def start(self) -> None:
        self._tasks = [
            asyncio.create_task(self._run_synthetic_loop(), name="monitor-synthetic-loop"),
            asyncio.create_task(self._run_kubernetes_loop(), name="monitor-k8s-loop"),
            asyncio.create_task(self._run_vm_power_loop(), name="monitor-vm-power-loop"),
            asyncio.create_task(self._run_websocket_loop(), name="monitor-websocket-loop"),
        ]

    async def stop(self) -> None:
        for task in self._tasks:
            task.cancel()

        for task in self._tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def _run_synthetic_loop(self) -> None:
        while True:
            started_at = perf_counter()
            try:
                async with httpx.AsyncClient(
                    timeout=self._settings.synthetic.timeout_seconds,
                    follow_redirects=True,
                ) as client:
                    response = await client.get(self._settings.synthetic.target_url)
                latency_ms = (perf_counter() - started_at) * 1000
                await self._state.record_synthetic_check(
                    available=response.is_success,
                    latency_ms=latency_ms,
                    status_code=response.status_code,
                )
            except Exception as exc:
                await self._state.record_synthetic_check(
                    available=False,
                    latency_ms=None,
                    status_code=None,
                    error=str(exc),
                )

            await asyncio.sleep(self._settings.synthetic.interval_seconds)

    async def _run_kubernetes_loop(self) -> None:
        while True:
            snapshot = await asyncio.to_thread(self._kubernetes_adapter.fetch_snapshot)
            await self._state.record_kubernetes_snapshot(
                connected=snapshot["connected"],
                source=snapshot["source"],
                nodes=snapshot["nodes"],
                pods=snapshot["pods"],
                storage_classes=snapshot.get("storage_classes"),
                persistent_volume_claims=snapshot.get("pvcs"),
                longhorn_volumes=snapshot.get("longhorn_volumes"),
            )
            await asyncio.sleep(self._settings.kubernetes.poll_interval_seconds)

    async def _run_vm_power_loop(self) -> None:
        while True:
            states = await asyncio.to_thread(self._vm_power_adapter.list_vms)
            await self._state.record_vm_power_states(states)
            poll_interval_seconds = (
                self._settings.proxmox.poll_interval_seconds
                if self._settings.monitoring.vm_provider == "proxmox"
                else self._settings.ssh_vm_power.poll_interval_seconds
                if self._settings.monitoring.vm_provider == "ssh"
                else self._settings.orbstack.poll_interval_seconds
            )
            await asyncio.sleep(poll_interval_seconds)

    async def _run_websocket_loop(self) -> None:
        while True:
            snapshot = await self._state.snapshot()
            await self._websocket_hub.broadcast(snapshot)
            await asyncio.sleep(1)
