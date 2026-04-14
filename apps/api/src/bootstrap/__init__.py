__all__ = ["create_app"]


def create_app():
    from src.bootstrap.app_factory import create_app as build_app

    return build_app()
