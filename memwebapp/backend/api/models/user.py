from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    auth_provider = Column(String, default="microsoft")  # "microsoft" or "google" or "local"
    password_hash = Column(String, nullable=True)  # For local auth
    
    # Relationship with MeetingRecord model
    meetings = relationship("MeetingRecord", back_populates="user")
    
    # Relationship with SpeakerProfile model
    speaker_profiles = relationship("SpeakerProfile", back_populates="user")
    
    # Relationship with Dashboard
    dashboards = relationship("Dashboard", back_populates="user", cascade="all, delete-orphan")