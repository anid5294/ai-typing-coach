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

class KeystrokeEvent(Base):
    __tablename__ = "keystroke_events"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    key        = Column(String, nullable=False)
    down_ts    = Column(Float,  nullable=False)  # epoch seconds
    up_ts      = Column(Float,  nullable=False)
    session    = relationship("Session", back_populates="events")
