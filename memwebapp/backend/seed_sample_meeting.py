from database.connection import SessionLocal
from api.models.user import User
from api.models.meeting import MeetingRecord, TranscriptionStatus
from api.models.template import Template
from api.models.speaker_profile import SpeakerProfile
from api.models.dashboard import Dashboard
from api.models.chart import Chart
import uuid
from datetime import datetime

def seed_sample():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found to seed meetings for.")
            return

        print(f"Seeding sample meeting for user: {user.email}")
        
        # Check if they already have meetings
        count = db.query(MeetingRecord).filter(MeetingRecord.user_id == user.id).count()
        if count > 0:
            print(f"User already has {count} meetings. Adding one more for verification.")

        sample_meeting = MeetingRecord(
            id=uuid.uuid4(),
            title="Q1ST",
            description="High-level planning session for Q1 roadmap and key results.",
            participants=["Alex Rivera", "Sarah Chen", "Jordan Smith"],
            transcription=[
                {"speaker": "Alex Rivera", "start": 0, "end": 5, "text": "Welcome everyone to our Q1 planning session."},
                {"speaker": "Sarah Chen", "start": 5, "end": 10, "text": "Thanks Alex. I've prepared the roadmap projections."},
                {"speaker": "Jordan Smith", "start": 10, "end": 15, "text": "Great, let's start with the product milestones."}
            ],
            summary="The team aligned on the primary objectives for the first quarter, focusing on market expansion and internal tool optimization.",
            key_points="• Market expansion into APAC region\n• Backend infrastructure upgrade following memo-app patterns\n• Customer success team scale-up",
            action_items=[
                {"description": "Finalize APAC budget", "owner": "Alex", "priority": "High"},
                {"description": "Draft infrastructure tech spec", "owner": "Engineering", "priority": "Medium"}
            ],
            status=TranscriptionStatus.COMPLETED,
            is_processed=True,
            duration=45,
            platform="google_meet",
            user_id=user.id
        )
        
        db.add(sample_meeting)
        db.commit()
        print(f"✅ Sample meeting '{sample_meeting.title}' added successfully.")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample()
