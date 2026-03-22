import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    api_title: str
    api_host: str
    api_port: int
    api_base_url: str
    database_url: str
    mongodb_url: str
    redis_url: str
    kafka_bootstrap_servers: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api_title=os.getenv("API_APP_TITLE", "ClubCRM API"),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
        api_base_url=os.getenv("API_BASE_URL", "http://api:8000"),
        database_url=os.getenv(
            "DATABASE_URL", "postgresql://clubcrm:clubcrm@postgres:5432/clubcrm"
        ),
        mongodb_url=os.getenv("MONGODB_URL", "mongodb://mongodb:27017/clubcrm"),
        redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"),
        kafka_bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
    )
