from functools import lru_cache

from src.config import Settings, get_settings
from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.publishers.clubs import KafkaClubEventPublisher
from src.infrastructure.kafka.publishers.forms import KafkaFormSubmissionPublisher
from src.infrastructure.mongodb.client import MongoDBClient
from src.infrastructure.mongodb.stores.forms import MongoDBJoinRequestStore
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.repositories.clubs import PostgresClubRepository
from src.infrastructure.postgres.repositories.dashboard import PostgresDashboardRepository
from src.infrastructure.postgres.unit_of_work import DefaultPostgresUnitOfWork
from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
from src.infrastructure.redis.client import RedisClient
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.application.ports.join_request_store import JoinRequestStore


@lru_cache
def get_app_settings() -> Settings:
    return get_settings()


@lru_cache
def get_postgres_client() -> PostgresClient:
    return PostgresClient(dsn=get_app_settings().postgres.url)


@lru_cache
def get_mongodb_client() -> MongoDBClient:
    return MongoDBClient(database_url=get_app_settings().mongodb.url)


@lru_cache
def get_redis_client() -> RedisClient:
    return RedisClient(url=get_app_settings().redis.url)


@lru_cache
def get_kafka_client() -> KafkaClient:
    return KafkaClient(bootstrap_servers=get_app_settings().kafka.bootstrap_servers)


def get_club_repository() -> ClubRepository:
    return PostgresClubRepository(client=get_postgres_client())


def get_club_summary_cache() -> ClubSummaryCache:
    return RedisClubSummaryCache(client=get_redis_client())


def get_club_event_publisher() -> ClubEventPublisher:
    return KafkaClubEventPublisher(client=get_kafka_client())


def get_postgres_unit_of_work() -> DefaultPostgresUnitOfWork:
    return DefaultPostgresUnitOfWork(client=get_postgres_client())


def get_join_request_store() -> JoinRequestStore:
    return MongoDBJoinRequestStore(client=get_mongodb_client())


def get_form_submission_publisher() -> FormSubmissionPublisher:
    return KafkaFormSubmissionPublisher(client=get_kafka_client())


def get_dashboard_repository() -> DashboardRepository:
    return PostgresDashboardRepository(client=get_postgres_client())
