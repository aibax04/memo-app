from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, String
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime
from api.models.meeting import MeetingRecord, TranscriptionStatus, AnalyticsStatus
from api.schemas.meeting import MeetingRecordCreate, MeetingRecordUpdate
from api.services.audio_service import AudioProcessor
from api.services.s3_service import s3_service
import os
import uuid
import logging
from fastapi import HTTPException, UploadFile
from api.services.ai_suggestion_service import ai_suggestion_service
from api.services.template_service import get_template

logger = logging.getLogger(__name__)

async def create_meeting_with_audio(
    db: Session,
    title: str,
    description: Optional[str],
    participants: Optional[List[str]],
    templateid: Optional[str],
    custom_template_points: Optional[str],
    audio_file: UploadFile,
    second_audio_file: Optional[UploadFile],
    user_id: int
) -> MeetingRecord:
    """
    Create a new meeting record with audio processing (validation, merging, upload)
    """
    audio_processor = AudioProcessor()
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Generate unique meeting UUID
    meeting_uuid = str(uuid.uuid4())
    
    transcription = None
    summary = None
    key_points = None
    
    # Save primary audio file temporarily
    primary_file_path = f"temp_audio/{audio_file.filename}"
    os.makedirs("temp_audio", exist_ok=True)
    
    logger.info(f"💾 Saving primary audio file temporarily to: {primary_file_path}")
    with open(primary_file_path, "wb") as buffer:
        content = await audio_file.read()
        buffer.write(content)
    
    primary_file_extension = audio_file.filename.split(".")[-1].lower() if "." in audio_file.filename else "unknown"
    
    # Validate primary audio file validation
    logger.info("🔍 Validating primary audio file...")
    try:
        audio_processor.validate_audio_file(primary_file_path)
    except Exception as e:
        logger.error(f"❌ Primary audio file validation failed: {e}")
        if os.path.exists(primary_file_path):
            os.remove(primary_file_path)
        raise HTTPException(status_code=400, detail=f"Invalid primary audio file: {str(e)}")
    
    # Handle secondary audio file if provided
    secondary_file_path = None
    final_audio_path = None
    
    try:
        if second_audio_file and second_audio_file.filename:
            secondary_file_path = f"temp_audio/{second_audio_file.filename}"
            
            logger.info(f"💾 Saving secondary audio file temporarily to: {secondary_file_path}")
            with open(secondary_file_path, "wb") as buffer:
                content = await second_audio_file.read()
                buffer.write(content)
            
            # Validate secondary audio file
            logger.info("🔍 Validating secondary audio file...")
            try:
                if not audio_processor.validate_secondary_audio_file(secondary_file_path):
                    raise Exception("Secondary audio file validation failed")
            except Exception as e:
                logger.error(f"❌ Secondary audio file validation failed: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid secondary audio file: {str(e)}")
            
            # Merge audio files
            logger.info("🎵 Merging primary and secondary audio files...")
            merged_filename = f"meeting_{meeting_uuid}.{primary_file_extension}"
            final_audio_path = os.path.join(uploads_dir, merged_filename)
            
            audio_processor.merge_audio_files(primary_file_path, secondary_file_path, final_audio_path)
            logger.info(f"✅ Audio files merged successfully: {final_audio_path}")
            
        else:
            # No secondary audio, just move primary audio to final location
            final_audio_path = os.path.join(uploads_dir, f"meeting_{meeting_uuid}.{primary_file_extension}")
            os.rename(primary_file_path, final_audio_path)
            logger.info(f"📁 Primary audio file moved to: {final_audio_path}")
        
        # Upload audio file to S3
        logger.info("☁️ Uploading audio file to S3...")
        s3_audio_path = s3_service.upload_audio_file(
            file_path=final_audio_path,
            meeting_uuid=meeting_uuid,
            filename=os.path.basename(final_audio_path)
        )
        
        if not s3_audio_path:
            raise HTTPException(status_code=500, detail="Failed to upload audio file to S3")
        
        logger.info(f"✅ Audio file uploaded to S3: {s3_audio_path}")
        
        # Cleanup final local file
        if os.path.exists(final_audio_path):
            os.remove(final_audio_path)
            
    except Exception as e:
        # Cleanup on error
        if os.path.exists(primary_file_path): os.remove(primary_file_path)
        if secondary_file_path and os.path.exists(secondary_file_path): os.remove(secondary_file_path)
        if final_audio_path and os.path.exists(final_audio_path): os.remove(final_audio_path)
        raise e
    
    # Finally clean up temp source files if they still exist (e.g. if merge succeeded)
    if os.path.exists(primary_file_path): os.remove(primary_file_path)
    if secondary_file_path and os.path.exists(secondary_file_path): os.remove(secondary_file_path)

    # Create meeting record
    meeting_data = MeetingRecordCreate(
        title=title,
        description=description,
        participants=participants or [],
        templateid=templateid,
        custom_template_points=custom_template_points,
        transcription=None,
        summary=None,
        key_points=None,
        audio_filename=os.path.basename(final_audio_path),
        s3_audio_path=s3_audio_path
    )
    
    return create_meeting_record(db=db, meeting=meeting_data, user_id=user_id)

def create_meeting_record(db: Session, meeting: MeetingRecordCreate, user_id: int, initial_status: Optional[TranscriptionStatus] = None) -> MeetingRecord:
    """Create a new meeting record"""
    # Determine initial status based on whether audio processing is complete
    has_audio = bool(meeting.audio_filename)
    has_processing = bool(meeting.transcription or meeting.summary or meeting.key_points)
    
    status = TranscriptionStatus.PENDING
    
    if initial_status:
        status = initial_status
    elif has_processing:
        status = TranscriptionStatus.COMPLETED
    elif has_audio:
        status = TranscriptionStatus.PENDING
    
    db_meeting = MeetingRecord(
        title=meeting.title,
        description=meeting.description,
        participants=meeting.participants,
        templateid=meeting.templateid,
        custom_template_points=meeting.custom_template_points,
        transcription=meeting.transcription,
        summary=meeting.summary,
        key_points=meeting.key_points,
        audio_filename=meeting.audio_filename,
        s3_audio_path=meeting.s3_audio_path,
        user_id=user_id,
        is_processed=has_processing,
        status=status
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def get_meeting_record(db: Session, meeting_id: UUID) -> Optional[MeetingRecord]:
    """Get a meeting record by ID"""
    return db.query(MeetingRecord).filter(MeetingRecord.id == meeting_id).first()

def get_meeting_records(db: Session, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Get all meeting records with pagination"""
    return db.query(MeetingRecord).offset(skip).limit(limit).all()

def get_meeting_records_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Get meeting records for a specific user with pagination"""
    return db.query(MeetingRecord).filter(MeetingRecord.user_id == user_id).offset(skip).limit(limit).all()

def get_meeting_record_by_user(db: Session, meeting_id: UUID, user_id: int) -> Optional[MeetingRecord]:
    """Get a meeting record by ID for a specific user"""
    return db.query(MeetingRecord).filter(
        MeetingRecord.id == meeting_id,
        MeetingRecord.user_id == user_id
    ).first()

def update_meeting_record(db: Session, meeting_id: UUID, meeting: MeetingRecordUpdate) -> Optional[MeetingRecord]:
    """Update a meeting record"""
    db_meeting = get_meeting_record(db, meeting_id)
    if not db_meeting:
        return None
    
    update_data = meeting.dict(exclude_unset=True)
    
    # Update is_processed flag and status if audio processing fields are updated
    if any(field in update_data for field in ['transcription', 'summary', 'key_points']):
        update_data['is_processed'] = True
        # If status is not explicitly set, update it based on processing completion
        if 'status' not in update_data:
            update_data['status'] = TranscriptionStatus.COMPLETED
    
    for field, value in update_data.items():
        setattr(db_meeting, field, value)
    
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def delete_meeting_record(db: Session, meeting_id: UUID) -> bool:
    """Delete a meeting record"""
    db_meeting = get_meeting_record(db, meeting_id)
    if not db_meeting:
        return False
    
    db.delete(db_meeting)
    db.commit()
    return True

def search_meeting_records(db: Session, query: str, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Search meeting records by title, participants, and transcription speaker names"""
    search_term = f"%{query}%"
    return db.query(MeetingRecord).filter(
        or_(
            MeetingRecord.title.ilike(search_term),
            MeetingRecord.participants.cast(String).ilike(search_term),
            MeetingRecord.transcription.cast(String).ilike(search_term)
        )
    ).offset(skip).limit(limit).all()

def search_meeting_records_by_user(db: Session, user_id: int, query: str, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Search meeting records by title, participants, and transcription speaker names for a specific user"""
    search_term = f"%{query}%"
    return db.query(MeetingRecord).filter(
        MeetingRecord.user_id == user_id,
        or_(
            MeetingRecord.title.ilike(search_term),
            MeetingRecord.participants.cast(String).ilike(search_term),
            MeetingRecord.transcription.cast(String).ilike(search_term)
        )
    ).offset(skip).limit(limit).all()

def get_meetings_by_date_range(db: Session, start_date: str, end_date: str, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Get meeting records within a date range"""
    return db.query(MeetingRecord).filter(
        MeetingRecord.created_at >= start_date,
        MeetingRecord.created_at <= end_date
    ).offset(skip).limit(limit).all()

def get_meetings_by_date_range_for_user(db: Session, user_id: int, start_date: str, end_date: str, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Get meeting records within a date range for a specific user"""
    return db.query(MeetingRecord).filter(
        MeetingRecord.user_id == user_id,
        MeetingRecord.created_at >= start_date,
        MeetingRecord.created_at <= end_date
    ).offset(skip).limit(limit).all()

def get_meetings_by_status(db: Session, status: TranscriptionStatus, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Get meeting records by transcription status"""
    return db.query(MeetingRecord).filter(
        MeetingRecord.status == status
    ).offset(skip).limit(limit).all()

def get_meetings_by_status_for_user(db: Session, user_id: int, status: TranscriptionStatus, skip: int = 0, limit: int = 100) -> List[MeetingRecord]:
    """Get meeting records by transcription status for a specific user"""
    return db.query(MeetingRecord).filter(
        MeetingRecord.user_id == user_id,
        MeetingRecord.status == status
    ).offset(skip).limit(limit).all()

def get_pending_meetings_with_audio(db: Session) -> List[MeetingRecord]:
    """Get all meetings with pending status that have audio files"""
    return db.query(MeetingRecord).filter(
        MeetingRecord.status == TranscriptionStatus.PENDING,
        MeetingRecord.audio_filename.isnot(None),
        MeetingRecord.audio_filename != ""
    ).all()

def update_meeting_status(db: Session, meeting_id: UUID, status: TranscriptionStatus) -> Optional[MeetingRecord]:
    """Update meeting transcription status"""
    db_meeting = get_meeting_record(db, meeting_id)
    if not db_meeting:
        return None
    
    db_meeting.status = status
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def get_meetings_with_filters(
    db: Session, 
    user_id: int, 
    status: Optional[str] = None,
    analytics_status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[MeetingRecord], int]:
    """Get meetings with comprehensive filtering and return total count"""
    query = db.query(MeetingRecord).filter(MeetingRecord.user_id == user_id)
    
    # Apply status filter
    if status:
        try:
            status_enum = TranscriptionStatus(status.upper())
            query = query.filter(MeetingRecord.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter
    
    # Apply analytics status filter
    if analytics_status:
        try:
            analytics_status_enum = AnalyticsStatus(analytics_status.upper())
            query = query.filter(MeetingRecord.analytics_status == analytics_status_enum)
        except ValueError:
            pass  # Invalid analytics status, ignore filter
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                MeetingRecord.title.ilike(search_term),
                MeetingRecord.participants.cast(String).ilike(search_term),
                MeetingRecord.transcription.cast(String).ilike(search_term)
            )
        )
    
    # Apply date range filter
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(MeetingRecord.created_at >= date_from_dt)
        except ValueError:
            pass  # Invalid date format, ignore filter
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(MeetingRecord.created_at <= date_to_dt)
        except ValueError:
            pass  # Invalid date format, ignore filter
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    meetings = query.order_by(MeetingRecord.created_at.desc()).offset(skip).limit(limit).all()
    
    return meetings, total


def convert_meeting_to_response_format(meeting: MeetingRecord, include_details: bool = True) -> dict:
    """Convert MeetingRecord to the new Meeting response format"""
    # Handle participants as list (now stored as JSON in database)
    participants_list = []
    if meeting.participants:
        if isinstance(meeting.participants, list):
            # Already a list (new format)
            participants_list = meeting.participants
        elif isinstance(meeting.participants, str):
            # Legacy string format - parse it
            try:
                import json
                participants_list = json.loads(meeting.participants)
            except (json.JSONDecodeError, TypeError):
                # If not JSON, split by comma
                participants_list = [p.strip() for p in meeting.participants.split(',') if p.strip()]
    # If participants is None or empty, ensure we return an empty list
    if not participants_list:
        participants_list = []
    
    # Parse action items if they exist
    action_items_list = []
    if meeting.action_items:
        try:
            import json
            if isinstance(meeting.action_items, list):
                action_items_list = meeting.action_items
            elif isinstance(meeting.action_items, str):
                action_items_list = json.loads(meeting.action_items)
        except (json.JSONDecodeError, TypeError):
            action_items_list = []

    response = {
        "id": meeting.id,  # Convert UUID to int-like ID
        "title": meeting.title,
        "description": meeting.description or "",
        "participants": participants_list,
        "action_items": action_items_list,
        "audio_filename": meeting.audio_filename or "",
        "templateid": meeting.templateid,
        "custom_template_points": meeting.custom_template_points,
        "user_id": meeting.user_id,
        "created_at": meeting.created_at.isoformat() if meeting.created_at else "",
        "updated_at": meeting.updated_at.isoformat() if meeting.updated_at else "",
        "is_processed": meeting.is_processed,
        "status": meeting.status.value if meeting.status else "PENDING",
        "analytics_status": meeting.analytics_status.value if meeting.analytics_status else "PENDING",
        "duration": meeting.duration,
    }

    if include_details:
        # Parse transcription if it exists
        transcription_segments = []
        if meeting.transcription:
            try:
                import json
                if isinstance(meeting.transcription, list):
                    transcription_segments = meeting.transcription
                elif isinstance(meeting.transcription, str):
                    transcription_segments = json.loads(meeting.transcription)
            except (json.JSONDecodeError, TypeError):
                transcription_segments = []
        
        # Parse analytics data if it exists
        import logging
        logger = logging.getLogger(__name__)
        analytics_data = None
        if meeting.analytics_data:
            try:
                import json
                
                if isinstance(meeting.analytics_data, dict):
                    analytics_data = meeting.analytics_data
                elif isinstance(meeting.analytics_data, str):
                    analytics_data = json.loads(meeting.analytics_data)
                
            except (json.JSONDecodeError, TypeError) as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"❌ [Response] Error parsing analytics_data: {e}")
                analytics_data = None
        
        response.update({
            "transcription": transcription_segments,
            "summary": meeting.summary,
            "key_points": meeting.key_points,
            "analytics_data": analytics_data
        })
    else:
        # Include fields as None or empty if needed for strict schema, 
        # or omit them if the schema allows optional fields.
        # The schema has Optional[] = None for these, so omitting them (or sending None) is fine.
        # But if the FE expects the keys to limit "undefined" checks, let's include them as None/Empty.
        # User said "do not share", so sending None is safer than omitting if schema requires keys.
        response.update({
            "transcription": None,
            "summary": None,
            "key_points": None,
            "analytics_data": None
        })
    
    return response


def get_unique_speakers(db: Session, user_id: int) -> List[dict]:
    """Get all unique speakers across user's meetings with meeting count"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🔍 [Speakers] Getting unique speakers for user_id: {user_id}")
    meetings = db.query(MeetingRecord).filter(MeetingRecord.user_id == user_id).all()
    logger.info(f"🔍 [Speakers] Found {len(meetings)} total meetings for user")
    
    speaker_counts = {}
    meetings_with_transcription = 0
    meetings_without_transcription = 0
    meetings_with_speakers = 0
    meetings_without_speakers = 0
    
    for meeting in meetings:
        if not meeting.transcription:
            meetings_without_transcription += 1
            logger.debug(f"🔍 [Speakers] Meeting {meeting.id} has no transcription")
            continue
        
        meetings_with_transcription += 1
        
        # Parse transcription
        transcription_segments = []
        try:
            import json
            if isinstance(meeting.transcription, list):
                transcription_segments = meeting.transcription
                logger.debug(f"🔍 [Speakers] Meeting {meeting.id}: transcription is a list with {len(transcription_segments)} segments")
            elif isinstance(meeting.transcription, str):
                transcription_segments = json.loads(meeting.transcription)
                logger.debug(f"🔍 [Speakers] Meeting {meeting.id}: transcription is a string, parsed to {len(transcription_segments)} segments")
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"⚠️ [Speakers] Meeting {meeting.id}: Failed to parse transcription: {e}")
            continue
        
        if not transcription_segments:
            logger.debug(f"🔍 [Speakers] Meeting {meeting.id}: No transcription segments after parsing")
            continue
        
        # Extract unique speakers from transcription
        speakers_in_meeting = set()
        segments_with_speaker = 0
        segments_without_speaker = 0
        
        for segment in transcription_segments:
            if isinstance(segment, dict):
                if 'speaker' in segment:
                    speaker_name = segment['speaker']
                    if speaker_name:
                        speakers_in_meeting.add(speaker_name)
                        segments_with_speaker += 1
                    else:
                        segments_without_speaker += 1
                else:
                    segments_without_speaker += 1
                    logger.debug(f"🔍 [Speakers] Meeting {meeting.id}: Segment missing 'speaker' field: {segment}")
            else:
                logger.debug(f"🔍 [Speakers] Meeting {meeting.id}: Segment is not a dict: {type(segment)}")
        
        logger.info(f"🔍 [Speakers] Meeting {meeting.id}: Found {len(speakers_in_meeting)} unique speakers ({segments_with_speaker} segments with speaker, {segments_without_speaker} without)")
        
        if speakers_in_meeting:
            meetings_with_speakers += 1
            logger.info(f"✅ [Speakers] Meeting {meeting.id}: Speakers found: {list(speakers_in_meeting)}")
        else:
            meetings_without_speakers += 1
            logger.warning(f"⚠️ [Speakers] Meeting {meeting.id}: No speakers found in transcription segments")
            # Log first few segments for debugging
            if transcription_segments:
                logger.debug(f"🔍 [Speakers] Meeting {meeting.id}: First segment sample: {transcription_segments[0]}")
        
        # Count meetings per speaker
        for speaker in speakers_in_meeting:
            if speaker not in speaker_counts:
                speaker_counts[speaker] = 0
            speaker_counts[speaker] += 1
    
    logger.info(f"📊 [Speakers] Summary:")
    logger.info(f"  - Total meetings: {len(meetings)}")
    logger.info(f"  - Meetings with transcription: {meetings_with_transcription}")
    logger.info(f"  - Meetings without transcription: {meetings_without_transcription}")
    logger.info(f"  - Meetings with speakers: {meetings_with_speakers}")
    logger.info(f"  - Meetings without speakers: {meetings_without_speakers}")
    logger.info(f"  - Total unique speakers found: {len(speaker_counts)}")
    logger.info(f"  - Speaker counts: {speaker_counts}")
    
    # Get speaker profiles for enrichment
    from api.models.speaker_profile import SpeakerProfile
    speaker_profiles = db.query(SpeakerProfile).filter(SpeakerProfile.user_id == user_id).all()
    
    # Create a mapping of full names to profiles (use most recent if duplicates)
    profile_map = {}
    for profile in speaker_profiles:
        if profile.full_name in profile_map:
            logger.warning(f"⚠️ [Speakers] Duplicate profile name '{profile.full_name}' - using most recent (ID: {profile.id})")
        profile_map[profile.full_name] = profile
        logger.info(f"🔍 [Speakers] Profile mapping: '{profile.full_name}' -> ID {profile.id}")
    
    logger.info(f"🔍 [Speakers] Found {len(speaker_profiles)} speaker profiles for enrichment")
    logger.info(f"🔍 [Speakers] Profile map keys: {list(profile_map.keys())}")
    logger.info(f"🔍 [Speakers] Speaker names to match: {list(speaker_counts.keys())}")
    
    # Convert to list of dicts with profile information
    speakers_list = []
    for speaker, count in sorted(speaker_counts.items()):
        speaker_data = {
            'speaker_name': speaker,
            'meeting_count': count,
            'profile': None
        }
        
        # Check if this speaker has a profile
        logger.info(f"🔍 [Speakers] Checking speaker '{speaker}' against profile map...")
        if speaker in profile_map:
            profile = profile_map[speaker]
            speaker_data['profile'] = {
                'id': str(profile.id),
                'first_name': profile.first_name,
                'middle_name': profile.middle_name,
                'last_name': profile.last_name,
                'full_name': profile.full_name,
                'email': profile.email,
                'phone': profile.phone,
                'company': profile.company,
                'designation': profile.designation
            }
            logger.info(f"✅ [Speakers] Enriched speaker '{speaker}' with profile data: {profile.email}, {profile.company}, {profile.designation}")
        else:
            logger.info(f"❌ [Speakers] No profile found for speaker '{speaker}'")
        
        speakers_list.append(speaker_data)
    
    logger.info(f"✅ [Speakers] Returning {len(speakers_list)} speakers with profile enrichment")
    return speakers_list


def search_meetings_by_speaker(
    db: Session,
    user_id: int,
    speaker_name: str,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[MeetingRecord], int]:
    """Search meetings by speaker name and return total count"""
    meetings = db.query(MeetingRecord).filter(MeetingRecord.user_id == user_id).all()
    
    matching_meetings = []
    
    for meeting in meetings:
        if not meeting.transcription:
            continue
        
        # Parse transcription
        transcription_segments = []
        try:
            import json
            if isinstance(meeting.transcription, list):
                transcription_segments = meeting.transcription
            elif isinstance(meeting.transcription, str):
                transcription_segments = json.loads(meeting.transcription)
        except (json.JSONDecodeError, TypeError):
            continue
        
        # Check if speaker appears in transcription
        speaker_found = False
        for segment in transcription_segments:
            if isinstance(segment, dict) and 'speaker' in segment:
                if segment['speaker'] == speaker_name:
                    speaker_found = True
                    break
        
        if speaker_found:
            matching_meetings.append(meeting)
    
    # Sort by created_at descending
    matching_meetings.sort(key=lambda m: m.created_at, reverse=True)
    
    # Get total count
    total = len(matching_meetings)
    
    # Apply pagination
    paginated_meetings = matching_meetings[skip:skip + limit]
    
    return paginated_meetings, total

def finalize_meeting_recording(db: Session, meeting_id: UUID) -> Optional[MeetingRecord]:
    """
    Finalize a meeting recording:
    1. Stitch audio chunks
    2. Upload to S3
    3. Suggest template/description if missing
    4. Update meeting status to PENDING
    """
    logger.info(f"🎬 Finalizing meeting {meeting_id}...")
    
    meeting = get_meeting_record(db, meeting_id)
    if not meeting:
        logger.error(f"Meeting {meeting_id} not found")
        return None
        
    audio_processor = AudioProcessor()
    
    # 1. Stitch chunks
    # Note: meeting.id is UUID, but file system uses string representation
    meeting_id_str = str(meeting_id)
    
    # Check if final file already exists (Idempotency)
    base_dir = os.path.abspath("temp_audio")
    existing_wav = os.path.join(base_dir, f"meeting_{meeting_id_str}.wav")
    existing_webm = os.path.join(base_dir, f"meeting_{meeting_id_str}.webm")
    
    final_audio_path = None
    if os.path.exists(existing_wav):
        final_audio_path = existing_wav
        logger.info(f"🎬 Found existing final audio (skipping stitch): {final_audio_path}")
    elif os.path.exists(existing_webm):
        final_audio_path = existing_webm
        logger.info(f"🎬 Found existing final audio (skipping stitch): {final_audio_path}")
    else:
        final_audio_path = audio_processor.stitch_audio_chunks_v3(meeting_id_str)
    
    if not final_audio_path:
        logger.warning(f"No audio chunks found for {meeting_id}")
        # If no audio, should we move to COMPLETED (empty) or FAILED?
        # Maybe leave as is or mark FAILED?
        # If we return None, the caller can decide.
        return None

    # 2. Upload to S3
    logger.info(f"☁️ Uploading audio to S3...")
    s3_audio_path = s3_service.upload_audio_file(
        file_path=final_audio_path,
        meeting_uuid=meeting_id_str, # Use meeting ID for S3 folder
        filename=os.path.basename(final_audio_path)
    )
    
    if not s3_audio_path:
        logger.warning("Failed to upload to S3 - Fallback to local storage")
        # Fallback: Use local file path since S3 failed
        # We'll recognize it's local because it will be an absolute path
        s3_audio_path = final_audio_path
    
    # EARLY STATUS UPDATE: Set to PENDING so watchdog can pick it up even if AI suggestions fail/hang
    meeting.s3_audio_path = s3_audio_path
    meeting.audio_filename = os.path.basename(final_audio_path)
    meeting.status = TranscriptionStatus.PENDING
    meeting.analytics_status = AnalyticsStatus.PENDING
    try:
        db.commit()
        logger.info(f"✅ Updated meeting {meeting_id} status to PENDING (Ready for processing)")
    except Exception as e:
        logger.error(f"Failed to update meeting status: {e}")
        # Continue if possible, though strict consistency might require return
    
    # 3. AI Suggestions (Template/Description)
    update_data = {}
    
    # Suggest template if missing
    if not meeting.templateid:
        try:
            logger.info("🤖 Attempting AI template suggestion...")
            suggestion = ai_suggestion_service.suggest_template_with_db(final_audio_path, db=db)
            if suggestion and suggestion.get("suggested_template_id"):
                update_data["templateid"] = suggestion["suggested_template_id"]
                logger.info(f"✅ AI suggested template: {update_data['templateid']}")
        except Exception as e:
            logger.warning(f"Failed to suggest template: {e}") 

    # Suggest description if missing
    if not meeting.description:
        try:
            logger.info("🤖 Attempting AI description suggestion...")
            suggested_desc = ai_suggestion_service.suggest_meeting_description(final_audio_path)
            if suggested_desc:
                update_data["description"] = suggested_desc
                logger.info("✅ AI suggested description")
        except Exception as e:
            logger.warning(f"Failed to suggest description: {e}")

    # Suggest title if missing, default, or automated by extension
    title_lower = meeting.title.lower() if meeting.title else ""
    if not meeting.title or title_lower.strip() == "" or title_lower == "untitled meeting" or "google meet:" in title_lower or "microsoft teams:" in title_lower or "teams:" in title_lower or "zoom:" in title_lower:
        try:
            logger.info("🤖 Attempting AI title suggestion...")
            suggested_title = ai_suggestion_service.suggest_meeting_title(final_audio_path)
            if suggested_title:
                update_data["title"] = suggested_title
                logger.info(f"✅ AI suggested title: {suggested_title}")
        except Exception as e:
            logger.warning(f"Failed to suggest title: {e}")

    # 4. Update Meeting Record (AI Suggestions only)
    if update_data:
        logger.info(f"🔄 Updating meeting {meeting_id} with AI suggestions...")
        
        for field, value in update_data.items():
            setattr(meeting, field, value)
            
        try:
            db.commit()
            db.refresh(meeting)
        except Exception as e:
            logger.error(f"Failed to save AI suggestions: {e}")
            
    return meeting 

def finalize_meeting_background_execution(meeting_id: UUID):
    """
    Wrapper for finalizing meeting in a background task with its own DB session.
    """
    from database.connection import SessionLocal
    import traceback
    
    logger.info(f"🚀 Starting background finalization for meeting {meeting_id}")
    db = SessionLocal()
    try:
        result = finalize_meeting_recording(db, meeting_id)
        if result:
            logger.info(f"✅ Background finalization completed for meeting {meeting_id}")
        else:
            logger.error(f"❌ Background finalization returned None for meeting {meeting_id}")
    except Exception as e:
        logger.error(f"❌ Error in background finalization for meeting {meeting_id}: {e}")
        traceback.print_exc()
    finally:
        db.close()