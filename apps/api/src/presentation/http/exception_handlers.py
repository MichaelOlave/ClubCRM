from fastapi import FastAPI


def register_exception_handlers(app: FastAPI) -> None:
    """Reserve a single place for shared API exception handling."""

    _ = app
