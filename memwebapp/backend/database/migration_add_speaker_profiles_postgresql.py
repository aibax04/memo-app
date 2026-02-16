"""
Database migration to add speaker_profiles table to PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Add the parent directory to the path so we can import our models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import Base
from api.models.user import User  # Import User model first for foreign key
from api.models.speaker_profile import SpeakerProfile

load_dotenv()

def migrate():
    """Add speaker_profiles table to PostgreSQL database"""
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:oxmL3UT=@13.233.4.138:5432/psi_mobile_backend")
    
    print("🔄 Starting speaker profiles migration...")
    print(f"📊 Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")
    
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Successfully connected to PostgreSQL database")
        
        # Check if table already exists
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'speaker_profiles'
                )
            """))
            table_exists = result.scalar()
            
            if table_exists:
                print("⚠️  speaker_profiles table already exists, skipping creation")
                return True
        
        # Create the speaker_profiles table using SQLAlchemy model
        SpeakerProfile.__table__.create(bind=engine)
        print("✅ speaker_profiles table created successfully")
        
        # Create indexes
        with engine.connect() as conn:
            # Index on user_id (should be created automatically by SQLAlchemy)
            # Index on email for faster lookups
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_speaker_profiles_email 
                ON speaker_profiles(email)
            """))
            conn.commit()
            print("✅ Indexes created successfully")
        
        print("✅ Migration completed successfully!")
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ Database error during migration: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)

