from fastapi import APIRouter

from src.infrastructure.postgres.repositories.clubs import PostgresClubRepository
from src.modules.clubs.application.queries.list_clubs import ListClubs

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.get("/")
def list_clubs(organization_id: str) -> list[dict]:
    repo = PostgresClubRepository()
    result = ListClubs(repository=repo).execute(organization_id)
    return [
        {
            "id": club.id,
            "organization_id": club.organization_id,
            "name": club.name,
            "description": club.description,
            "status": club.status,
        }
        for club in result
    ]
