from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

class Session(Base):
    __tablename__ = "sessions"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at   = Column(DateTime(timezone=True), nullable=True)
    events     = relationship("KeystrokeEvent", back_populates="session")
    target_text = Column(Text, nullable=False)
    user_input = Column(Text, nullable=True)
    # Enhanced metrics
    accuracy_percentage = Column(Float, nullable=True)
    error_count = Column(Integer, default=0)
    correction_count = Column(Integer, default=0)  # Number of backspaces/corrections
    words_per_minute = Column(Float, nullable=True)
    characters_per_minute = Column(Float, nullable=True)

class KeystrokeEvent(Base):
    __tablename__ = "keystroke_events"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    key        = Column(String, nullable=False)
    down_ts    = Column(Float,  nullable=False)  # epoch seconds
    up_ts      = Column(Float,  nullable=False)
    # Enhanced fields for AI coaching
    target_char = Column(String, nullable=True)  # What character should have been typed
    position_in_text = Column(Integer, nullable=True)  # Position in target text
    is_correction = Column(String, nullable=True)  # 'backspace', 'delete', etc.
    is_error = Column(String, nullable=True)  # 'substitution', 'insertion', 'deletion', 'transposition'
    session    = relationship("Session", back_populates="events")

class TypingAnalytics(Base):
    __tablename__ = "typing_analytics"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    # Character-level metrics
    char = Column(String, nullable=False)
    avg_dwell_time = Column(Float, nullable=False)  # Average dwell time for this character
    dwell_count = Column(Integer, nullable=False)  # Number of times this character was typed
    error_count = Column(Integer, default=0)  # Number of errors with this character
    # Digram (two-character) metrics
    prev_char = Column(String, nullable=True)  # Previous character (for bigram analysis)
    flight_time = Column(Float, nullable=True)  # Flight time from prev_char to char
    session = relationship("Session")

class UserTypingProfile(Base):
    __tablename__ = "user_typing_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Overall statistics
    avg_wpm = Column(Float, default=0.0)
    avg_accuracy = Column(Float, default=0.0)
    total_sessions = Column(Integer, default=0)
    # Problem areas (JSON strings)
    slow_characters = Column(Text, nullable=True)  # JSON: {"char": avg_dwell_time}
    error_prone_characters = Column(Text, nullable=True)  # JSON: {"char": error_rate}
    difficult_bigrams = Column(Text, nullable=True)  # JSON: {"bigram": avg_flight_time}
    common_errors = Column(Text, nullable=True)  # JSON: {"error_type": count}
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user = relationship("User")
