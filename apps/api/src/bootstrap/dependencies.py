from functools import lru_cache
from importlib import import_module

from src.config import Settings, get_settings
from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.publishers.clubs import KafkaClubEventPublisher
from src.infrastructure.kafka.publishers.forms import KafkaFormSubmissionPublisher
from src.infrastructure.mongodb.client import MongoDBClient
from src.infrastructure.mongodb.stores.forms import MongoDBJoinRequestStore
from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.repositories.announcements import (
    PostgresAnnouncementRepository,
)
from src.infrastructure.postgres.repositories.audit import PostgresAuditLogRepository
from src.infrastructure.postgres.repositories.auth import PostgresAuthorizationRepository
from src.infrastructure.postgres.repositories.clubs import PostgresClubRepository
from src.infrastructure.postgres.repositories.dashboard import PostgresDashboardRepository
from src.infrastructure.postgres.repositories.events import PostgresEventRepository
from src.infrastructure.postgres.repositories.members import PostgresMemberRepository
from src.infrastructure.postgres.repositories.memberships import (
    PostgresMembershipRepository,
)
from src.infrastructure.postgres.unit_of_work import DefaultPostgresUnitOfWork
from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
from src.infrastructure.redis.client import RedisClient
from src.infrastructure.redis.sessions.session_store import RedisAuthSessionStore
from src.modules.announcements.application.ports.announcement_repository import (
    AnnouncementRepository,
)
from src.modules.audit.application.ports.audit_log_repository import AuditLogRepository
from src.modules.auth.application.ports.auth_session_store import AuthSessionStore
from src.modules.auth.application.ports.authorization_repository import AuthorizationRepository
from src.modules.auth.application.ports.identity_provider import AuthIdentityProvider
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.events.application.ports.event_repository import EventRepository
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.members.application.ports.member_repository import MemberRepository
from src.modules.memberships.application.ports.membership_repository import (
    MembershipRepository,
)


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


@lru_cache
def get_auth_session_store() -> AuthSessionStore:
    return RedisAuthSessionStore(
        client=get_redis_client(),
        ttl_seconds=get_app_settings().auth.session_cookie_max_age_seconds,
    )


def get_optional_auth_identity_provider() -> AuthIdentityProvider | None:
    auth_settings = get_app_settings().auth
    if not auth_settings.is_auth0_configured():
        return None

    try:
        auth0_module = import_module("src.infrastructure.auth.providers.auth0")
    except ModuleNotFoundError as exc:
        missing_module_name = exc.name or ""
        if missing_module_name == "httpx" or missing_module_name.startswith("authlib"):
            return None
        raise

    auth0_identity_provider_class = auth0_module.Auth0IdentityProvider
    return auth0_identity_provider_class(
        domain=auth_settings.auth0_domain or "",
        client_id=auth_settings.auth0_client_id or "",
        client_secret=auth_settings.auth0_client_secret or "",
        scopes=auth_settings.auth0_scopes,
    )


def get_authorization_repository() -> AuthorizationRepository:
    return PostgresAuthorizationRepository(client=get_postgres_client())


def get_auth_identity_provider() -> AuthIdentityProvider:
    provider = get_optional_auth_identity_provider()
    if provider is None:
        raise RuntimeError("Auth identity provider is not configured.")

    return provider


def get_club_repository() -> ClubRepository:
    return PostgresClubRepository(client=get_postgres_client())


def get_club_summary_cache() -> ClubSummaryCache:
    return RedisClubSummaryCache(client=get_redis_client())


def get_audit_log_repository() -> AuditLogRepository:
    return PostgresAuditLogRepository(client=get_postgres_client())


def get_club_event_publisher() -> ClubEventPublisher:
    return KafkaClubEventPublisher(client=get_kafka_client())


def get_member_repository() -> MemberRepository:
    return PostgresMemberRepository(client=get_postgres_client())


def get_event_repository() -> EventRepository:
    return PostgresEventRepository(client=get_postgres_client())


def get_announcement_repository() -> AnnouncementRepository:
    return PostgresAnnouncementRepository(client=get_postgres_client())


def get_membership_repository() -> MembershipRepository:
    return PostgresMembershipRepository(client=get_postgres_client())


def get_postgres_unit_of_work() -> DefaultPostgresUnitOfWork:
    return DefaultPostgresUnitOfWork(client=get_postgres_client())


def get_join_request_store() -> JoinRequestStore:
    return MongoDBJoinRequestStore(client=get_mongodb_client())


def get_form_submission_publisher() -> FormSubmissionPublisher:
    return KafkaFormSubmissionPublisher(client=get_kafka_client())


def get_dashboard_repository() -> DashboardRepository:
    return PostgresDashboardRepository(client=get_postgres_client())
