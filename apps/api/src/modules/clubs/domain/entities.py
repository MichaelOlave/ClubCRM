from dataclasses import dataclass


@dataclass(frozen=True)
class Club:
    id: str
    organization_id: str
    name: str
    description: str
    status: str
