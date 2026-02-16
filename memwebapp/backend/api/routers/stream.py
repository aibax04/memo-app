from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from api.services.auth_service import get_current_user
from database.connection import get_db
from api.models.user import User
from api.models.meeting import MeetingRecord, TranscriptionStatus
from api.services.meeting_service import finalize_meeting_recording, get_meeting_record, create_meeting_record, convert_meeting_to_response_format
from api.schemas.meeting import MeetingRecordCreate, MeetingRecordResponse
import os
import logging
from uuid import UUID
from datetime import datetime, timezone
import aiofiles

router = APIRouter(prefix="/stream", tags=["stream"])
logger = logging.getLogger(__name__)

@router.post("/init", response_model=MeetingRecordResponse)
def init_meeting_recording(
    meeting: MeetingRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize a new meeting recording session.
    Returns the created meeting record with ID.
    """
    # Create meeting with RECORDING status
    db_meeting = create_meeting_record(
        db=db,
        meeting=meeting,
        user_id=current_user.id,
        initial_status=TranscriptionStatus.RECORDING
    )
    
    return convert_meeting_to_response_format(db_meeting)

@router.post("/chunk/{meeting_id}")
async def upload_audio_chunk(
    meeting_id: UUID,
    mic_audio: UploadFile = File(None),
    tab_audio: UploadFile = File(None),
    timestamp: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload audio chunks for a meeting (Mic and/or Tab).
    Accepts multipart/form-data.
    """
    try:
        meeting = get_meeting_record(db, meeting_id)
        if not meeting:
            logger.warning(f"Meeting {meeting_id} not found during chunk upload")
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        if meeting.user_id != current_user.id:
            logger.warning(f"User {current_user.id} unauthorized for meeting {meeting_id}")
            raise HTTPException(status_code=403, detail="Not authorized")
            
        if meeting.status != TranscriptionStatus.RECORDING:
            logger.warning(f"Received chunk for meeting {meeting_id} with status {meeting.status}")
            # We enforce recording state strictly
            raise HTTPException(status_code=400, detail=f"Meeting is not in RECORDING state (state: {meeting.status})")

        # Directory: temp_audio/{meeting_uuid}
        temp_dir = os.path.join("temp_audio", str(meeting_id))
        abs_temp_dir = os.path.abspath(temp_dir)
        os.makedirs(abs_temp_dir, exist_ok=True)
        
        logger.info(f"Stream: processing chunk for {meeting_id}, ts={timestamp}. Mic={'Yes' if mic_audio else 'No'}, Tab={'Yes' if tab_audio else 'No'}")
        
        # APPEND-ONLY STORAGE LOGIC
        # We append directly to a single file per stream to maintain WebM continuity
        # This relies on the client sending chunks sequentially (which it does via await fetch)
        
        # 1. Handle Mic Stream
        if mic_audio:
            mic_stream_path = os.path.join(abs_temp_dir, "mic_recording.webm")
            # Read all content first
            content = await mic_audio.read()
            
            # Check for EBML header if new file 
            if not os.path.exists(mic_stream_path):
                if len(content) > 4 and content[:4] == b'\x1A\x45\xDF\xA3':
                    logger.info(f"Stream: New Mic recording started with valid EBML header")
                elif len(content) > 4 and content[:4] == b'RIFF':
                     logger.info(f"Stream: New Mic recording started with valid WAV (RIFF) header")
                else:
                    logger.warning(f"Stream: New Mic recording started BUT missing EBML/RIFF header! Hex: {content[:4].hex() if len(content)>4 else 'too short'}")
            
            # Append mode
            async with aiofiles.open(mic_stream_path, "ab") as f:
                await f.write(content)
            logger.info(f"Stream: Appended {len(content)} bytes to {mic_stream_path}")
                
        # 2. Handle Tab Stream
        if tab_audio:
            tab_stream_path = os.path.join(abs_temp_dir, "tab_recording.webm")
            content = await tab_audio.read()
            
            if not os.path.exists(tab_stream_path):
                if len(content) > 4 and content[:4] == b'\x1A\x45\xDF\xA3':
                    logger.info(f"Stream: New Tab recording started with valid EBML header")
                elif len(content) > 4 and content[:4] == b'RIFF':
                     logger.info(f"Stream: New Tab recording started with valid WAV (RIFF) header")
                else:
                    logger.warning(f"Stream: New Tab recording started BUT missing EBML/RIFF header!")

            async with aiofiles.open(tab_stream_path, "ab") as f:
                await f.write(content)
            logger.info(f"Stream: Appended {len(content)} bytes to {tab_stream_path}")
            
        # Update timestamp to keep watchdog happy
        meeting.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        return {"status": "success", "timestamp": timestamp}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error uploading chunk: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/finalize/{meeting_id}")
async def finalize_stream(
    meeting_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finalize a meeting stream (triggered when recording stops).
    Initiates background processing (stitching, S3 upload, AI suggestions)
    and returns immediately.
    """
    try:
        meeting = get_meeting_record(db, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        if meeting.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        logger.info(f"Initiating background finalization for meeting {meeting_id}...")
        
        # Add to background tasks
        from api.services.meeting_service import finalize_meeting_background_execution
        background_tasks.add_task(finalize_meeting_background_execution, meeting_id)
        
        return {
            "status": "processing_started", 
            "meeting_id": str(meeting.id),
            "message": "Finalization started in background"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error initiating finalize stream: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
