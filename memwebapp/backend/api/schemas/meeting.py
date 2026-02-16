from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID, uuid4
from api.models.meeting import TranscriptionStatus, AnalyticsStatus

# New schemas matching TypeScript interfaces
class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: str

class ActionItem(BaseModel):
    description: str
    owner: Optional[str] = None
    priority: Optional[str] = "medium"  # low, medium, high
    due_date: Optional[str] = None
    status: Optional[str] = "pending"  # pending, in_progress, completed

class MeetingRecordBase(BaseModel):
    title: str
    description: Optional[str] = None
    participants: Optional[List[str]] = None
    transcription: Optional[List[Any]] = None  # List of transcription segments
    summary: Optional[str] = None             # String summary (what audio service returns)
    key_points: Optional[str] = None         # String key points (what audio service returns)
    action_items: Optional[List[ActionItem]] = None  # List of action items extracted from transcription
    audio_filename: Optional[str] = None
    s3_audio_path: Optional[str] = None
    templateid: Optional[str] = None
    custom_template_points: Optional[str] = None  # Custom template points for template ID 12
    duration: Optional[int] = None

class MeetingRecordCreate(MeetingRecordBase):
    pass

class MeetingRecordUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[List[str]] = None
    transcription: Optional[List[Any]] = None
    summary: Optional[str] = None
    key_points: Optional[str] = None
    action_items: Optional[List[ActionItem]] = None
    audio_filename: Optional[str] = None
    s3_audio_path: Optional[str] = None
    templateid: Optional[str] = None
    custom_template_points: Optional[str] = None
    is_processed: Optional[bool] = None
    status: Optional[TranscriptionStatus] = None
    analytics_status: Optional[AnalyticsStatus] = None
    analytics_data: Optional[Dict[str, Any]] = None
    duration: Optional[int] = None

class MeetingRecordResponse(MeetingRecordBase):
    id: UUID
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_processed: bool
    status: TranscriptionStatus
    analytics_status: AnalyticsStatus
    analytics_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# New schemas matching TypeScript interfaces
class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: str

class AnalyticsData(BaseModel):
    meeting_id: str  # Changed from int to str to handle UUID strings
    user_email: str
    meeting_title: str
    meeting_date: str
    audio_clarity: float
    video_quality: float
    connectivity_stability: float
    latency_delay: float
    mute_unmute_usage: float
    screen_sharing_quality: float
    total_participants: int
    on_time_participants: int
    late_participants: int
    avg_duration_minutes: float
    active_participation: float
    engagement_level: float
    chat_contributions: int
    poll_responses: int
    agenda_coverage: float
    time_management: float
    action_items_defined: int
    decision_making_efficiency: float
    discussion_relevance: float
    clarity_of_communication: float
    inclusiveness: float
    team_collaboration: float
    conflict_handling: float
    cross_department_interactions: int
    professional_etiquette: float
    camera_discipline: float
    non_verbal_cues: float
    respectful_communication: float
    follow_up_ownership: float
    meeting_access_control: bool
    confidentiality_maintained: bool
    recording_compliance: bool
    data_sharing_policies: bool
    meeting_minutes_shared: bool
    action_items_tracked: bool
    feedback_collection: float
    meeting_roi: float
    extraction_timestamp: str
    transcript_length: int
    processing_duration_seconds: float
    model_used: str
    participants: List[str]
    duration_minutes: Optional[float] = None  # Made optional with default None
    transcriptions: List[TranscriptionSegment]
    sentiment: Optional[str] = None  # Meeting sentiment: positive, negative, or neutral
    sentiment_score: Optional[float] = None  # Sentiment score from 0-10
    
    # New Engagement Metrics & Audio Insights
    speaking_distribution: Optional[float] = None
    listening_quality: Optional[float] = None
    participation_balance: Optional[float] = None
    key_moments: Optional[List[str]] = None
    notable_silences: Optional[int] = None
    energy_shifts: Optional[int] = None
    speech_patterns: Optional[List[str]] = None

    class Config:
        extra = "allow"  # Allow extra fields that aren't in the model

class Meeting(BaseModel):
    model_config = ConfigDict(extra="allow")  # Pydantic v2 syntax
    
    id: UUID
    title: str
    description: str
    participants: Optional[List[str]] = None
    transcription: Optional[List[TranscriptionSegment]] = None
    summary: Optional[str] = None
    key_points: Optional[str] = None
    action_items: Optional[List[ActionItem]] = None
    audio_filename: str
    templateid: Optional[str] = None
    custom_template_points: Optional[str] = None
    user_id: int
    created_at: str
    updated_at: str
    is_processed: bool
    status: str  # 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    analytics_status: str  # 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    # Use Any type to allow any dict structure - mobile meetings may not have video fields
    analytics_data: Optional[Any] = None  # Changed from Dict[str, Any] to Any to avoid validation issues
    duration: Optional[int] = None

class CreateMeetingData(BaseModel):
    title: str
    description: str
    startTime: str
    endTime: str
    location: Optional[str] = None
    attendees: List[str]

class UpdateMeetingData(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None

class MeetingFilters(BaseModel):
    status: Optional[str] = None
    analytics_status: Optional[str] = None
    search: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    page: Optional[int] = 1
    limit: Optional[int] = 100

class PaginatedMeetingsResponse(BaseModel):
    data: List[Meeting]
    total: int
    page: int
    limit: int
    total_pages: int

class SpeakerNameUpdate(BaseModel):
    old_speaker_name: str
    new_speaker_name: str

class BulkSpeakerNameUpdate(BaseModel):
    speaker_updates: Dict[str, str]  # old_name -> new_name mapping 