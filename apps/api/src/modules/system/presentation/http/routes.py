import os
import socket
import time

from fastapi import APIRouter
from sqlalchemy import text

from src.bootstrap.dependencies import (
    get_kafka_client,
    get_mongodb_client,
    get_postgres_client,
    get_redis_client,
)

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


def _check_redis() -> dict:
    started = time.perf_counter()
    try:
        client = get_redis_client()
        ping_ok = client.ping()
        info = client.info()
        return {
            "status": "ok" if ping_ok else "down",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {"version": info.get("redis_version")},
        }
    except Exception as exc:
        return {
            "status": "down",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {"error": str(exc)},
        }


def _check_postgres() -> dict:
    started = time.perf_counter()
    try:
        engine = get_postgres_client().get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {},
        }
    except Exception as exc:
        return {
            "status": "down",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {"error": str(exc)},
        }


def _check_mongodb() -> dict:
    started = time.perf_counter()
    try:
        get_mongodb_client().ping()
        return {
            "status": "ok",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {},
        }
    except Exception as exc:
        return {
            "status": "down",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {"error": str(exc)},
        }


def _check_kafka() -> dict:
    started = time.perf_counter()
    try:
        client = get_kafka_client()
        ready = client.is_ready()
        return {
            "status": "ok" if ready else "down",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {"bootstrap_servers": client.bootstrap_servers},
        }
    except Exception as exc:
        return {
            "status": "down",
            "enabled": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "details": {"error": str(exc)},
        }


@router.get("/health")
def health_check(deep: bool = False) -> dict:
    redis_status = _check_redis()
    checks: dict = {"redis": redis_status}

    if deep:
        checks["postgres"] = _check_postgres()
        checks["mongodb"] = _check_mongodb()
        checks["kafka"] = _check_kafka()

    return {
        "status": "ok",
        "checks": checks,
        "runtime": _get_runtime_metadata(),
    }
