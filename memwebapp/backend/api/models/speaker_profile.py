from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database.base import Base
import uuid

class SpeakerProfile(Base):
    __tablename__ = "speaker_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship with User model
    user = relationship("User", back_populates="speaker_profiles")
    
    # Unique constraint: prevent duplicate emails per user
    __table_args__ = (
        UniqueConstraint('user_id', 'email', name='uix_user_email'),
    )
    
    @property
    def full_name(self):
        """Returns the full name of the speaker"""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)

