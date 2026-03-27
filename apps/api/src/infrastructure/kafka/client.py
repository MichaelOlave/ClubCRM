from dataclasses import dataclass


@dataclass(frozen=True)
class KafkaClient:
    bootstrap_servers: str
