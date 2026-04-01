# from fastapi import APIRouter

# router = APIRouter(tags=["health"])


# @router.get("/health")
# def health_check() -> dict[str, str]:
#     return {"status": "ok"}

from fastapi import APIRouter

from src.bootstrap.dependencies import get_redis_client

router = APIRouter(tags=["health"])


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
    }