from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from database.base import Base
import uuid

class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    transcription_prompt = Column(Text, nullable=True)  # AI prompt for transcription
    summary_prompt = Column(Text, nullable=True)  # AI prompt for generating summaries
    key_points_prompt = Column(JSON, nullable=True)  # List of key points to extract
    speaker_diarization = Column(Text, nullable=True)  # Speaker identification instructions
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # NULL for default templates
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
