from typing import Optional, List
from pydantic import BaseModel, Field

# Columns A, B, C - never editable by anyone through the row-edit endpoint
NON_EDITABLE_FIELDS = ["date", "role", "required_positions"]

# Columns D onward - editable by business_user and admin via edit mode
EDITABLE_FIELDS = [
    "profiles_submitted",
    "drop_out_profile",
    "pending_interview",
    "interview_round1",
    "interview_round2",
    "selected",
]

ALL_ROW_FIELDS = NON_EDITABLE_FIELDS + EDITABLE_FIELDS


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str  # "business_user" or "admin"
    assigned_clients: List[str] = Field(default_factory=list)


class UserOut(BaseModel):
    username: str
    role: str
    assigned_clients: List[str] = Field(default_factory=list)


class ClientOut(BaseModel):
    id: str
    name: str


class RowOut(BaseModel):
    id: str
    client_id: str
    date: Optional[str] = None
    role: Optional[str] = None
    required_positions: Optional[float] = None
    profiles_submitted: Optional[float] = None
    drop_out_profile: Optional[float] = None
    pending_interview: Optional[float] = None
    interview_round1: Optional[float] = None
    interview_round2: Optional[float] = None
    selected: Optional[float] = None
    last_edited_by: Optional[str] = None
    last_edited_at: Optional[str] = None


class RowUpdateRequest(BaseModel):
    # Only editable fields accepted here - non-editable fields are rejected
    profiles_submitted: Optional[float] = None
    drop_out_profile: Optional[float] = None
    pending_interview: Optional[float] = None
    interview_round1: Optional[float] = None
    interview_round2: Optional[float] = None
    selected: Optional[float] = None
