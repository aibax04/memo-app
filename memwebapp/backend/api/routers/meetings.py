from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database.connection import get_db
from api.services.auth_service import get_current_user
from api.models.user import User
from api.models.meeting import MeetingRecord, TranscriptionStatus
from api.schemas.meeting import MeetingRecordResponse, MeetingRecordUpdate, MeetingRecordCreate, PaginatedMeetingsResponse, SpeakerNameUpdate, SpeakerMergeUpdate
from api.services import meeting_service
from api.services.ai_suggestion_service import ai_suggestion_service
from api.services.s3_service import s3_service
from api.services.audio_service import AudioProcessor
import logging
import uuid
import os

# Set up logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

# Initialize dependencies
audio_processor = AudioProcessor()

router = APIRouter(prefix="/meetings", tags=["meetings"])
@router.post("/suggest-template")
async def suggest_template_for_audio(
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze audio and suggest the best template for processing.
    This is a lightweight analysis that only processes a sample of the audio.
    """
    import time
    start_time = time.time()
    temp_audio_path = None
    
    try:
        logger.info("🎯 TEMPLATE SUGGESTION REQUEST")
        logger.info(f"👤 User: {current_user.name} ({current_user.email})")
        logger.info(f"🎵 Audio File: '{audio_file.filename}' (Content-Type: {audio_file.content_type})")
        
        # Read audio file content
        audio_content = await audio_file.read()
        file_size = len(audio_content)
        
        logger.info(f"📊 Audio file size: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        
        # Validate file size
        if file_size < 1024:  # Less than 1KB
            raise HTTPException(
                status_code=400,
                detail="Audio file too small. Recording may have failed."
            )
        
        if file_size > 100 * 1024 * 1024:  # 100MB limit for suggestion
            raise HTTPException(
                status_code=400,
                detail="Audio file too large for quick analysis. Maximum 100MB."
            )
        
        # Create temporary file for audio processing
        import tempfile
        temp_audio_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=os.path.splitext(audio_file.filename)[1]
        )
        temp_audio_file.write(audio_content)
        temp_audio_file.flush()
        temp_audio_file.close()
        temp_audio_path = temp_audio_file.name
        
        logger.info(f"💾 Saved audio to temporary file: {temp_audio_path}")
        logger.info("🤖 Starting AI template suggestion...")
        
        # Get template suggestion from AI service
        suggestion_start = time.time()
        suggestion = ai_suggestion_service.suggest_template(temp_audio_path)
        logger.info(type(suggestion))
        suggestion_duration = time.time() - suggestion_start
        
        if not suggestion:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate template suggestion. Please try again."
            )
        
        total_duration = time.time() - start_time
        logger.info(f"✅ Template suggestion generated successfully")
        logger.info(f"📝 Suggested: {suggestion['suggested_template_name']} (Confidence: {suggestion['confidence']})")
        logger.info(f"💡 Reason: {suggestion.get('reason', 'N/A')}")
        logger.info(f"⏱️  AI processing took: {suggestion_duration:.2f}s, Total: {total_duration:.2f}s")
        
        return suggestion
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating template suggestion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating template suggestion: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
                logger.info(f"🗑️  Cleaned up temporary file: {temp_audio_path}")
            except Exception as e:
                logger.warning(f"⚠️  Failed to clean up temporary file: {e}")


@router.post("/suggest-title")
async def suggest_title_for_audio(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze audio and suggest a meeting title.
    """
    import time
    start_time = time.time()
    temp_audio_path = None
    
    try:
        logger.info("📝 TITLE SUGGESTION REQUEST")
        logger.info(f"👤 User: {current_user.name} ({current_user.email})")
        logger.info(f"🎵 Audio File: '{audio_file.filename}' (Content-Type: {audio_file.content_type})")
        
        # Read audio file content
        audio_content = await audio_file.read()
        file_size = len(audio_content)
        
        logger.info(f"📊 Audio file size: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        
        # Validate file size (max 100MB)
        if file_size > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Audio file too large. Maximum size is 100MB."
            )
        
        # Create temporary file
        import tempfile
        temp_audio_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=os.path.splitext(audio_file.filename)[1]
        )
        temp_audio_file.write(audio_content)
        temp_audio_file.flush()
        temp_audio_file.close()
        temp_audio_path = temp_audio_file.name
        
        logger.info(f"💾 Saved audio to temporary file: {temp_audio_path}")
        logger.info("🤖 Starting AI title suggestion...")
        
        # Get title suggestion (with built-in retries)
        suggestion_start = time.time()
        suggested_title = ai_suggestion_service.suggest_meeting_title(temp_audio_path)
        suggestion_duration = time.time() - suggestion_start
        
        if not suggested_title:
            raise HTTPException(
                status_code=500,
                detail="AI service returned empty result. Please try again."
            )
        
        total_duration = time.time() - start_time
        logger.info(f"✅ Title suggested: '{suggested_title}'")
        logger.info(f"⏱️  AI processing took: {suggestion_duration:.2f}s, Total: {total_duration:.2f}s")
        
        return {"suggested_title": suggested_title}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error generating title suggestion: {error_msg}")
        
        # Provide user-friendly error messages
        if "Gemini" in error_msg or "API" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable. Please try again in a moment."
            )
        elif "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=504,
                detail="Request timed out. Please try with a shorter audio file."
            )
        elif "file" in error_msg.lower() or "audio" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Invalid audio file format. Please use M4A, WAV, or MP3."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Unable to generate suggestion: {error_msg}"
            )
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass


