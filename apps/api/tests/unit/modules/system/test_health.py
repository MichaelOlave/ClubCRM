# import unittest

# from helpers import add_api_root_to_path

# add_api_root_to_path()

# from src.bootstrap.app_factory import create_app
# from src.modules.system.presentation.http.routes import health_check


# class HealthRouteTests(unittest.TestCase):
#     def test_health_route_is_registered_on_the_app(self) -> None:
#         app = create_app()
#         registered_paths = {route.path for route in app.router.routes}

#         self.assertIn("/health", registered_paths)

#     def test_health_handler_still_returns_ok(self) -> None:
#         self.assertEqual(health_check(), {"status": "ok"})

import unittest
from os import environ
from unittest.mock import patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.app_factory import create_app
from src.modules.system.presentation.http.routes import health_check


class HealthRouteTests(unittest.TestCase):
    def test_health_route_is_registered_on_the_app(self) -> None:
        app = create_app()
        registered_paths = {route.path for route in app.router.routes}

        self.assertIn("/health", registered_paths)

    @patch("src.modules.system.presentation.http.routes.get_redis_client")
    def test_health_handler_reports_redis_ok(self, mock_get_redis_client) -> None:
        mock_client = mock_get_redis_client.return_value
        mock_client.ping.return_value = True
        mock_client.info.return_value = {"redis_version": "7.0.0"}

        result = health_check()

        self.assertEqual(result["status"], "ok")
        self.assertIn("redis", result["checks"])
        self.assertEqual(result["checks"]["redis"]["status"], "ok")
        self.assertEqual(result["checks"]["redis"]["details"]["version"], "7.0.0")
        self.assertEqual(result["runtime"]["service"], "clubcrm-api")
        self.assertIn("instance_id", result["runtime"])

    @patch("src.modules.system.presentation.http.routes.get_redis_client")
    def test_health_handler_reports_redis_down_without_crashing(self, mock_get_redis_client) -> None:
        mock_get_redis_client.side_effect = RuntimeError("redis unavailable")

        result = health_check()

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["checks"]["redis"]["status"], "down")
        self.assertEqual(
            result["checks"]["redis"]["details"]["error"],
            "redis unavailable",
        )
        self.assertEqual(result["runtime"]["service"], "clubcrm-api")

    @patch.dict(
        environ,
        {
            "POD_NAME": "clubcrm-api-demo-pod",
            "HOSTNAME": "0.0.0.0",
            "KUBERNETES_SERVICE_HOST": "10.43.0.1",
            "POD_NAMESPACE": "clubcrm",
            "NODE_NAME": "server2",
        },
        clear=False,
    )
    @patch("src.modules.system.presentation.http.routes.get_redis_client")
    def test_health_handler_prefers_pod_name_for_runtime_metadata(
        self,
        mock_get_redis_client,
    ) -> None:
        mock_client = mock_get_redis_client.return_value
        mock_client.ping.return_value = True
        mock_client.info.return_value = {"redis_version": "7.0.0"}

        result = health_check()

        self.assertEqual(result["runtime"]["instance_id"], "clubcrm-api-demo-pod")
        self.assertEqual(result["runtime"]["pod_name"], "clubcrm-api-demo-pod")
        self.assertEqual(result["runtime"]["namespace"], "clubcrm")
        self.assertEqual(result["runtime"]["node_name"], "server2")
