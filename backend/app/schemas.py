from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Number of leading columns (by position, whatever their header text is) that
# are never editable through the row-edit endpoint. Matches "first 3 columns
# should not be editable" from the original spec, now applied positionally
# since column headers are dynamic (driven by the uploaded Excel sheet).
NON_EDITABLE_COLUMN_COUNT = 3


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
    columns: List[str] = Field(default_factory=list)


class RowOut(BaseModel):
    id: str
    client_id: str
    data: Dict[str, Any] = Field(default_factory=dict)
    last_edited_by: Optional[str] = None
    last_edited_at: Optional[str] = None


class RowUpdateRequest(BaseModel):
    # Keyed by column header. Server strips any key that falls in the first
    # NON_EDITABLE_COLUMN_COUNT columns of the client's column list.
    data: Dict[str, Any] = Field(default_factory=dict)


class BulkDeleteRequest(BaseModel):
    row_ids: List[str]


# ---- ATS Tracker (basic structure) ----

class AtsEntryIn(BaseModel):
    company: str
    role: str
    status: str = "Applied"  # Applied | Interview | Offer | Rejected
    applied_date: Optional[str] = None
    notes: Optional[str] = None


class AtsEntryOut(AtsEntryIn):
    id: str
    owner_username: str


# ---- Resume Builder (basic structure) ----

class ResumeDraftIn(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)


class ResumeDraftOut(ResumeDraftIn):
    id: str
    owner_username: str


class AiSuggestRequest(BaseModel):
    section: str  # e.g. "summary"
    context: str  # free text the model uses to draft a suggestion


# ---- Resume Analyzer chatbot ----

class ResumeFileOut(BaseModel):
    id: str
    filename: str
    candidate_name: str
    uploaded_at: str


class ResumeAskRequest(BaseModel):
    question: str
    file_ids: List[str] = Field(default_factory=list)  # empty = use all of the user's files
