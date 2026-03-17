import os
import sys
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
import json

# Add current directory to path to import models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.models.user import User
from api.models.meeting import MeetingRecord
from api.models.template import Template
from api.models.speaker_profile import SpeakerProfile
from api.models.dashboard import Dashboard
from api.models.chart import Chart
from database.base import Base

SQLITE_URL = "sqlite:///./meeting_records.db"
POSTGRES_URL = "postgresql://memoapp:memoapp_secure_2026@localhost:5433/memoapp"

def migrate():
    print(f"🎬 Starting migration from {SQLITE_URL} to {POSTGRES_URL}")
    
    # 1. Setup engines and sessions
    sqlite_engine = create_engine(SQLITE_URL)
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_db = SqliteSession()
    
    postgres_engine = create_engine(POSTGRES_URL)
    # Ensure tables exist in Postgres
    print("🏗️ Creating tables in Postgres...")
    Base.metadata.create_all(bind=postgres_engine)
    
    PostgresSession = sessionmaker(bind=postgres_engine)
    postgres_db = PostgresSession()
    
    try:
        # 2. Migrate Users
        print("👤 Migrating Users...")
        sqlite_users = sqlite_db.query(User).all()
        for u in sqlite_users:
            # Check if user already exists in Postgres
            exists = postgres_db.query(User).filter(User.email == u.email).first()
            if not exists:
                # Create a new instance to avoid session attachment issues
                new_user = User(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    updated_at=u.updated_at,
                    auth_provider=u.auth_provider,
                    password_hash=u.password_hash
                )
                postgres_db.add(new_user)
                print(f"   ✅ Added user: {u.email}")
            else:
                print(f"   ⏭️ User {u.email} already exists")
        postgres_db.commit()
        
        # 3. Migrate Meeting Records
        print("📅 Migrating Meeting Records...")
        sqlite_meetings = sqlite_db.query(MeetingRecord).all()
        for m in sqlite_meetings:
            exists = postgres_db.query(MeetingRecord).filter(MeetingRecord.id == m.id).first()
            if not exists:
                new_meeting = MeetingRecord(
                    id=m.id,
                    title=m.title,
                    description=m.description,
                    participants=m.participants,
                    transcription=m.transcription,
                    summary=m.summary,
                    key_points=m.key_points,
                    action_items=m.action_items,
                    audio_filename=m.audio_filename,
                    s3_audio_path=m.s3_audio_path,
                    templateid=m.templateid,
                    custom_template_points=m.custom_template_points,
                    user_id=m.user_id,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                    is_processed=m.is_processed,
                    status=m.status,
                    duration=m.duration,
                    platform=m.platform,
                    analytics_status=m.analytics_status,
                    analytics_data=m.analytics_data
                )
                postgres_db.add(new_meeting)
                print(f"   ✅ Added meeting: {m.title}")
            else:
                print(f"   ⏭️ Meeting {m.id} already exists")
        postgres_db.commit()

        # 4. Migrate Speaker Profiles
        print("🎙️ Migrating Speaker Profiles...")
        sqlite_profiles = sqlite_db.query(SpeakerProfile).all()
        for p in sqlite_profiles:
            exists = postgres_db.query(SpeakerProfile).filter(SpeakerProfile.id == p.id).first()
            if not exists:
                new_profile = SpeakerProfile(
                    id=p.id,
                    user_id=p.user_id,
                    first_name=p.first_name,
                    middle_name=p.middle_name,
                    last_name=p.last_name,
                    email=p.email,
                    phone=p.phone,
                    company=p.company,
                    designation=p.designation,
                    created_at=p.created_at,
                    updated_at=p.updated_at
                )
                postgres_db.add(new_profile)
                print(f"   ✅ Added profile: {p.full_name}")
        postgres_db.commit()

        print("🏁 Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        postgres_db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        sqlite_db.close()
        postgres_db.close()

if __name__ == "__main__":
    migrate()
