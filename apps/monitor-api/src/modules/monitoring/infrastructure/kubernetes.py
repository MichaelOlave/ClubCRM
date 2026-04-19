from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from src.config.settings import KubernetesSettings
from src.modules.monitoring.domain.models import (
    KubernetesNodeSnapshot,
    KubernetesPersistentVolumeClaimSnapshot,
    KubernetesPodSnapshot,
    KubernetesStorageClassSnapshot,
    LonghornVolumeSnapshot,
)


class KubernetesCommandAdapter:
    def __init__(self, settings: KubernetesSettings) -> None:
        self._settings = settings

    def fetch_snapshot(self) -> dict:
        snapshot_file = self._settings.snapshot_file
        if snapshot_file:
            path = Path(snapshot_file)
            if path.is_file():
                payload = json.loads(path.read_text(encoding="utf-8"))
                return {
                    "connected": True,
                    "source": "snapshot-file",
                    "nodes": [
                        KubernetesNodeSnapshot(
                            name=node["name"],
                            status=node.get("status", "Unknown"),
                        )
                        for node in payload.get("nodes", [])
                    ],
                    "pods": [
                        KubernetesPodSnapshot(
                            namespace=pod["namespace"],
                            name=pod["name"],
                            status=pod.get("status", "Unknown"),
                            node_name=pod.get("node_name"),
                        )
                        for pod in payload.get("pods", [])
                    ],
                    "storage_classes": [
                        KubernetesStorageClassSnapshot(
                            name=storage_class["name"],
                            provisioner=storage_class.get("provisioner", "unknown"),
                            is_default=storage_class.get("is_default", False),
                            volume_binding_mode=storage_class.get("volume_binding_mode"),
                            reclaim_policy=storage_class.get("reclaim_policy"),
                        )
                        for storage_class in payload.get("storage_classes", [])
                    ],
                    "pvcs": [
                        KubernetesPersistentVolumeClaimSnapshot(
                            namespace=pvc["namespace"],
                            name=pvc["name"],
                            status=pvc.get("status", "Unknown"),
                            storage_class_name=pvc.get("storage_class_name"),
                            requested_storage=pvc.get("requested_storage"),
                            volume_name=pvc.get("volume_name"),
                            volume_status=pvc.get("volume_status"),
                        )
                        for pvc in payload.get("pvcs", [])
                    ],
                    "longhorn_volumes": [
                        LonghornVolumeSnapshot(
                            namespace=volume.get("namespace", "longhorn-system"),
                            name=volume["name"],
                            state=volume.get("state", "Unknown"),
                            robustness=volume.get("robustness", "Unknown"),
                            size=volume.get("size"),
                            node_id=volume.get("node_id"),
                            ready=volume.get("ready", False),
                        )
                        for volume in payload.get("longhorn_volumes", [])
                    ],
                }

        if shutil.which("kubectl") is None:
            return {
                "connected": False,
                "source": "unavailable",
                "nodes": [],
                "pods": [],
                "storage_classes": [],
                "pvcs": [],
                "longhorn_volumes": [],
            }

        nodes_payload = _run_kubectl_json(["get", "nodes", "-o", "json"])
        pods_payload = _run_kubectl_json(["get", "pods", "--all-namespaces", "-o", "json"])

        if nodes_payload is None or pods_payload is None:
            return {
                "connected": False,
                "source": "kubectl-error",
                "nodes": [],
                "pods": [],
                "storage_classes": [],
                "pvcs": [],
                "longhorn_volumes": [],
            }

        storage_classes_payload = _run_kubectl_json(["get", "storageclass", "-o", "json"])
        persistent_volume_claims_payload = _run_kubectl_json(
            ["get", "pvc", "--all-namespaces", "-o", "json"]
        )
        persistent_volumes_payload = _run_kubectl_json(["get", "pv", "-o", "json"])
        longhorn_volumes_payload = _run_kubectl_json(
            ["get", "volumes.longhorn.io", "-n", "longhorn-system", "-o", "json"]
        )

        nodes = [
            KubernetesNodeSnapshot(
                name=item["metadata"]["name"],
                status=_parse_node_status(item),
            )
            for item in nodes_payload.get("items", [])
        ]
        pods = [
            KubernetesPodSnapshot(
                namespace=item["metadata"]["namespace"],
                name=item["metadata"]["name"],
                status=item.get("status", {}).get("phase", "Unknown"),
                node_name=item.get("spec", {}).get("nodeName"),
            )
            for item in pods_payload.get("items", [])
        ]
        storage_classes = [
            KubernetesStorageClassSnapshot(
                name=item["metadata"]["name"],
                provisioner=item.get("provisioner", "unknown"),
                is_default=_is_default_storage_class(item),
                volume_binding_mode=item.get("volumeBindingMode"),
                reclaim_policy=item.get("reclaimPolicy"),
            )
            for item in (storage_classes_payload or {}).get("items", [])
        ]
        persistent_volume_statuses = _map_persistent_volume_statuses(
            (persistent_volumes_payload or {}).get("items", [])
        )
        persistent_volume_claims = [
            KubernetesPersistentVolumeClaimSnapshot(
                namespace=item["metadata"]["namespace"],
                name=item["metadata"]["name"],
                status=item.get("status", {}).get("phase", "Unknown"),
                storage_class_name=item.get("spec", {}).get("storageClassName"),
                requested_storage=(
                    item.get("spec", {}).get("resources", {}).get("requests", {}).get("storage")
                ),
                volume_name=item.get("spec", {}).get("volumeName"),
                volume_status=persistent_volume_statuses.get(
                    (
                        item.get("metadata", {}).get("namespace"),
                        item.get("metadata", {}).get("name"),
                    )
                ),
            )
            for item in (persistent_volume_claims_payload or {}).get("items", [])
        ]
        longhorn_volumes = [
            LonghornVolumeSnapshot(
                namespace=item.get("metadata", {}).get("namespace", "longhorn-system"),
                name=item["metadata"]["name"],
                state=item.get("status", {}).get("state", "Unknown"),
                robustness=item.get("status", {}).get("robustness", "Unknown"),
                size=item.get("spec", {}).get("size"),
                node_id=item.get("status", {}).get("currentNodeID"),
                ready=item.get("status", {}).get("robustness", "").lower() == "healthy",
            )
            for item in (longhorn_volumes_payload or {}).get("items", [])
        ]
        return {
            "connected": True,
            "source": "kubectl",
            "nodes": nodes,
            "pods": pods,
            "storage_classes": storage_classes,
            "pvcs": persistent_volume_claims,
            "longhorn_volumes": longhorn_volumes,
        }

    def recycle_pod(self, namespace: str, pod_name: str) -> str:
        if shutil.which("kubectl") is None:
            raise RuntimeError("kubectl is not available for pod recycle actions.")

        completed = subprocess.run(
            ["kubectl", "delete", "pod", pod_name, "-n", namespace],
            capture_output=True,
            check=False,
            text=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or "Pod recycle failed.")
        return completed.stdout.strip() or f"Recycle requested for {namespace}/{pod_name}."


