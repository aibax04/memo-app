from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, Integer, ForeignKey, Enum, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database.base import Base
import enum
import uuid

class TranscriptionStatus(enum.Enum):
    RECORDING = "RECORDING"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class AnalyticsStatus(enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class MeetingRecord(Base):
    __tablename__ = "meeting_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    participants = Column(JSON, nullable=True)  # List of participant names
    transcription = Column(JSON, nullable=True)  # List of transcription segments
    summary = Column(Text, nullable=True)        # String summary (what audio service returns)
    key_points = Column(Text, nullable=True)     # String key points (what audio service returns)
    action_items = Column(JSON, nullable=True)    # List of action items extracted from transcription
    audio_filename = Column(String, nullable=True)  # Local filename (for backward compatibility)
    s3_audio_path = Column(String, nullable=True)   # S3 path for audio file
    templateid = Column(String, nullable=True)
    custom_template_points = Column(Text, nullable=True)  # Custom template points for template ID 12
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_processed = Column(Boolean, default=False)
    status = Column(Enum(TranscriptionStatus), default=TranscriptionStatus.PENDING, nullable=False, index=True)
    duration = Column(Integer, nullable=True)  # Duration in minutes
    
    # Analytics fields
    analytics_status = Column(Enum(AnalyticsStatus), default=AnalyticsStatus.PENDING, nullable=False, index=True)
    analytics_data = Column(JSON, nullable=True)  # Store comprehensive analytics as JSON
    
    # Relationship with User model
    user = relationship("User", back_populates="meetings") 