@router.post("/suggest-description")
async def suggest_description_for_audio(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze audio and suggest a meeting description.
    """
    import time
    start_time = time.time()
    temp_audio_path = None
    
    try:
        logger.info("📄 DESCRIPTION SUGGESTION REQUEST")
        logger.info(f"👤 User: {current_user.name} ({current_user.email})")
        logger.info(f"🎵 Audio File: '{audio_file.filename}' (Content-Type: {audio_file.content_type})")
        
        # Read audio file content
        audio_content = await audio_file.read()
        file_size = len(audio_content)
        
        logger.info(f"📊 Audio file size: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        
        # Validate file size (max 100MB)
        if file_size > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Audio file too large. Maximum size is 100MB."
            )
        
        # Create temporary file
        import tempfile
        temp_audio_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=os.path.splitext(audio_file.filename)[1]
        )
        temp_audio_file.write(audio_content)
        temp_audio_file.flush()
        temp_audio_file.close()
        temp_audio_path = temp_audio_file.name
        
        logger.info(f"💾 Saved audio to temporary file: {temp_audio_path}")
        logger.info("🤖 Starting AI description suggestion...")
        
        # Get description suggestion (with built-in retries)
        suggestion_start = time.time()
        suggested_description = ai_suggestion_service.suggest_meeting_description(temp_audio_path)
        suggestion_duration = time.time() - suggestion_start
        
        if not suggested_description:
            raise HTTPException(
                status_code=500,
                detail="AI service returned empty result. Please try again."
            )
        
        total_duration = time.time() - start_time
        description_preview = suggested_description[:100] + "..." if len(suggested_description) > 100 else suggested_description
        logger.info(f"✅ Description suggested: '{description_preview}'")
        logger.info(f"⏱️  AI processing took: {suggestion_duration:.2f}s, Total: {total_duration:.2f}s")
        
        return {"suggested_description": suggested_description}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error generating description suggestion: {error_msg}")
        
        # Provide user-friendly error messages
        if "Gemini" in error_msg or "API" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable. Please try again in a moment."
            )
        elif "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=504,
                detail="Request timed out. Please try with a shorter audio file."
            )
        elif "file" in error_msg.lower() or "audio" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Invalid audio file format. Please use M4A, WAV, or MP3."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Unable to generate suggestion: {error_msg}"
            )
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass


from api.models.pro_subscription import ProSubscription

@router.post("/", response_model=MeetingRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    participants: Optional[str] = Form(None),
    templateid: Optional[str] = Query(None),
    custom_template_points: Optional[str] = Form(None),
    audio_file: UploadFile = File(...),
    second_audio_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new meeting record with mobile mic audio processing
    """
    try:
        # Check pro subscription
        pro_sub = db.query(ProSubscription).filter(
            ProSubscription.user_id == current_user.id,
            ProSubscription.is_active == True
        ).first()

        user_meetings_count = db.query(MeetingRecord).filter(MeetingRecord.user_id == current_user.id).count()
        if not pro_sub and user_meetings_count >= 10:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You have reached the maximum allowed 10 recordings for your trial period. Please contact support to unlock more recordings."
            )

        logger.info("📋 REQUEST FORM DATA DEBUG:")
        logger.info(f"   Title form data: {repr(title)}")
        logger.info(f"   Description form data: {repr(description)}")
        logger.info(f"   Participants form data: {repr(participants)}")
        logger.info(f"   Template ID query param: {repr(templateid)}")
        logger.info(f"   Custom template points form data: {repr(custom_template_points)}")
        logger.info(f"   Audio File: {repr(audio_file.filename)} (Content-Type: {audio_file.content_type}, Size: {audio_file.size} bytes)")
        if second_audio_file:
            logger.info(f"   Secondary Audio File: {repr(second_audio_file.filename)} (Content-Type: {second_audio_file.content_type}, Size: {second_audio_file.size} bytes)")
        else:
            logger.info("ℹ️  No secondary audio file provided")
        # Note: Request object not available in current context
        # Adding debug logging for form data instead
        logger.info("📋 REQUEST FORM DATA DEBUG:")
        logger.info(f"   Title form data: {repr(title)}")
        logger.info(f"   Description form data: {repr(description)}")
        logger.info(f"   Participants form data: {repr(participants)}")
        logger.info(f"   Template ID query param: {repr(templateid)}")
        logger.info(f"   Custom template points form data: {repr(custom_template_points)}")
        # Log incoming request details
        logger.info("🎤 NEW MEETING CREATION REQUEST")
        logger.info(f"👤 User: {current_user.name} ({current_user.email}) - ID: {current_user.id}")
        logger.info(f"📝 Meeting Title: '{title}'")
        logger.info(f"📄 Description: '{description}'")
        logger.info(f"👥 Participants: '{participants}'")
        logger.info(f"🎯 Template ID: '{templateid}'")
        logger.info(f"🔧 Custom Template Points: '{custom_template_points}'")
        logger.info(f"🔧 Custom Template Points Type: {type(custom_template_points)}")
        logger.info(f"🔧 Custom Template Points Length: {len(custom_template_points) if custom_template_points else 0}")
        logger.info(f"🎵 Audio File: '{audio_file.filename}' (Content-Type: {audio_file.content_type}, Size: {audio_file.size} bytes)")
        if second_audio_file:
            logger.info(f"🎵 Secondary Audio File: '{second_audio_file.filename}' (Content-Type: {second_audio_file.content_type}, Size: {second_audio_file.size} bytes)")
        else:
            logger.info("ℹ️  No secondary audio file provided")
        
        # Validate required fields
        if not title or title.strip() == "":
            logger.warning("❌ Empty title provided")
            raise HTTPException(status_code=400, detail="Meeting title is required")
        
        if not audio_file.filename:
            logger.warning("❌ No audio filename provided")
            raise HTTPException(status_code=400, detail="Audio file is required")
        
        # Log template validation
        if templateid:
            logger.info(f"✅ Using template: {templateid}")
        else:
            logger.info("ℹ️  No template specified, will use default")
        # Process audio file
        logger.info("🔄 Starting audio file processing...")
        transcription = None
        summary = None
        key_points = None
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Save primary audio file temporarily
        primary_file_path = f"temp_audio/{audio_file.filename}"
        os.makedirs("temp_audio", exist_ok=True)
        
        logger.info(f"💾 Saving primary audio file temporarily to: {primary_file_path}")
        with open(primary_file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        # Log primary file details
        primary_file_size = os.path.getsize(primary_file_path)
        primary_file_extension = audio_file.filename.split(".")[-1].lower() if "." in audio_file.filename else "unknown"
        logger.info(f"📊 Primary audio file details - Size: {primary_file_size} bytes, Extension: {primary_file_extension}")
        
        # Validate primary audio file before proceeding
        logger.info("🔍 Validating primary audio file...")
        try:
            audio_processor.validate_audio_file(primary_file_path)
            logger.info("✅ Primary audio file validation successful")
        except Exception as e:
            logger.error(f"❌ Primary audio file validation failed: {e}")
            # Clean up temporary file
            if os.path.exists(primary_file_path):
                os.remove(primary_file_path)
            raise HTTPException(status_code=400, detail=f"Invalid primary audio file: {str(e)}")
        
        # Handle secondary audio file if provided
        secondary_file_path = None
        if second_audio_file and second_audio_file.filename:
            secondary_file_path = f"temp_audio/{second_audio_file.filename}"
            
            logger.info(f"💾 Saving secondary audio file temporarily to: {secondary_file_path}")
            with open(secondary_file_path, "wb") as buffer:
                content = await second_audio_file.read()
                buffer.write(content)
            
            # Log secondary file details
            secondary_file_size = os.path.getsize(secondary_file_path)
            secondary_file_extension = second_audio_file.filename.split(".")[-1].lower() if "." in second_audio_file.filename else "unknown"
            logger.info(f"📊 Secondary audio file details - Size: {secondary_file_size} bytes, Extension: {secondary_file_extension}")
            
            # Validate secondary audio file
            logger.info("🔍 Validating secondary audio file...")
            try:
                if not audio_processor.validate_secondary_audio_file(secondary_file_path):
                    raise Exception("Secondary audio file validation failed")
                logger.info("✅ Secondary audio file validation successful")
            except Exception as e:
                logger.error(f"❌ Secondary audio file validation failed: {e}")
                # Clean up temporary files
                if os.path.exists(primary_file_path):
                    os.remove(primary_file_path)
                if os.path.exists(secondary_file_path):
                    os.remove(secondary_file_path)
                raise HTTPException(status_code=400, detail=f"Invalid secondary audio file: {str(e)}")
        
        # Generate unique meeting UUID
        meeting_uuid = str(uuid.uuid4())
        
        # Determine final audio path and process merging if needed
        if secondary_file_path:
            # Merge audio files
            logger.info("🎵 Merging primary and secondary audio files...")
            merged_filename = f"meeting_{meeting_uuid}.{primary_file_extension}"
            final_audio_path = os.path.join(uploads_dir, merged_filename)
            
            try:
                # Create the merged audio file
                audio_processor.merge_audio_files(primary_file_path, secondary_file_path, final_audio_path)
                logger.info(f"✅ Audio files merged successfully: {final_audio_path}")
                
                # Clean up temporary files
                os.remove(primary_file_path)
                os.remove(secondary_file_path)
                logger.info("🧹 Cleaned up temporary audio files")
                
            except Exception as e:
                logger.error(f"❌ Audio merging failed: {e}")
                # Clean up temporary files
                if os.path.exists(primary_file_path):
                    os.remove(primary_file_path)
                if os.path.exists(secondary_file_path):
                    os.remove(secondary_file_path)
                raise HTTPException(status_code=500, detail=f"Failed to merge audio files: {str(e)}")
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
            logger.error("❌ Failed to upload audio file to S3")
            # Clean up local file
            if os.path.exists(final_audio_path):
                os.remove(final_audio_path)
            raise HTTPException(status_code=500, detail="Failed to upload audio file to S3")
        
        logger.info(f"✅ Audio file uploaded to S3: {s3_audio_path}")
        
        # Clean up local file after successful S3 upload
        if os.path.exists(final_audio_path):
            os.remove(final_audio_path)
            logger.info(f"🧹 Cleaned up local audio file: {final_audio_path}")
        
        # Parse participants from JSON string to list
        participants_list = []
        if participants:
            try:
                import json
                participants_list = json.loads(participants)
                if not isinstance(participants_list, list):
                    # If it's not a list, treat it as a single participant
                    participants_list = [str(participants_list)]
                logger.info(f"👥 Parsed participants: {participants_list}")
            except (json.JSONDecodeError, TypeError):
                # If JSON parsing fails, treat as comma-separated string (backward compatibility)
                participants_list = [p.strip() for p in participants.split(',') if p.strip()]
                logger.info(f"👥 Parsed participants (legacy format): {participants_list}")

        # Create meeting record with pending status for background processing
        logger.info("💾 Creating meeting record in database...")
        meeting_data = MeetingRecordCreate(
            title=title,
            description=description,
            participants=participants_list,
            templateid=templateid,
            custom_template_points=custom_template_points,
            transcription=None,  # Will be processed in background
            summary=None,        # Will be processed in background
            key_points=None,     # Will be processed in background
            audio_filename=os.path.basename(final_audio_path),  # Keep original filename for reference
            s3_audio_path=s3_audio_path  # Store S3 path
        )
        
        logger.info(f"📋 Meeting data prepared - Title: '{meeting_data.title}', Template: {meeting_data.templateid}")
        
        meeting = meeting_service.create_meeting_record(db=db, meeting=meeting_data, user_id=current_user.id)
        
        # Meeting is created with PENDING status - background service will process it
        logger.info(f"✅ Meeting {meeting.id} created successfully with PENDING status")
        logger.info(f"🎯 Background service will process audio file from S3: {s3_audio_path}")
        logger.info(f"📊 Meeting UUID: {meeting_uuid}")
        logger.info(f"🕐 Created at: {meeting.created_at}")
        
        # Convert meeting to response format to ensure proper serialization
        from api.services.meeting_service import convert_meeting_to_response_format
        return convert_meeting_to_response_format(meeting)
        
    except Exception as e:
        logger.error(f"❌ MEETING CREATION FAILED")
        logger.error(f"👤 User: {current_user.name} ({current_user.email}) - ID: {current_user.id}")
        logger.error(f"📝 Title: '{title}'")
        logger.error(f"🎵 Audio File: '{audio_file.filename if audio_file else 'None'}'")
        logger.error(f"🚨 Error: {str(e)}")
        logger.error(f"📊 Error Type: {type(e).__name__}")
        
        # Clean up temporary files if they exist
        if 'primary_file_path' in locals() and os.path.exists(primary_file_path):
            try:
                os.remove(primary_file_path)
                logger.info(f"🧹 Cleaned up temporary primary file: {primary_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"⚠️  Failed to clean up temporary primary file: {cleanup_error}")
        
        if 'secondary_file_path' in locals() and secondary_file_path and os.path.exists(secondary_file_path):
            try:
                os.remove(secondary_file_path)
                logger.info(f"🧹 Cleaned up temporary secondary file: {secondary_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"⚠️  Failed to clean up temporary secondary file: {cleanup_error}")
        
        # Clean up final audio file if it was created
        if 'final_audio_path' in locals() and os.path.exists(final_audio_path):
            try:
                os.remove(final_audio_path)
                logger.info(f"🧹 Cleaned up final audio file: {final_audio_path}")
            except Exception as cleanup_error:
                logger.warning(f"⚠️  Failed to clean up final audio file: {cleanup_error}")
        
        raise HTTPException(status_code=500, detail=f"Error creating meeting record: {str(e)}")


@router.get("/", response_model=PaginatedMeetingsResponse)
def get_meetings(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    analytics_status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all meetings for the current user with filtering
    """
    meetings, total_count = meeting_service.get_meetings_with_filters(
        db, 
        current_user.id, 
        status, 
        analytics_status, 
        search,
        date_from,
        date_to,
        skip, 
        limit
    )
    
    # Convert to new response format
    data = [meeting_service.convert_meeting_to_response_format(m, include_details=False) for m in meetings]
    
    # Calculate pagination
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
    
    return {
        "data": data,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@router.get("/speakers", response_model=List[dict])
def get_unique_speakers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all unique speakers across all meetings for the current user
    """
    return meeting_service.get_unique_speakers(db, current_user.id)

@router.get("/by-speaker", response_model=dict)
def get_meetings_by_speaker(
    speaker_name: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get meetings where a specific speaker participated
    """
    meetings, total_count = meeting_service.search_meetings_by_speaker(
        db, current_user.id, speaker_name, skip, limit
    )
    
    return {
        "items": [meeting_service.convert_meeting_to_response_format(m) for m in meetings],
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.get("/{meeting_id}", response_model=dict)
def get_meeting(
    meeting_id: uuid.UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific meeting by ID
    """
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting_service.convert_meeting_to_response_format(db_meeting)

@router.get("/{meeting_id}/audio/url", response_model=dict)
def get_meeting_audio_url(
    meeting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a fresh presigned URL for the meeting audio file
    """
    # Verify ownership
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not db_meeting.s3_audio_path:
        raise HTTPException(status_code=404, detail="No audio file associated with this meeting")
        
    # Check if this is a local file (fallback mode)
    if os.path.exists(db_meeting.s3_audio_path):
        from config.settings import settings
        filename = os.path.basename(db_meeting.s3_audio_path)
        
        # Determine the correct static path based on valid directories
        if "temp_audio" in db_meeting.s3_audio_path:
             url = f"{settings.BASE_URL}/static/temp_audio/{filename}"
        elif "uploads" in db_meeting.s3_audio_path:
             url = f"{settings.BASE_URL}/static/uploads/{filename}"
        else:
             # Default fallback
             url = f"{settings.BASE_URL}/static/{filename}"
             
        return {
            "download_url": url,
            "expires_in": 3600,
            "filename": db_meeting.audio_filename
        }

    # Generate presigned URL
    from api.services.s3_service import s3_service
    expiration = 3600
    url = s3_service.get_audio_file_url(db_meeting.s3_audio_path, expiration=expiration)
    
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate audio URL")
        
    return {
        "download_url": url,
        "expires_in": expiration,
        "filename": db_meeting.audio_filename
    }

@router.put("/{meeting_id}", response_model=dict)
def update_meeting(
    meeting_id: uuid.UUID, 
    meeting: MeetingRecordUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a meeting
    """
    # Verify ownership
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    updated_meeting = meeting_service.update_meeting_record(db, meeting_id, meeting)
    return meeting_service.convert_meeting_to_response_format(updated_meeting)

@router.delete("/{meeting_id}", response_model=dict)
def delete_meeting(
    meeting_id: uuid.UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a meeting
    """
    # Verify ownership
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    success = meeting_service.delete_meeting_record(db, meeting_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete meeting")
        
    return {"status": "success", "message": "Meeting deleted"}

@router.post("/{meeting_id}/rename-speaker", response_model=dict)
def rename_speaker(
    meeting_id: uuid.UUID,
    update: SpeakerNameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Rename a speaker throughout a meeting's transcription and participants list.
    """
    # Verify ownership
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    old_name = update.old_speaker_name
    new_name = update.new_speaker_name

    # 1. Update transcription segments
    if db_meeting.transcription:
        # Check if it's already a list or a JSON string
        import json
        transcription = db_meeting.transcription
        if isinstance(transcription, str):
            transcription = json.loads(transcription)
        
        updated_transcription = []
        for segment in transcription:
            if segment.get("speaker") == old_name:
                segment["speaker"] = new_name
            updated_transcription.append(segment)
        
        db_meeting.transcription = updated_transcription

    # 2. Update participants list
    if db_meeting.participants:
        # Check if it's already a list or a JSON string
        participants = db_meeting.participants
        if isinstance(participants, str):
            try:
                import json
                participants = json.loads(participants)
            except:
                # Handle comma separated if needed but should be JSON now
                import json
                participants = [p.strip() for p in participants.split(",")]

        updated_participants = []
        found = False
        for p in participants:
            if p == old_name:
                updated_participants.append(new_name)
                found = True
            else:
                updated_participants.append(p)
        
        if not found and new_name not in updated_participants:
             # If old name wasn't in list but we renamed it in transcript, 
             # maybe we should add it? Or at least ensure it's unique.
             pass
             
        db_meeting.participants = updated_participants

    db.commit()
    db.refresh(db_meeting)
    
    return {"status": "success", "message": f"Renamed speaker '{old_name}' to '{new_name}'"}

@router.post("/{meeting_id}/merge-speakers", response_model=dict)
def merge_speakers(
    meeting_id: uuid.UUID,
    update: SpeakerMergeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Merge multiple speakers into a single target speaker.
    """
    # Verify ownership
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    target = update.target_speaker
    sources = set(update.source_speakers)

    # 1. Update transcription segments
    if db_meeting.transcription:
        # Check if it's already a list or a JSON string
        import json
        transcription = db_meeting.transcription
        if isinstance(transcription, str):
            transcription = json.loads(transcription)
        
        updated_transcription = []
        for segment in transcription:
            if segment.get("speaker") in sources:
                segment["speaker"] = target
            updated_transcription.append(segment)
        
        db_meeting.transcription = updated_transcription

    # 2. Update participants list
    if db_meeting.participants:
        # Check if it's already a list or a JSON string
        participants = db_meeting.participants
        if isinstance(participants, str):
            try:
                import json
                participants = json.loads(participants)
            except:
                participants = [p.strip() for p in participants.split(",")]

        updated_participants = set(participants)
        
        # Check if any sources are in the list
        sources_in_participants = any(s in updated_participants for s in sources)
        
        # Remove sources
        for s in sources:
            if s in updated_participants:
                updated_participants.remove(s)
                
        # If any source was present, make sure target is in the list
        if sources_in_participants:
            updated_participants.add(target)
             
        db_meeting.participants = list(updated_participants)

    db.commit()
    db.refresh(db_meeting)
    
    return {"status": "success", "message": f"Merged speakers into '{target}'"}


@router.post("/{meeting_id}/reprocess")
async def reprocess_meeting(
    meeting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger reprocessing of a meeting
    """
    db_meeting = meeting_service.get_meeting_record_by_user(db, meeting_id, current_user.id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Reset status
    db_meeting.status = TranscriptionStatus.PENDING
    db_meeting.is_processed = False
    db.commit()
    
    # Meeting will be picked up automatically by background_transcription_service
    # which processes all PENDING meetings
    logger.info(f"✅ Meeting {meeting_id} reset to PENDING status for reprocessing")
    logger.info(f"📋 Background service will process this meeting automatically")
    
    return {"status": "success", "message": "Meeting reprocessing started"}
