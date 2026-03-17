from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.auth_service import get_current_user
from api.models.user import User
from api.models.meeting import MeetingRecord

router = APIRouter(tags=["recordings"])

@router.get("/recordings")
async def get_recordings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all recordings for the authenticated user, formatted for COUNCIL CRM.
    Returns:
        JSON array of recording objects (id, title, transcript, created_at)
    """
    meetings = db.query(MeetingRecord).filter(
        MeetingRecord.user_id == current_user.id
    ).order_by(MeetingRecord.created_at.desc()).all()
    
    result = []
    
    for meeting in meetings:
        # Format the transcript into a single string
        transcript_str = ""
        transcription_data = meeting.transcription
        
        if isinstance(transcription_data, list):
            segments = []
            for seg in transcription_data:
                if isinstance(seg, dict):
                    speaker = seg.get("speaker", "Unknown")
                    text = seg.get("text", "")
                    segments.append(f"{speaker}: {text}")
            transcript_str = "\n".join(segments)
        elif isinstance(transcription_data, str):
            transcript_str = transcription_data
        elif transcription_data is not None:
            transcript_str = str(transcription_data)
            
        result.append({
            "id": str(meeting.id),
            "title": meeting.title or "Untitled Recording",
            "transcript": transcript_str,
            "created_at": meeting.created_at.isoformat() if meeting.created_at else None
        })
        
    return result