def _parse_node_status(node: dict) -> str:
    conditions = node.get("status", {}).get("conditions", [])
    for condition in conditions:
        if condition.get("type") == "Ready":
            return "Ready" if condition.get("status") == "True" else "NotReady"
    return "Unknown"


def _run_kubectl_json(args: list[str]) -> dict | None:
    try:
        completed = subprocess.run(
            ["kubectl", *args],
            capture_output=True,
            check=True,
            text=True,
        )
    except subprocess.CalledProcessError:
        return None

    return json.loads(completed.stdout)


def _is_default_storage_class(storage_class: dict) -> bool:
    annotations = storage_class.get("metadata", {}).get("annotations", {})
    return (
        annotations.get("storageclass.kubernetes.io/is-default-class") == "true"
        or annotations.get("storageclass.beta.kubernetes.io/is-default-class") == "true"
    )


def _map_persistent_volume_statuses(persistent_volumes: list[dict]) -> dict[tuple[str, str], str]:
    statuses: dict[tuple[str, str], str] = {}
    for persistent_volume in persistent_volumes:
        claim_ref = persistent_volume.get("spec", {}).get("claimRef", {})
        namespace = claim_ref.get("namespace")
        name = claim_ref.get("name")
        if not namespace or not name:
            continue

        statuses[(namespace, name)] = persistent_volume.get("status", {}).get("phase", "Unknown")

    return statuses
