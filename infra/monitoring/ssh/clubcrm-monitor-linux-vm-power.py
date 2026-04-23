#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass

import pexpect


@dataclass(frozen=True)
class VmTarget:
    name: str
    host: str


def _read_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _read_optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _parse_vm_targets() -> dict[str, VmTarget]:
    raw_targets = _read_optional_env("MONITORED_SSH_VMS") or _read_optional_env("MONITOR_TARGET_VMS")
    if not raw_targets:
        raise RuntimeError("MONITORED_SSH_VMS or MONITOR_TARGET_VMS must be set.")

    host_map: dict[str, str] = {}
    raw_host_map = _read_optional_env("MONITOR_VM_HOST_MAP")
    if raw_host_map:
        for raw_entry in raw_host_map.split(","):
            entry = raw_entry.strip()
            if not entry or "=" not in entry:
                continue
            name, host = entry.split("=", 1)
            vm_name = name.strip()
            vm_host = host.strip()
            if vm_name and vm_host:
                host_map[vm_name] = vm_host

    targets: dict[str, VmTarget] = {}
    for raw_name in raw_targets.split(","):
        name = raw_name.strip()
        if not name:
            continue
        targets[name] = VmTarget(name=name, host=host_map.get(name, name))

    if not targets:
        raise RuntimeError("No SSH VM targets were configured.")

    return targets


def _ssh_prefix(target: VmTarget) -> list[str]:
    user = _read_env("MONITOR_VM_SSH_USER")
    port = _read_optional_env("MONITOR_VM_SSH_PORT") or "22"
    connect_timeout = _read_optional_env("MONITOR_VM_SSH_CONNECT_TIMEOUT_SECONDS") or "5"

    command = [
        "ssh",
        "-tt",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        f"ConnectTimeout={connect_timeout}",
    ]

    identity_file = _read_optional_env("MONITOR_VM_SSH_IDENTITY_FILE")
    if identity_file:
        command.extend(["-i", identity_file])

    command.extend(["-p", port, f"{user}@{target.host}"])
    return command


def _run_ssh_command(target: VmTarget, remote_command: str, *, tolerate_disconnect: bool = False) -> tuple[bool, str]:
    ssh_password = _read_optional_env("MONITOR_VM_SSH_PASSWORD")
    sudo_password = _read_optional_env("MONITOR_VM_SUDO_PASSWORD") or ssh_password
    child = pexpect.spawn(
        _ssh_prefix(target)[0],
        _ssh_prefix(target)[1:] + [remote_command],
        encoding="utf-8",
        timeout=float(_read_optional_env("MONITOR_VM_SSH_COMMAND_TIMEOUT_SECONDS") or "30"),
    )

    output_parts: list[str] = []
    password_sent = False
    sudo_password_sent = False

    while True:
        index = child.expect(
            [
                r"Are you sure you want to continue connecting \(yes/no/\[fingerprint\]\)\?",
                r"[Pp]assword:",
                r"\[sudo\] password for .+:",
                r"Connection to .+ closed\.",
                pexpect.EOF,
                pexpect.TIMEOUT,
            ]
        )
        output_parts.append(child.before)

        if index == 0:
            child.sendline("yes")
            continue
        if index == 1:
            if ssh_password is None or password_sent:
                child.close(force=True)
                return False, "".join(output_parts).strip() or "SSH password prompt could not be satisfied."
            child.sendline(ssh_password)
            password_sent = True
            continue
        if index == 2:
            if sudo_password is None or sudo_password_sent:
                child.close(force=True)
                return False, "".join(output_parts).strip() or "sudo password prompt could not be satisfied."
            child.sendline(sudo_password)
            sudo_password_sent = True
            continue
        if index == 3:
            output_parts.append(child.after)
            child.close()
            return tolerate_disconnect, "".join(output_parts).strip()
        if index == 4:
            output_parts.append(child.after or "")
            child.close()
            return child.exitstatus in {0, None}, "".join(output_parts).strip()
        if index == 5:
            child.close(force=True)
            return False, "".join(output_parts).strip() or "SSH command timed out."

    return False, "".join(output_parts).strip()


def _list_vms(targets: dict[str, VmTarget]) -> int:
    payload = []
    for target in targets.values():
        success, details = _run_ssh_command(target, "hostname", tolerate_disconnect=False)
        is_running = success or target.name.lower() in (details or "").lower()
        payload.append(
            {
                "name": target.name,
                "status": "running" if is_running else "stopped",
                "details": details or ("reachable" if is_running else "unreachable"),
            }
        )

    print(json.dumps(payload))
    return 0


def _power_action(targets: dict[str, VmTarget], action: str, vm_name: str) -> int:
    target = targets.get(vm_name)
    if target is None:
        raise RuntimeError(f"Unknown VM target: {vm_name}")

    if action == "start":
        raise RuntimeError("Start is not supported through the guest SSH wrapper.")

    if action == "restart":
        success, details = _run_ssh_command(
            target,
            "sudo reboot",
            tolerate_disconnect=True,
        )
        status = "running"
    elif action == "stop":
        success, details = _run_ssh_command(
            target,
            "sudo shutdown now",
            tolerate_disconnect=True,
        )
        status = "stopped"
    else:
        raise RuntimeError(f"Unsupported power action: {action}")

    if not success:
        raise RuntimeError(details or f"{action} failed for {vm_name}")

    print(
        json.dumps(
            {
                "name": target.name,
                "status": status,
                "details": details or f"{action} requested for {vm_name}.",
            }
        )
    )
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        raise RuntimeError("usage: clubcrm-monitor-linux-vm-power.py <list|power>")

    command = sys.argv[1]
    targets = _parse_vm_targets()

    if command == "list":
        return _list_vms(targets)

    if command == "power":
        if len(sys.argv) < 4:
            raise RuntimeError(
                "usage: clubcrm-monitor-linux-vm-power.py power <start|stop|restart> <machine>"
            )
        return _power_action(targets, sys.argv[2], sys.argv[3])

    raise RuntimeError("usage: clubcrm-monitor-linux-vm-power.py <list|power>")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc
