import os
import socket

from fastapi import APIRouter

from src.bootstrap.dependencies import get_redis_client

router = APIRouter(tags=["health"])


def _get_runtime_metadata() -> dict[str, str | None]:
    instance_id = os.getenv("POD_NAME") or os.getenv("HOSTNAME") or socket.gethostname()
    is_kubernetes = bool(os.getenv("KUBERNETES_SERVICE_HOST"))

    return {
        "service": "clubcrm-api",
        "instance_id": instance_id,
        "pod_name": instance_id if is_kubernetes else None,
        "namespace": os.getenv("POD_NAMESPACE"),
        "node_name": os.getenv("NODE_NAME"),
        "platform": "kubernetes" if is_kubernetes else "local",
    }


@router.get("/health")
def health_check() -> dict:
    redis_status = {
        "status": "down",
        "enabled": True,
        "details": {},
    }

    try:
        client = get_redis_client()
        ping_ok = client.ping()
        info = client.info()

        redis_status = {
            "status": "ok" if ping_ok else "down",
            "enabled": True,
            "details": {
                "version": info.get("redis_version"),
            },
        }
    except Exception as exc:
        redis_status = {
            "status": "down",
            "enabled": True,
            "details": {
                "error": str(exc),
            },
        }

    return {
        "status": "ok",
        "checks": {
            "redis": redis_status,
        },
        "runtime": _get_runtime_metadata(),
    }
