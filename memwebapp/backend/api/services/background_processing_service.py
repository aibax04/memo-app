
import threading
import logging
from typing import Optional
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.audio_service import AudioProcessor
from api.services.meeting_service import update_meeting_record, update_meeting_status
from api.schemas.meeting import MeetingRecordUpdate
from api.models.meeting import TranscriptionStatus

# Configure logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

class BackgroundProcessingService:
    def __init__(self):
        self.audio_processor = AudioProcessor()
    
    def process_meeting_audio(self, meeting_id: int, audio_path: str):
        """
        Process meeting audio in background thread
        """
        def _process():
            try:
                logger.info(f"Starting background processing for meeting {meeting_id}")
                
                # Get database session
                db = next(get_db())
                
                # Update status to processing
                update_meeting_status(db, meeting_id, TranscriptionStatus.PROCESSING)
                
                # Process audio
                transcription = self.audio_processor.get_transcription(audio_path)
                summary = self.audio_processor.generate_summary(transcription)
                key_points = self.audio_processor.extract_key_points(transcription)
                
                # Update meeting with results
                meeting_update = MeetingRecordUpdate(
                    transcription=transcription,
                    summary=summary,
                    key_points=key_points,
                    status=TranscriptionStatus.COMPLETED
                )
                
                updated_meeting = update_meeting_record(db=db, meeting_id=meeting_id, meeting=meeting_update)
                
                if updated_meeting:
                    logger.info(f"Successfully completed background processing for meeting {meeting_id}")
                else:
                    logger.error(f"Failed to update meeting {meeting_id} after processing")
                    update_meeting_status(db, meeting_id, TranscriptionStatus.FAILED)
                    
            except Exception as e:
                logger.error(f"Error in background processing for meeting {meeting_id}: {str(e)}")
                try:
                    # Update status to failed
                    db = next(get_db())
                    update_meeting_status(db, meeting_id, TranscriptionStatus.FAILED)
                except Exception as update_error:
                    logger.error(f"Failed to update status to failed for meeting {meeting_id}: {str(update_error)}")
            finally:
                # Close database session
                try:
                    db.close()
                except:
                    pass
        
        # Start background thread
        thread = threading.Thread(target=_process, daemon=True)
        thread.start()
        logger.info(f"Started background thread for meeting {meeting_id}")

# Global instance
background_processor = BackgroundProcessingService()
