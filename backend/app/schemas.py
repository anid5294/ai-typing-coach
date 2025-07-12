from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

# for typing sessions

class SessionStartIn(BaseModel):
    prompt: str

class SessionStartOut(BaseModel):
    session_id: int
    started_at: datetime
    prompt: str
    model_config = ConfigDict(from_attributes=True)

class KeystrokeEventIn(BaseModel):
    key: str
    down_ts: float
    up_ts: float
    target_char: str | None = None
    position_in_text: int | None = None
    is_correction: str | None = None
    is_error: str | None = None

class KeystrokesUploadOut(BaseModel):
    count: int

class ErrorDetail(BaseModel):
    position: int
    expected: str
    actual: str

class ErrorAnalysis(BaseModel):
    total_errors: int
    substitutions: list[ErrorDetail]
    insertions: list[ErrorDetail]
    deletions: list[ErrorDetail]
    error_positions: list[int]
    problematic_characters: dict[str, int]
    accuracy_by_position: list[int]
    error_rate: float

class SessionSummary(BaseModel):
    session_id: int
    duration_secs: float
    keystroke_count: int
    wpm: float
    avg_dwell_ms: float
    avg_flight_ms: float
    accuracy_percentage: float | None = None
    error_count: int = 0
    correction_count: int = 0
    error_details: ErrorAnalysis | None = None
    user_input: str | None = None
    target_text: str | None = None
    model_config = ConfigDict(from_attributes=True)

class CharacterAnalysis(BaseModel):
    char: str
    avg_dwell_time: float
    dwell_count: int
    error_count: int
    difficulty_score: float  # Computed metric combining dwell time and errors

class BigramAnalysis(BaseModel):
    bigram: str
    avg_flight_time: float
    count: int
    difficulty_score: float

class DetailedAnalysis(BaseModel):
    session_id: int
    slow_characters: list[CharacterAnalysis]
    difficult_bigrams: list[BigramAnalysis]
    common_errors: dict[str, int]
    typing_rhythm: dict[str, float]  # Metrics about typing consistency
    improvement_areas: list[str]  # AI-generated suggestions
