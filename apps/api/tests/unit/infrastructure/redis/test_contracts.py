# import unittest

# from helpers import add_api_root_to_path

# add_api_root_to_path()

# from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
# from src.infrastructure.redis.client import RedisClient
# from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
# from src.modules.clubs.domain.entities import Club


# class RedisAdapterContractTests(unittest.TestCase):
#     def test_club_summary_cache_matches_port(self) -> None:
#         cache = RedisClubSummaryCache(RedisClient(url="redis://example"))
#         club = Club(
#             id="club-1",
#             organization_id="org-1",
#             name="Chess Club",
#             description="Strategy and tournaments.",
#             status="active",
#         )

#         cache.set("org-1", [club])

#         self.assertIsInstance(cache, ClubSummaryCache)
#         self.assertEqual(cache.get("org-1"), [club])

import unittest
from unittest.mock import Mock

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
from src.infrastructure.redis.client import RedisClient
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.clubs.domain.entities import Club


class RedisAdapterContractTests(unittest.TestCase):
    def test_club_summary_cache_matches_port(self) -> None:
        mock_client = Mock(spec=RedisClient)
        club = Club(
            id="club-1",
            organization_id="org-1",
            name="Chess Club",
            description="Strategy and tournaments.",
            status="active",
        )

        mock_client.get_json.return_value = [
            {
                "id": "club-1",
                "organization_id": "org-1",
                "name": "Chess Club",
                "description": "Strategy and tournaments.",
                "status": "active",
            }
        ]

        cache = RedisClubSummaryCache(mock_client)

        self.assertIsInstance(cache, ClubSummaryCache)
        self.assertEqual(cache.get("org-1"), [club])

        cache.set("org-1", [club])
        mock_client.set_json.assert_called_once()