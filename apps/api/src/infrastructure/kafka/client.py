from __future__ import annotations

import asyncio
import json
import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)


class KafkaClient:
    def __init__(
        self,
        bootstrap_servers: str,
        request_timeout_ms: int = 5000,
        publish_timeout_seconds: float = 5.0,
    ) -> None:
        self.bootstrap_servers = bootstrap_servers
        self._request_timeout_ms = request_timeout_ms
        self._publish_timeout_seconds = publish_timeout_seconds
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._producer = None
        self._started = threading.Event()
        self._lock = threading.Lock()

    def start(self) -> None:
        with self._lock:
            if self._thread is not None:
                return

            ready = threading.Event()
            startup_error: list[BaseException] = []

            def _runner() -> None:
                loop = asyncio.new_event_loop()
                self._loop = loop
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(self._async_start(startup_error))
                    ready.set()
                    if not startup_error:
                        loop.run_forever()
                finally:
                    loop.close()

            self._thread = threading.Thread(target=_runner, name="kafka-producer-loop", daemon=True)
            self._thread.start()
            ready.wait(timeout=10.0)
            if startup_error:
                self._thread = None
                self._loop = None
                logger.warning("kafka producer failed to start: %s", startup_error[0])
                return
            self._started.set()

    async def _async_start(self, startup_error: list[BaseException]) -> None:
        try:
            from aiokafka import AIOKafkaProducer
        except ImportError as exc:
            startup_error.append(exc)
            return

        producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            request_timeout_ms=self._request_timeout_ms,
        )
        try:
            await producer.start()
        except Exception as exc:
            startup_error.append(exc)
            return
        self._producer = producer

    def stop(self) -> None:
        with self._lock:
            loop = self._loop
            producer = self._producer
            thread = self._thread
            self._started.clear()
            self._producer = None
            self._loop = None
            self._thread = None

        if loop is None:
            return

        async def _shutdown() -> None:
            if producer is not None:
                try:
                    await producer.stop()
                except Exception:
                    logger.exception("kafka producer shutdown error")

        try:
            future = asyncio.run_coroutine_threadsafe(_shutdown(), loop)
            future.result(timeout=5.0)
        except Exception:
            logger.exception("kafka producer shutdown timed out")
        finally:
            loop.call_soon_threadsafe(loop.stop)
            if thread is not None:
                thread.join(timeout=5.0)

    def is_ready(self) -> bool:
        return self._started.is_set() and self._producer is not None

    def publish(self, topic: str, value: dict[str, Any]) -> None:
        if not self.is_ready():
            logger.debug("kafka publish skipped (producer not ready): topic=%s", topic)
            return

        loop = self._loop
        producer = self._producer
        if loop is None or producer is None:
            return

        async def _send() -> None:
            await producer.send_and_wait(topic, value)

        future = asyncio.run_coroutine_threadsafe(_send(), loop)
        try:
            future.result(timeout=self._publish_timeout_seconds)
        except Exception:
            logger.exception(
                "kafka publish failed: topic=%s servers=%s",
                topic,
                self.bootstrap_servers,
            )
