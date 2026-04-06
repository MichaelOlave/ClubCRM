from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MemberReadModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    first_name: str
    last_name: str
    email: str
    student_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MemberCreateRequest(BaseModel):
    organization_id: str
    first_name: str
    last_name: str
    email: str
    student_id: str | None = None


class MemberUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    student_id: str | None = None
