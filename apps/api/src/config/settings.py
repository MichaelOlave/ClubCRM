import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal


@dataclass(frozen=True)
class ApiSettings:
    title: str
    host: str
    port: int
    base_url: str


@dataclass(frozen=True)
class PostgresSettings:
    url: str


@dataclass(frozen=True)
class MongoDBSettings:
    url: str


@dataclass(frozen=True)
class RedisSettings:
    url: str


@dataclass(frozen=True)
class KafkaSettings:
    bootstrap_servers: str


@dataclass(frozen=True)
class AuthSettings:
    bypass_enabled: bool
    session_cookie_name: str
    session_cookie_max_age_seconds: int
    session_cookie_same_site: Literal["lax", "strict", "none"]
    session_cookie_https_only: bool
    csrf_cookie_name: str
    csrf_header_name: str
    login_success_url: str
    logout_redirect_url: str
    auth0_app_name: str
    auth0_domain: str | None
    auth0_client_id: str | None
    auth0_client_secret: str | None
    auth0_scopes: str

    def is_auth0_configured(self) -> bool:
        return all(
            (
                self.auth0_domain,
                self.auth0_client_id,
                self.auth0_client_secret,
            )
        )


@dataclass(frozen=True)
class Settings:
    api: ApiSettings
    auth: AuthSettings
    postgres: PostgresSettings
    mongodb: MongoDBSettings
    redis: RedisSettings
    kafka: KafkaSettings


def _read_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def _read_optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None

    stripped_value = value.strip()
    return stripped_value or None


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api=ApiSettings(
            title=os.getenv("API_APP_TITLE", "ClubCRM API"),
            host=os.getenv("API_HOST", "0.0.0.0"),
            port=int(os.getenv("API_PORT", "8000")),
            base_url=os.getenv("API_BASE_URL", "http://api:8000"),
        ),
        auth=AuthSettings(
            bypass_enabled=_read_bool_env("IS_AUTH_BYPASS", True),
            session_cookie_name=os.getenv("AUTH_SESSION_COOKIE_NAME", "clubcrm_session"),
            session_cookie_max_age_seconds=int(
                os.getenv("AUTH_SESSION_MAX_AGE_SECONDS", str(12 * 60 * 60))
            ),
            session_cookie_same_site=os.getenv("AUTH_COOKIE_SAME_SITE", "lax"),  # type: ignore[arg-type]
            session_cookie_https_only=_read_bool_env("AUTH_COOKIE_SECURE", False),
            csrf_cookie_name=os.getenv("AUTH_CSRF_COOKIE_NAME", "clubcrm_csrf"),
            csrf_header_name=os.getenv("AUTH_CSRF_HEADER_NAME", "X-CSRF-Token"),
            login_success_url=os.getenv(
                "AUTH_LOGIN_SUCCESS_URL",
                "http://localhost:3000/dashboard",
            ),
            logout_redirect_url=os.getenv(
                "AUTH_LOGOUT_REDIRECT_URL",
                "http://localhost:3000/login",
            ),
            auth0_app_name=os.getenv("AUTH0_APP_NAME", "auth0"),
            auth0_domain=_read_optional_env("AUTH0_DOMAIN"),
            auth0_client_id=_read_optional_env("AUTH0_CLIENT_ID"),
            auth0_client_secret=_read_optional_env("AUTH0_CLIENT_SECRET"),
            auth0_scopes=os.getenv("AUTH0_SCOPES", "openid profile email"),
        ),
        postgres=PostgresSettings(
            url=os.getenv("DATABASE_URL", "postgresql://clubcrm:clubcrm@postgres:5432/clubcrm")
        ),
        mongodb=MongoDBSettings(url=os.getenv("MONGODB_URL", "mongodb://mongodb:27017/clubcrm")),
        redis=RedisSettings(url=os.getenv("REDIS_URL", "redis://redis:6379/0")),
        kafka=KafkaSettings(bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")),
    )
