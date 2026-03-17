from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.auth_service import get_current_user
from api.models.user import User
from api.models.meeting import MeetingRecord
from api.services.chat_service import chat_service
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chatbot"])

class ChatMessage(BaseModel):
    role: str # 'user' or 'bot'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []
    meeting_id: Optional[str] = None
    is_general_query: bool = False

@router.post("")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting_context = None
    
    if request.meeting_id:
        try:
            meeting = db.query(MeetingRecord).filter(
                MeetingRecord.id == request.meeting_id,
                MeetingRecord.user_id == current_user.id
            ).first()
            
            if meeting:
                # Build context from transcription and summary
                context_parts = []
                if meeting.title:
                    context_parts.append(f"Meeting Title: {meeting.title}")
                if meeting.summary:
                    context_parts.append(f"Summary: {meeting.summary}")
                
                if meeting.analytics_data:
                    context_parts.append(f"Analytics & Performance Data:\n{json.dumps(meeting.analytics_data, indent=2)}")

                if meeting.transcription:
                    # Limit transcription size to avoid token limits for now
                    trans_text = ""
                    if isinstance(meeting.transcription, list):
                        segments = []
                        for s in meeting.transcription[:50]: # First 50 segments
                            speaker = s.get('speaker', 'Unknown')
                            text = s.get('text', '')
                            segments.append(f"{speaker}: {text}")
                        trans_text = "\n".join(segments)
                    else:
                        trans_text = str(meeting.transcription)[:2000]
                    
                    context_parts.append(f"Transcript Snippet:\n{trans_text}")
                
                meeting_context = "\n\n".join(context_parts)
        except Exception as e:
            logger.error(f"Error fetching meeting context: {e}")

    response = await chat_service.get_chat_response(
        message=request.message,
        history=request.history,
        meeting_context=meeting_context,
        is_about_app=request.is_general_query or not request.meeting_id
    )
    
    return {"response": response}
