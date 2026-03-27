from __future__ import annotations

import asyncio
import contextlib
import signal
import sys
from collections.abc import Sequence

BUFFER_SIZE = 64 * 1024


def parse_mapping(raw_mapping: str) -> tuple[int, str, int]:
    try:
        listen_port_raw, target_host, target_port_raw = raw_mapping.split(":", 2)
        listen_port = int(listen_port_raw)
        target_port = int(target_port_raw)
    except ValueError as error:
        raise SystemExit(
            "Mappings must use the format '<listen_port>:<target_host>:<target_port>'."
        ) from error

    return listen_port, target_host, target_port


async def pipe_stream(
    source: asyncio.StreamReader, destination: asyncio.StreamWriter
) -> None:
    try:
        while chunk := await source.read(BUFFER_SIZE):
            destination.write(chunk)
            await destination.drain()
    except (ConnectionError, OSError, asyncio.CancelledError):
        pass
    finally:
        with contextlib.suppress(Exception):
            destination.close()
            await destination.wait_closed()


async def handle_connection(
    client_reader: asyncio.StreamReader,
    client_writer: asyncio.StreamWriter,
    target_host: str,
    target_port: int,
) -> None:
    try:
        target_reader, target_writer = await asyncio.open_connection(target_host, target_port)
    except (ConnectionError, OSError):
        client_writer.close()
        await client_writer.wait_closed()
        return

    tasks = (
        asyncio.create_task(pipe_stream(client_reader, target_writer)),
        asyncio.create_task(pipe_stream(target_reader, client_writer)),
    )

    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

    for task in pending:
        task.cancel()

    for task in done:
        with contextlib.suppress(Exception):
            await task


async def run_proxy(listen_port: int, target_host: str, target_port: int) -> asyncio.Server:
    return await asyncio.start_server(
        lambda reader, writer: handle_connection(reader, writer, target_host, target_port),
        host="127.0.0.1",
        port=listen_port,
    )


async def main(mappings: Sequence[str]) -> None:
    if not mappings:
        raise SystemExit("Provide at least one TCP proxy mapping.")

    servers = [
        await run_proxy(listen_port, target_host, target_port)
        for listen_port, target_host, target_port in map(parse_mapping, mappings)
    ]

    stop_event = asyncio.Event()

    def request_stop() -> None:
        stop_event.set()

    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(signal_name, request_stop)

    try:
        await stop_event.wait()
    finally:
        for server in servers:
            server.close()
            await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
