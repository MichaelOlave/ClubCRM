from dataclasses import dataclass


@dataclass(frozen=True)
class CreateMemberInput:
    organization_id: str
    first_name: str
    last_name: str
    email: str
    student_id: str | None = None


@dataclass(frozen=True)
class UpdateMemberInput:
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    student_id: str | None = None
