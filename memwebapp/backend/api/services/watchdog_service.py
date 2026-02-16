import threading
import time
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from api.models.meeting import MeetingRecord, TranscriptionStatus
from api.services.meeting_service import finalize_meeting_recording

logger = logging.getLogger(__name__)

class WatchdogService:
    def __init__(self, check_interval_seconds=60, timeout_minutes=5):
        self.check_interval_seconds = check_interval_seconds
        self.timeout_minutes = timeout_minutes
        self.running = False
        self.thread = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info("🐶 Watchdog Service started")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
            logger.info("🐶 Watchdog Service stopped")

    def _run_loop(self):
        while self.running:
            try:
                self._check_stale_recordings()
            except Exception as e:
                logger.error(f"Error in Watchdog loop: {e}", exc_info=True)
            
            # Sleep with check for stop signal
            for _ in range(self.check_interval_seconds):
                if not self.running:
                    break
                time.sleep(1)

    def _check_stale_recordings(self):
        db = SessionLocal()
        try:
            # Threshold time: if updated_at < now - 5 mins
            # Ensure we use UTC for comparison as updated_at is TZ aware
            now = datetime.now(timezone.utc)
            threshold = now - timedelta(minutes=self.timeout_minutes)
            
            stale_meetings = db.query(MeetingRecord).filter(
                MeetingRecord.status == TranscriptionStatus.RECORDING,
                MeetingRecord.updated_at < threshold
            ).all()
            
            if stale_meetings:
                logger.info(f"🐶 Found {len(stale_meetings)} stale recordings to finalize")
                
            for meeting in stale_meetings:
                try:
                    logger.info(f"🐶 Auto-finalizing stale meeting {meeting.id} (Last updated: {meeting.updated_at})")
                    
                    # Call finalization logic
                    finalized_meeting = finalize_meeting_recording(db, meeting.id)
                    
                    if finalized_meeting:
                         logger.info(f"✅ Auto-finalized meeting {meeting.id}")
                    else:
                         # If finalization returned None (e.g. no audio), mark as FAILED to prevent infinite retries
                         logger.warning(f"⚠️ Could not finalize meeting {meeting.id} (likely no audio). Marking as FAILED.")
                         meeting.status = TranscriptionStatus.FAILED
                         db.commit()

                except Exception as e:
                    logger.error(f"Error auto-finalizing meeting {meeting.id}: {e}")
                    
        finally:
            db.close()

# Global instance
watchdog_service = WatchdogService()
