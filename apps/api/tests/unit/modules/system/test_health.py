import unittest

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.app_factory import create_app
from src.modules.system.presentation.http.routes import health_check


class HealthRouteTests(unittest.TestCase):
    def test_health_route_is_registered_on_the_app(self) -> None:
        app = create_app()
        registered_paths = {route.path for route in app.router.routes}

        self.assertIn("/health", registered_paths)

    def test_health_handler_still_returns_ok(self) -> None:
        self.assertEqual(health_check(), {"status": "ok"})
