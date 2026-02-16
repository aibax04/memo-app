#!/usr/bin/env python3
"""
Reset failed meetings to pending status for reprocessing
"""
from database.connection import SessionLocal
from api.models.meeting import MeetingRecord, TranscriptionStatus

def reset_failed_meetings():
    """Reset failed meetings to pending status"""
    db = SessionLocal()
    try:
        # Get failed meetings
        failed_meetings = db.query(MeetingRecord).filter(
            MeetingRecord.status == TranscriptionStatus.FAILED
        ).all()
        
        print(f"Found {len(failed_meetings)} failed meetings")
        
        for meeting in failed_meetings:
            print(f"Resetting meeting {meeting.id}: {meeting.title}")
            meeting.status = TranscriptionStatus.PENDING
            db.commit()
            print(f"  ✅ Reset to PENDING")
        
        print(f"\nSuccessfully reset {len(failed_meetings)} meetings to PENDING status")
        
    except Exception as e:
        print(f"Error resetting meetings: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_failed_meetings()