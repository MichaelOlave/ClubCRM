from __future__ import annotations

import asyncio
import json
from pathlib import Path


class ClusterRecordingStore:
    def __init__(self, recording_file: str | None) -> None:
        self._recording_file = recording_file
        self._lock = asyncio.Lock()

    @property
    def enabled(self) -> bool:
        return self._recording_file is not None

    @property
    def source(self) -> str | None:
        if self._recording_file is None:
            return None
        return str(resolve_cluster_path(self._recording_file))

    async def reset(self) -> None:
        if self._recording_file is None:
            return

        path = resolve_cluster_path(self._recording_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        async with self._lock:
            await asyncio.to_thread(path.write_text, "", "utf-8")

    async def record_frame(self, frame: dict) -> None:
        if self._recording_file is None:
            return

        path = resolve_cluster_path(self._recording_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        encoded = json.dumps(frame, separators=(",", ":")) + "\n"
        async with self._lock:
            await asyncio.to_thread(_append_text, path, encoded)

    async def load_replay(self) -> dict | None:
        if self._recording_file is None:
            return None

        path = resolve_cluster_path(self._recording_file)
        if not path.is_file():
            return None

        async with self._lock:
            raw_text = await asyncio.to_thread(path.read_text, "utf-8")

        frames: list[dict] = []
        initial_snapshot: dict | None = None
        for line in raw_text.splitlines():
            if not line.strip():
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue

            if not isinstance(payload, dict):
                continue

            frame_type = payload.get("type")
            if frame_type == "snapshot":
                if initial_snapshot is None:
                    initial_snapshot = payload
                    continue
                frames.append(payload)
                continue
            if frame_type == "event" and isinstance(payload.get("event"), dict):
                frames.append(payload)

        replay_source = str(path)
        if initial_snapshot is None:
            return {
                "type": "replay",
                "source": replay_source,
                "initial_snapshot": _empty_snapshot(),
                "frames": [],
                "started_at": None,
                "ended_at": None,
            }

        timeline: list[dict] = [initial_snapshot, *frames]
        return {
            "type": "replay",
            "source": replay_source,
            "initial_snapshot": initial_snapshot,
            "frames": frames,
            "started_at": _read_ts(timeline[0]),
            "ended_at": _read_ts(timeline[-1]),
        }


def resolve_cluster_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path

    cwd_path = Path.cwd() / path
    if cwd_path.is_file() or cwd_path.parent.exists():
        return cwd_path

    for parent in Path(__file__).resolve().parents:
        candidate = parent / path
        if candidate.is_file() or candidate.parent.exists():
            return candidate

    return cwd_path


def _append_text(path: Path, encoded: str) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(encoded)


def _empty_snapshot() -> dict:
    return {
        "type": "snapshot",
        "ts": 0,
        "nodes": [],
        "pods": [],
        "volumes": [],
        "replicas": [],
        "probes": [],
    }


def _read_ts(frame: dict) -> float | None:
    ts = frame.get("ts")
    return float(ts) if isinstance(ts, int | float) else None
