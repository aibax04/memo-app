"""
Background transcription service for processing audio files asynchronously
"""
import threading
import time
import os
import math
import tempfile
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from api.models.meeting import MeetingRecord, TranscriptionStatus, AnalyticsStatus
from api.models.user import User
from api.services.audio_service import AudioProcessor
from api.services.meeting_service import update_meeting_record
from api.services.dashboard_service import dashboard_service
from api.services.flat_meeting_analytics import flat_analytics
from api.services.mobile_audio_analytics import mobile_audio_analytics
from api.services.s3_service import s3_service
from api.services.template_service import get_template
from api.schemas.meeting import MeetingRecordUpdate

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True  # Override any existing configuration
)
logger = logging.getLogger(__name__)

class BackgroundTranscriptionService:
    def __init__(self):
        self.audio_processor = AudioProcessor()
        self.is_running = False
        self.worker_thread = None
        self.stop_event = threading.Event()
        
    def start(self):
        """Start the background transcription service"""
        if self.is_running:
            logger.info("Background transcription service is already running")
            return
            
        try:
            # Test database connection before starting
            db = SessionLocal()
            db.close()
            logger.info("✅ Database connection test successful")
            
            self.is_running = True
            self.stop_event.clear()
            self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
            self.worker_thread.start()
            logger.info("🎵 Background transcription service started successfully")
            
            # Verify the thread started
            if self.worker_thread.is_alive():
                logger.info("✅ Background worker thread is running")
            else:
                logger.error("❌ Background worker thread failed to start")
                self.is_running = False
                
        except Exception as e:
            logger.error(f"❌ Failed to start background transcription service: {str(e)}")
            import traceback
            logger.error(f"📊 Traceback: {traceback.format_exc()}")
            self.is_running = False
        
    def stop(self):
        """Stop the background transcription service"""
        if not self.is_running:
            logger.info("Background transcription service is not running")
            return
            
        self.is_running = False
        self.stop_event.set()
        if self.worker_thread:
            self.worker_thread.join(timeout=10)
        logger.info("Background transcription service stopped")
        
    def _worker_loop(self):
        """Main worker loop that processes pending audio files"""
        logger.info("🔄 Background worker loop started")
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        while self.is_running and not self.stop_event.is_set():
            try:
                # Get pending meetings with audio files
                pending_meetings = self._get_pending_meetings()
                
                if not pending_meetings:
                    # No pending meetings, wait before checking again
                    time.sleep(5)  # Wait 5 seconds before checking again
                    consecutive_errors = 0  # Reset error counter on successful check
                    continue
                    
                logger.info(f"🔍 Found {len(pending_meetings)} pending meetings to process")
                
                # Process each pending meeting
                for meeting in pending_meetings:
                    if self.stop_event.is_set():
                        break
                        
                    self._process_meeting(meeting)
                
                # Reset error counter on successful processing
                consecutive_errors = 0
                    
                # Wait a bit before checking for more pending meetings
                time.sleep(10)
                
            except Exception as e:
                consecutive_errors += 1
                logger.error(f"Error in background transcription worker (attempt {consecutive_errors}): {str(e)}")
                import traceback
                logger.error(f"📊 Traceback: {traceback.format_exc()}")
                
                if consecutive_errors >= max_consecutive_errors:
                    logger.error(f"❌ Too many consecutive errors ({consecutive_errors}). Stopping background service.")
                    self.is_running = False
                    break
                    
                # Wait longer on error, with exponential backoff
                wait_time = min(60 * (2 ** consecutive_errors), 300)  # Max 5 minutes
                logger.info(f"⏳ Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                
    def _get_pending_meetings(self) -> List[MeetingRecord]:
        """Get all meetings with pending status and S3 audio files"""
        db = SessionLocal()
        try:
            meetings = db.query(MeetingRecord).filter(
                MeetingRecord.status == TranscriptionStatus.PENDING,
                MeetingRecord.s3_audio_path.isnot(None),
                MeetingRecord.s3_audio_path != ""
            ).all()
            return meetings
        except Exception as e:
            logger.error(f"Error getting pending meetings: {str(e)}")
            return []
        finally:
            db.close()
            
    def _process_meeting(self, meeting: MeetingRecord):
        logger.info("=" * 80)
        logger.info(f"🚀 [Background] STARTING PROCESSING FOR MEETING {meeting.id}")
        logger.info(f"🚀 [Background] Meeting Title: {meeting.title}")
        logger.info(f"🚀 [Background] Meeting Status: {meeting.status}")
        logger.info("=" * 80)
        """Process a single meeting's audio file"""
        db = SessionLocal()
        temp_audio_file = None
        try:
            logger.info(f"🔄 Processing meeting {meeting.id}: {meeting.title}")
            logger.info(f"📊 Meeting details - Template: {meeting.templateid}, Custom Points: {getattr(meeting, 'custom_template_points', 'None')}")
            
            # Update status to processing
            self._update_meeting_status(db, meeting.id, TranscriptionStatus.PROCESSING)
            
            # Check if meeting has S3 audio path
            if not meeting.s3_audio_path:
                logger.error(f"No S3 audio path found for meeting {meeting.id}")
                self._update_meeting_status(db, meeting.id, TranscriptionStatus.FAILED)
                return
            
            # Retrieve audio content (Local file or S3 download)
            if os.path.exists(meeting.s3_audio_path):
                logger.info(f"📁 Local audio file found: {meeting.s3_audio_path}")
                try:
                    with open(meeting.s3_audio_path, 'rb') as f:
                        audio_content = f.read()
                    logger.info(f"✅ Loaded {len(audio_content)} bytes from local file")
                except Exception as e:
                    logger.error(f"❌ Failed to read local file: {e}")
                    self._update_meeting_status(db, meeting.id, TranscriptionStatus.FAILED)
                    return
            else:
                logger.info(f"📥 Downloading audio file from S3: {meeting.s3_audio_path}")
                audio_content = s3_service.download_audio_file(meeting.s3_audio_path)
            
            if not audio_content:
                logger.error(f"Failed to retrieve audio content (S3 or local): {meeting.s3_audio_path}")
                self._update_meeting_status(db, meeting.id, TranscriptionStatus.FAILED)
                return
            
            # Create temporary file for audio content
            # S3 audio is always MP3, but local stitch might be WAV.
            # We'll use the original extension if possible or default to .mp3
            _, ext = os.path.splitext(meeting.s3_audio_path)
            if not ext:
                ext = '.mp3'
                
            temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            temp_audio_file.write(audio_content)
            temp_audio_file.flush()
            temp_audio_file.close()
            
            logger.info(f"✅ Audio file downloaded and saved to temporary file: {temp_audio_file.name}")
            
            # Normalize and preprocess audio for better transcription quality
            try:
                normalized_audio_path = self.audio_processor.normalize_audio_for_transcription(temp_audio_file.name)
                if normalized_audio_path and normalized_audio_path != temp_audio_file.name:
                    # Replace original with normalized version
                    os.replace(normalized_audio_path, temp_audio_file.name)
                    logger.info(f"✅ Audio normalized and ready for transcription")
            except Exception as e:
                logger.warning(f"⚠️ Audio normalization failed (continuing anyway): {e}")
            
            # Validate audio file before processing
            try:
                self.audio_processor.validate_audio_file(temp_audio_file.name)
            except Exception as e:
                logger.error(f"Audio file validation failed for meeting {meeting.id}: {e}")
                self._update_meeting_status(db, meeting.id, TranscriptionStatus.FAILED)
                return
                
            # Process audio file with template_id
            template_id = meeting.templateid  # Use template ID directly
            
            # Fetch template data from database
            template = None
            if template_id:
                template = get_template(db, template_id)
                if template:
                    logger.info(f"✅ Fetched template from DB: {template.title} (ID: {template.id})")
                else:
                    logger.warning(f"⚠️ Template not found in database for template_id: {template_id}")
            
            # Get custom template points from meeting or template
            custom_template_points = getattr(meeting, 'custom_template_points', None)
            if not custom_template_points and template:
                # Fallback to template's key_points_prompt if custom_template_points not set
                custom_template_points = template.key_points_prompt
            
            logger.info(f"🎯 Processing with template_id: '{template_id}'")
            logger.info(f"🔧 Custom template points: '{custom_template_points}'")
            logger.info(f"🔧 Custom template points type: {type(custom_template_points)}")
            logger.info(f"🔧 Has custom points: {bool(custom_template_points)}")
            
            transcription = self.audio_processor.get_transcription(temp_audio_file.name, template_id)
            
            # Log transcription format and speaker information
            logger.info(f"📝 [Background] Transcription received for meeting {meeting.id}")
            if transcription:
                logger.info(f"📝 [Background] Transcription type: {type(transcription)}")
                if isinstance(transcription, list):
                    logger.info(f"📝 [Background] Transcription has {len(transcription)} segments")
                    
                    # Check for transcription quality issues (common on iPhone 15/16 Pro)
                    empty_segments = 0
                    special_char_only_segments = 0
                    valid_segments = 0
                    
                    if len(transcription) > 0:
                        first_segment = transcription[0]
                        logger.info(f"📝 [Background] First segment type: {type(first_segment)}")
                        if isinstance(first_segment, dict):
                            logger.info(f"📝 [Background] First segment keys: {list(first_segment.keys())}")
                            logger.info(f"📝 [Background] First segment has 'speaker': {'speaker' in first_segment}")
                            if 'speaker' in first_segment:
                                logger.info(f"📝 [Background] First segment speaker value: {first_segment.get('speaker')}")
                            
                            # Check transcription quality - look for empty or problematic segments
                            for seg in transcription[:20]:  # Check first 20 segments
                                if isinstance(seg, dict):
                                    text = seg.get('text', '')
                                    if not text or (isinstance(text, str) and len(text.strip()) == 0):
                                        empty_segments += 1
                                    elif isinstance(text, str):
                                        # Check if text contains mostly special characters or is very short
                                        text_stripped = text.strip()
                                        if len(text_stripped) < 2 or (text_stripped and all(not c.isalnum() for c in text_stripped[:10] if text_stripped)):
                                            special_char_only_segments += 1
                                        else:
                                            valid_segments += 1
                                    else:
                                        valid_segments += 1
                            
                            # Log quality metrics
                            logger.info(f"📊 [Background] Transcription quality: {valid_segments} valid, {empty_segments} empty, {special_char_only_segments} special-char-only segments (first 20)")
                            if empty_segments > 5 or special_char_only_segments > 5:
                                logger.warning(f"⚠️ [Background] WARNING: Transcription quality issues detected - many empty/problematic segments!")
                                logger.warning(f"⚠️ [Background] This may indicate audio encoding issues, especially on iPhone 15/16 Pro")
                            
                            # Check transcription quality - look for empty or problematic segments (iPhone 15/16 Pro issue)
                            empty_segments = 0
                            special_char_only_segments = 0
                            valid_segments = 0
                            
                            for seg in transcription[:20]:  # Check first 20 segments
                                if isinstance(seg, dict):
                                    text = seg.get('text', '')
                                    if not text or (isinstance(text, str) and len(text.strip()) == 0):
                                        empty_segments += 1
                                    elif isinstance(text, str):
                                        # Check if text contains mostly special characters or is very short
                                        text_stripped = text.strip()
                                        if len(text_stripped) < 2:
                                            empty_segments += 1
                                        elif text_stripped and all(not c.isalnum() and c not in '.,!?;:' for c in text_stripped[:10] if text_stripped):
                                            special_char_only_segments += 1
                                        else:
                                            valid_segments += 1
                                    else:
                                        valid_segments += 1
                            
                            # Log quality metrics
                            logger.info(f"📊 [Background] Transcription quality: {valid_segments} valid, {empty_segments} empty, {special_char_only_segments} special-char-only segments (first 20)")
                            if empty_segments > 5 or special_char_only_segments > 5:
                                logger.warning(f"⚠️ [Background] WARNING: Transcription quality issues detected - many empty/problematic segments!")
                                logger.warning(f"⚠️ [Background] This may indicate audio encoding issues, especially on iPhone 15/16 Pro")
                            
                            # Check a few more segments for speaker info
                            speakers_found = set()
                            for seg in transcription[:10]:  # Check first 10 segments
                                if isinstance(seg, dict) and 'speaker' in seg:
                                    speaker = seg.get('speaker')
                                    if speaker:
                                        speakers_found.add(speaker)
                            logger.info(f"📝 [Background] Unique speakers in first 10 segments: {list(speakers_found)}")
                else:
                    logger.warning(f"📝 [Background] Transcription is not a list: {type(transcription)}")
            else:
                logger.error(f"📝 [Background] Transcription is None or empty!")
            
            participants = self._extract_participants_from_transcription(transcription)
            logger.info(f"👥 [Background] Extracted {len(participants)} participants: {participants}")
            
            summary = self.audio_processor.generate_summary(transcription, template_id)
            key_points = self.audio_processor.extract_key_points(transcription, template_id, custom_template_points)
            
            logger.info(f"🎯 [Background] Starting action items extraction for meeting {meeting.id}")
            action_items = self.audio_processor.extract_action_items(transcription, template_id)
            logger.info(f"🎯 [Background] Action items extraction completed. Got {len(action_items) if action_items else 0} items")
            if action_items:
                for idx, item in enumerate(action_items[:3]):  # Log first 3 items
                    logger.info(f"🎯 [Background] Action item {idx + 1}: {item.get('description', 'N/A')[:50]}...")
            
            # Update meeting with transcription results
            logger.info(f"💾 [Background] Updating meeting {meeting.id} with transcription results...")
            logger.info(f"💾 [Background] Transcription to save: {len(transcription) if isinstance(transcription, list) else 'N/A'} segments")
            meeting_update = MeetingRecordUpdate(
                transcription=transcription,
                summary=summary,
                key_points=key_points,
                action_items=action_items,
                participants=participants,
                status=TranscriptionStatus.COMPLETED
            )
            logger.info(f"💾 [Background] Meeting update prepared with {len(action_items) if action_items else 0} action items")
            
            update_meeting_record(db=db, meeting_id=meeting.id, meeting=meeting_update)
            logger.info(f"Successfully processed transcription for meeting {meeting.id}")
            
            # Extract participants and duration from transcription
            duration_minutes = self._calculate_duration_from_transcription(transcription)
            logger.info(f"📊 [Background] About to extract analytics - participants: {len(participants)}, duration: {duration_minutes} min, transcript segments: {len(transcription)}")
            
            # Additional update to save duration to the meeting record
            try:
                if duration_minutes:
                    duration_update = MeetingRecordUpdate(duration=duration_minutes)
                    update_meeting_record(db=db, meeting_id=meeting.id, meeting=duration_update)
                    logger.info(f"✅ [Background] Saved duration {duration_minutes} min to meeting {meeting.id}")
            except Exception as duration_error:
                logger.error(f"❌ [Background] Failed to save duration: {duration_error}")
            
            # Extract flat analytics from transcript
            try:
                logger.info(f"📊 [Background] Calling _extract_flat_meeting_analytics for meeting {meeting.id}")
                self._extract_flat_meeting_analytics(db, meeting, transcription, participants, duration_minutes)
                logger.info(f"📊 [Background] Analytics extraction completed for meeting {meeting.id}")
            except Exception as analytics_error:
                logger.error(f"❌ [Background] Analytics extraction failed for meeting {meeting.id}: {str(analytics_error)}")
                import traceback
                logger.error(f"❌ [Background] Analytics error traceback: {traceback.format_exc()}")
                raise
            
        except Exception as e:
            logger.error(f"❌ Error processing meeting {meeting.id}: {str(e)}")
            logger.error(f"📊 Error type: {type(e).__name__}")
            import traceback
            logger.error(f"📊 Traceback: {traceback.format_exc()}")
            try:
                self._update_meeting_status(db, meeting.id, TranscriptionStatus.FAILED)
            except Exception as update_error:
                logger.error(f"Failed to update meeting status to FAILED: {update_error}")
        finally:
            # Clean up temporary file
            if temp_audio_file and os.path.exists(temp_audio_file.name):
                try:
                    os.unlink(temp_audio_file.name)
                    logger.info(f"🗑️ Cleaned up temporary audio file: {temp_audio_file.name}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary file {temp_audio_file.name}: {cleanup_error}")
            db.close()
            
    def _update_meeting_status(self, db: Session, meeting_id: int, status: TranscriptionStatus):
        """Update meeting status in database"""
        try:
            meeting = db.query(MeetingRecord).filter(MeetingRecord.id == meeting_id).first()
            if meeting:
                meeting.status = status
                db.commit()
                logger.info(f"Updated meeting {meeting_id} status to {status.value}")
        except Exception as e:
            logger.error(f"Error updating meeting {meeting_id} status: {str(e)}")
            db.rollback()
    
    def _extract_participants_from_transcription(self, transcription: List[dict]) -> List[str]:
        """Extract unique participants from transcription segments"""
        if not transcription:
            return []
        
        participants = set()
        for segment in transcription:
            if isinstance(segment, dict) and 'speaker' in segment:
                speaker = segment['speaker']
                if speaker and speaker not in participants:
                    participants.add(speaker)
        
        return list(participants)
    
    def _calculate_duration_from_transcription(self, transcription: List[dict]) -> Optional[int]:
        """Calculate meeting duration in minutes from transcription timestamps"""
        if not transcription:
            return None
        
        try:
            # Find the maximum end time across all segments
            max_end_time = 0
            for segment in transcription:
                if isinstance(segment, dict) and 'end' in segment:
                    end_time = segment['end']
                    if isinstance(end_time, (int, float)):
                        max_end_time = max(max_end_time, end_time)
                    elif isinstance(end_time, str):
                        # Convert timestamp string to seconds
                        if ':' in end_time:
                            parts = end_time.split(':')
                            if len(parts) == 3:  # HH:MM:SS.MS format
                                hours, minutes, seconds = parts
                                total_seconds = float(hours) * 3600 + float(minutes) * 60 + float(seconds)
                            elif len(parts) == 2:  # MM:SS.MS format
                                minutes, seconds = parts
                                total_seconds = float(minutes) * 60 + float(seconds)
                            else:
                                continue
                        else:
                            total_seconds = float(end_time)
                        
                        max_end_time = max(max_end_time, total_seconds)
            
            # Convert seconds to minutes and round up
            if max_end_time > 0:
                duration_minutes = math.ceil(max_end_time / 60)
                return max(1, duration_minutes)  # Ensure at least 1 minute
            
            return None
            
        except Exception as e:
            logger.warning(f"Error calculating duration from transcription: {e}")
            return None
    
    def _extract_flat_meeting_analytics(self, db: Session, meeting: MeetingRecord, transcription: List[dict], participants: List[str], duration_minutes: Optional[int]):
        """Extract flat analytics from meeting transcript"""
        try:
            logger.info("=" * 80)
            logger.info(f"📊 [ANALYTICS] ===== STARTING FLAT ANALYTICS EXTRACTION =====")
            logger.info(f"📊 [ANALYTICS] Meeting ID: {meeting.id}")
            logger.info(f"📊 [ANALYTICS] Meeting Title: {meeting.title}")
            logger.info(f"📊 [ANALYTICS] Transcript segments: {len(transcription) if transcription else 0}")
            logger.info(f"📊 [ANALYTICS] Participants: {len(participants)} - {participants}")
            logger.info(f"📊 [ANALYTICS] Duration: {duration_minutes} minutes")
            logger.info("=" * 80)
            
            # Detect if this is a mobile meeting (mobile app creates meetings with s3_audio_path)
            is_mobile_meeting = self._is_mobile_meeting(meeting)
            
            if is_mobile_meeting:
                logger.info(f"📱 [ANALYTICS] Mobile meeting detected - using Mobile Audio Analytics")
            else:
                logger.info(f"🌐 [ANALYTICS] Extension meeting detected - using Flat Meeting Analytics")
            
            logger.info(f"Starting {'mobile audio' if is_mobile_meeting else 'flat'} analytics extraction for meeting {meeting.id}")
            
            # Update analytics status to processing
            self._update_analytics_status(db, meeting.id, AnalyticsStatus.PROCESSING)
            
            # Get user email from database using user_id
            user = db.query(User).filter(User.id == meeting.user_id).first()
            user_email = user.email if user else "unknown@example.com"
            
            # Extract analytics using appropriate service based on meeting source
            if is_mobile_meeting:
                # Use mobile audio analytics for mobile app meetings
                flat_analytics_data = mobile_audio_analytics.extract_analytics(
                    meeting_id=meeting.id,
                    user_email=user_email,
                    meeting_title=meeting.title,
                    meeting_date=meeting.created_at.isoformat(),
                    transcript=transcription,
                    participants=participants,
                    duration_minutes=duration_minutes
                )
            else:
                # Use flat analytics for extension meetings (video-based)
                flat_analytics_data = flat_analytics.extract_analytics(
                    meeting_id=meeting.id,
                    user_email=user_email,
                    meeting_title=meeting.title,
                    meeting_date=meeting.created_at.isoformat(),
                    transcript=transcription,
                    participants=participants,
                    duration_minutes=duration_minutes
                )
            
            # Log sentiment before saving
            logger.info(f"💾 [ANALYTICS] Before saving - sentiment: {flat_analytics_data.get('sentiment', 'NOT_FOUND')}, score: {flat_analytics_data.get('sentiment_score', 'NOT_FOUND')}")
            logger.info(f"💾 [ANALYTICS] Analytics data keys before save: {list(flat_analytics_data.keys())[:10]}... (total: {len(flat_analytics_data)})")
            
            # CRITICAL: Verify sentiment is in the data before saving
            if 'sentiment' not in flat_analytics_data or 'sentiment_score' not in flat_analytics_data:
                logger.error(f"❌ [ANALYTICS] CRITICAL ERROR: Sentiment missing from flat_analytics_data before saving!")
                logger.error(f"❌ [ANALYTICS] Missing keys: sentiment={('sentiment' not in flat_analytics_data)}, sentiment_score={('sentiment_score' not in flat_analytics_data)}")
                logger.error(f"❌ [ANALYTICS] All keys: {list(flat_analytics_data.keys())}")
                # Add default sentiment if missing
                if 'sentiment' not in flat_analytics_data:
                    flat_analytics_data['sentiment'] = 'neutral'
                    logger.warning(f"⚠️ [ANALYTICS] Added default sentiment: neutral")
                if 'sentiment_score' not in flat_analytics_data:
                    flat_analytics_data['sentiment_score'] = 5.0
                    logger.warning(f"⚠️ [ANALYTICS] Added default sentiment_score: 5.0")
            
            # Update meeting with flat analytics data
            meeting_update = MeetingRecordUpdate(
                analytics_status=AnalyticsStatus.COMPLETED,
                analytics_data=flat_analytics_data
            )
            
            update_meeting_record(db=db, meeting_id=meeting.id, meeting=meeting_update)
            
            # Verify what was saved
            updated_meeting = db.query(MeetingRecord).filter(MeetingRecord.id == meeting.id).first()
            if updated_meeting and updated_meeting.analytics_data:
                saved_sentiment = updated_meeting.analytics_data.get('sentiment', 'NOT_FOUND')
                saved_score = updated_meeting.analytics_data.get('sentiment_score', 'NOT_FOUND')
                logger.info(f"✅ [ANALYTICS] Verified saved - sentiment: {saved_sentiment}, score: {saved_score}")
                logger.info(f"✅ [ANALYTICS] Saved analytics data keys: {list(updated_meeting.analytics_data.keys())[:10]}... (total: {len(updated_meeting.analytics_data)})")
            else:
                logger.error(f"❌ [ANALYTICS] Failed to verify saved analytics data!")
            
            logger.info(f"Successfully extracted flat analytics for meeting {meeting.id}")
            logger.info(f"Analytics contains {len(flat_analytics_data)} fields")
            
            # Send analytics data to dashboard backend
            try:
                import asyncio
                dashboard_success = asyncio.run(dashboard_service.send_analytics_data(flat_analytics_data))
                if dashboard_success:
                    logger.info(f"Successfully sent analytics data to dashboard for meeting {meeting.id}")
                else:
                    logger.warning(f"Failed to send analytics data to dashboard for meeting {meeting.id}")
            except Exception as dashboard_error:
                logger.error(f"Error sending analytics data to dashboard for meeting {meeting.id}: {str(dashboard_error)}")
            

                
        except Exception as e:
            logger.error(f"Error extracting flat analytics for meeting {meeting.id}: {str(e)}")
            try:
                self._update_analytics_status(db, meeting.id, AnalyticsStatus.FAILED)
            except Exception as update_error:
                logger.error(f"Failed to update analytics status to FAILED: {update_error}")
    
    def _is_mobile_meeting(self, meeting: MeetingRecord) -> bool:
        """
        Detect if a meeting is from mobile app or browser extension
        Mobile app meetings typically have s3_audio_path and are created via POST /meetings/
        Extension meetings may have different characteristics
        """
        # If meeting has s3_audio_path, it's likely from mobile app
        # (mobile app uploads audio files to S3)
        if meeting.s3_audio_path:
            logger.info(f"📱 Mobile meeting detected: Has s3_audio_path")
            return True
        
        # Additional check: meetings created through mobile endpoint typically have audio_filename
        # and are processed asynchronously
        if meeting.audio_filename and meeting.status == TranscriptionStatus.PENDING:
            logger.info(f"📱 Mobile meeting detected: Has audio_filename and pending status")
            return True
        
        # Default to extension meeting (video-based)
        logger.info(f"🌐 Extension meeting detected: Defaulting to extension analytics")
        return False
    
    def _update_analytics_status(self, db: Session, meeting_id: int, status: AnalyticsStatus):
        """Update meeting analytics status in database"""
        try:
            meeting = db.query(MeetingRecord).filter(MeetingRecord.id == meeting_id).first()
            if meeting:
                meeting.analytics_status = status
                db.commit()
                logger.info(f"Updated meeting {meeting_id} analytics status to {status.value}")
        except Exception as e:
            logger.error(f"Error updating meeting {meeting_id} analytics status: {str(e)}")
            db.rollback()
    

    def process_all_pending(self) -> dict:
        """Process all pending meetings immediately (for manual trigger)"""
        db = SessionLocal()
        try:
            pending_meetings = self._get_pending_meetings()
            
            if not pending_meetings:
                return {
                    "message": "No pending meetings found",
                    "processed_count": 0,
                    "total_pending": 0
                }
                
            logger.info(f"Manually processing {len(pending_meetings)} pending meetings")
            
            processed_count = 0
            failed_count = 0
            
            for meeting in pending_meetings:
                try:
                    self._process_meeting(meeting)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"Failed to process meeting {meeting.id}: {str(e)}")
                    failed_count += 1
                    
            return {
                "message": f"Processed {processed_count} meetings, {failed_count} failed",
                "processed_count": processed_count,
                "failed_count": failed_count,
                "total_pending": len(pending_meetings)
            }
            
        finally:
            db.close()
            
    def get_status(self) -> dict:
        """Get current status of the background service"""
        db = SessionLocal()
        try:
            # Get counts by transcription status
            pending_count = db.query(MeetingRecord).filter(
                MeetingRecord.status == TranscriptionStatus.PENDING
            ).count()
            
            processing_count = db.query(MeetingRecord).filter(
                MeetingRecord.status == TranscriptionStatus.PROCESSING
            ).count()
            
            completed_count = db.query(MeetingRecord).filter(
                MeetingRecord.status == TranscriptionStatus.COMPLETED
            ).count()
            
            failed_count = db.query(MeetingRecord).filter(
                MeetingRecord.status == TranscriptionStatus.FAILED
            ).count()
            
            # Get counts by analytics status
            analytics_pending_count = db.query(MeetingRecord).filter(
                MeetingRecord.analytics_status == AnalyticsStatus.PENDING
            ).count()
            
            analytics_processing_count = db.query(MeetingRecord).filter(
                MeetingRecord.analytics_status == AnalyticsStatus.PROCESSING
            ).count()
            
            analytics_completed_count = db.query(MeetingRecord).filter(
                MeetingRecord.analytics_status == AnalyticsStatus.COMPLETED
            ).count()
            
            analytics_failed_count = db.query(MeetingRecord).filter(
                MeetingRecord.analytics_status == AnalyticsStatus.FAILED
            ).count()
            
            return {
                "service_running": self.is_running,
                "transcription": {
                    "pending_count": pending_count,
                    "processing_count": processing_count,
                    "completed_count": completed_count,
                    "failed_count": failed_count
                },
                "analytics": {
                    "pending_count": analytics_pending_count,
                    "processing_count": analytics_processing_count,
                    "completed_count": analytics_completed_count,
                    "failed_count": analytics_failed_count
                },
                "total_meetings": pending_count + processing_count + completed_count + failed_count
            }
        finally:
            db.close()

# Global instance
background_service = BackgroundTranscriptionService()

