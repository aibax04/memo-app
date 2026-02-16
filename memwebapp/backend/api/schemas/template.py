from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class TemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    transcription_prompt: Optional[str] = None
    summary_prompt: Optional[str] = None
    key_points_prompt: Optional[List[str]] = None
    speaker_diarization: Optional[str] = None

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    transcription_prompt: Optional[str] = None
    summary_prompt: Optional[str] = None
    key_points_prompt: Optional[List[str]] = None
    speaker_diarization: Optional[str] = None
    is_active: Optional[bool] = None

class TemplateResponse(TemplateBase):
    id: UUID
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    key_points: Optional[List[str]] = None

    class Config:
        from_attributes = True

class TemplateListResponse(BaseModel):
    data: list[TemplateResponse]
    total: int
    page: int
    limit: int
    total_pages: int
