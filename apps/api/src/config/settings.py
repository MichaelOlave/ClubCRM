import os
from dataclasses import dataclass
from functools import lru_cache


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
class Settings:
    api: ApiSettings
    postgres: PostgresSettings
    mongodb: MongoDBSettings
    redis: RedisSettings
    kafka: KafkaSettings


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api=ApiSettings(
            title=os.getenv("API_APP_TITLE", "ClubCRM API"),
            host=os.getenv("API_HOST", "0.0.0.0"),
            port=int(os.getenv("API_PORT", "8000")),
            base_url=os.getenv("API_BASE_URL", "http://api:8000"),
        ),
        postgres=PostgresSettings(
            url=os.getenv(
                "DATABASE_URL", "postgresql://clubcrm:clubcrm@postgres:5432/clubcrm"
            )
        ),
        mongodb=MongoDBSettings(
            url=os.getenv("MONGODB_URL", "mongodb://mongodb:27017/clubcrm")
        ),
        redis=RedisSettings(url=os.getenv("REDIS_URL", "redis://redis:6379/0")),
        kafka=KafkaSettings(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
        ),
    )
