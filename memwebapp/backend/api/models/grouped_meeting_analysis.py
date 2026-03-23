"""Persisted multi-meeting AI analysis (Pro)."""
import uuid

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database.base import Base


class GroupedMeetingAnalysis(Base):
    __tablename__ = "grouped_meeting_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    meeting_ids = Column(JSON, nullable=False)  # list of string UUIDs
    analysis = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="grouped_meeting_analyses")
