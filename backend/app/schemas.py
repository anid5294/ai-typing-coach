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
    propmt: str
    model_config = ConfigDict(from_attributes=True)

class KeystrokeEventIn(BaseModel):
    key: str
    down_ts: float
    up_ts: float

class KeystrokesUploadOut(BaseModel):
    count: int

class SessionSummary(BaseModel):
    session_id: int
    duration_secs: float
    keystroke_count: int
    wpm: float
    avg_dwell_ms: float
    avg_flight_ms: float
    model_config = ConfigDict(from_attributes=True)
