#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from typing import Any
from urllib import request

try:
    import httpx
except ImportError:  # pragma: no cover - optional in lean VM images
    httpx = None

try:
    import psutil
except ImportError:  # pragma: no cover - optional in lean VM images
    psutil = None

try:
    import docker
except ImportError:  # pragma: no cover - optional on machines without Docker
    docker = None


API_BASE_URL = os.environ.get("MONITOR_API_BASE_URL", "http://monitor-api:8010").rstrip("/")
VM_ID = os.environ.get("MONITOR_AGENT_VM_ID", "vm1")
AGENT_TOKEN = os.environ.get("MONITOR_AGENT_TOKEN", "monitor-agent-vm1")
INTERVAL_SECONDS = float(os.environ.get("MONITOR_AGENT_INTERVAL_SECONDS", "1"))
REQUEST_TIMEOUT_SECONDS = float(os.environ.get("MONITOR_AGENT_TIMEOUT_SECONDS", "2"))
_PREVIOUS_CPU_SAMPLE: tuple[int, int] | None = None


def collect_cpu_percent() -> float:
    global _PREVIOUS_CPU_SAMPLE

    if psutil is not None:
        return float(psutil.cpu_percent(interval=None))

    try:
        with open("/proc/stat", encoding="utf-8") as stat_file:
            fields = stat_file.readline().split()[1:]
    except OSError:
        return 0.0

    cpu_values = [int(value) for value in fields]
    total = sum(cpu_values)
    idle = cpu_values[3] + (cpu_values[4] if len(cpu_values) > 4 else 0)

    if _PREVIOUS_CPU_SAMPLE is None:
        _PREVIOUS_CPU_SAMPLE = (total, idle)
        return 0.0

    previous_total, previous_idle = _PREVIOUS_CPU_SAMPLE
    _PREVIOUS_CPU_SAMPLE = (total, idle)

    total_delta = total - previous_total
    idle_delta = idle - previous_idle
    if total_delta <= 0:
        return 0.0

    usage_percent = (1 - (idle_delta / total_delta)) * 100
    return round(max(0.0, min(usage_percent, 100.0)), 2)


def collect_memory_percent() -> float:
    if psutil is not None:
        return float(psutil.virtual_memory().percent)

    try:
        with open("/proc/meminfo", encoding="utf-8") as meminfo_file:
            raw_lines = meminfo_file.readlines()
    except OSError:
        return 0.0

    values: dict[str, int] = {}
    for line in raw_lines:
        key, _, remainder = line.partition(":")
        amount = remainder.strip().split(" ", 1)[0]
        if key and amount.isdigit():
            values[key] = int(amount)

    total = values.get("MemTotal", 0)
    available = values.get("MemAvailable", values.get("MemFree", 0))
    if total <= 0:
        return 0.0

    used = total - available
    return round((used / total) * 100, 2)


def _collect_containers_from_docker_cli() -> list[dict[str, Any]]:
    docker_cli = shutil.which("docker")
    if not docker_cli:
        return []

    completed = subprocess.run(
        [docker_cli, "ps", "-a", "--format", "{{.Names}}\t{{.State}}\t{{.Image}}"],
        capture_output=True,
        check=False,
        text=True,
    )
    if completed.returncode != 0:
        return []

    containers: list[dict[str, Any]] = []
    for line in completed.stdout.splitlines():
        name, status, image = (line.split("\t", 2) + ["", ""])[:3]
        if not name:
            continue
        containers.append(
            {
                "name": name,
                "status": status or "unknown",
                "image": image or None,
            }
        )
    return containers


def _execute_commands_with_docker_cli(commands: list[dict[str, Any]]) -> list[dict[str, Any]]:
    docker_cli = shutil.which("docker")
    if not docker_cli:
        return [
            {
                "command_id": command["id"],
                "kind": command["kind"],
                "action": command["action"],
                "target": command["container_name"],
                "success": False,
                "details": "docker CLI is not installed in this agent environment.",
            }
            for command in commands
        ]

    results: list[dict[str, Any]] = []
    for command in commands:
        target = command["container_name"]
        action = command["action"]
        completed = subprocess.run(
            [docker_cli, action, target],
            capture_output=True,
            check=False,
            text=True,
        )
        success = completed.returncode == 0
        details = None if success else completed.stderr.strip() or completed.stdout.strip()
        results.append(
            {
                "command_id": command["id"],
                "kind": command["kind"],
                "action": action,
                "target": target,
                "success": success,
                "details": details,
            }
        )
    return results


def collect_containers() -> list[dict[str, Any]]:
    if docker is None:
        return _collect_containers_from_docker_cli()

    try:
        client = docker.from_env()
    except Exception:
        return _collect_containers_from_docker_cli()

    containers = []
    for container in client.containers.list(all=True):
        containers.append(
            {
                "name": container.name,
                "status": container.status,
                "image": str(container.image.tags[0]) if container.image.tags else container.image.short_id,
            }
        )
    return containers


def execute_commands(commands: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if docker is None:
        return _execute_commands_with_docker_cli(commands)

    try:
        client = docker.from_env()
    except Exception:
        return _execute_commands_with_docker_cli(commands)

    results: list[dict[str, Any]] = []
    for command in commands:
        target = command["container_name"]
        action = command["action"]
        success = True
        details = None
        try:
            container = client.containers.get(target)
            if action == "start":
                container.start()
            elif action == "stop":
                container.stop()
            elif action == "restart":
                container.restart()
            else:
                success = False
                details = f"Unsupported action '{action}'."
        except Exception as exc:  # pragma: no cover - runtime IO path
            success = False
            details = str(exc)

        results.append(
            {
                "command_id": command["id"],
                "kind": command["kind"],
                "action": action,
                "target": target,
                "success": success,
                "details": details,
            }
        )
    return results


def build_heartbeat(command_results: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "cpu_percent": collect_cpu_percent(),
        "memory_percent": collect_memory_percent(),
        "monotonic_time": time.monotonic(),
        "containers": collect_containers(),
        "command_results": command_results,
    }


def post_heartbeat(
    payload: dict[str, Any],
    *,
    client: Any | None = None,
) -> list[dict[str, Any]]:
    heartbeat_url = f"{API_BASE_URL}/api/agents/{VM_ID}/heartbeat"
    headers = {"Authorization": f"Bearer {AGENT_TOKEN}"}

    if httpx is not None and client is not None:
        response = client.post(heartbeat_url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json().get("commands", [])

    request_payload = request.Request(
        heartbeat_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with request.urlopen(request_payload, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8")).get("commands", [])


def run_loop(*, client: Any | None = None) -> None:
    pending_results: list[dict[str, Any]] = []

    while True:
        payload = build_heartbeat(pending_results)
        pending_results = []
        try:
            commands = post_heartbeat(payload, client=client)
            pending_results = execute_commands(commands)
        except Exception as exc:  # pragma: no cover - runtime IO path
            print(f"monitor agent heartbeat failed: {exc}")

        time.sleep(INTERVAL_SECONDS)


def main() -> None:
    if httpx is None:
        run_loop()
        return

    with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        run_loop(client=client)


if __name__ == "__main__":
    main()
