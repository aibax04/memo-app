"""
Database migration to set up PostgreSQL database with all required tables
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Add the parent directory to the path so we can import our models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import Base
from api.models.meeting import MeetingRecord
from api.models.user import User

load_dotenv()

def migrate():
    """Set up PostgreSQL database with all required tables"""
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:oxmL3UT=@13.233.4.138:5432/psi_mobile_backend")
    
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("Successfully connected to PostgreSQL database")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully")
        
        # Create indexes for better performance
        with engine.connect() as conn:
            # Create index on analytics_status
            try:
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_meeting_records_analytics_status 
                    ON meeting_records(analytics_status)
                """))
                print("Created index on analytics_status")
            except SQLAlchemyError as e:
                print(f"Warning: Could not create analytics_status index: {e}")
            
            # Create index on user_id
            try:
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_meeting_records_user_id 
                    ON meeting_records(user_id)
                """))
                print("Created index on user_id")
            except SQLAlchemyError as e:
                print(f"Warning: Could not create user_id index: {e}")
            
            # Create index on created_at
            try:
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_meeting_records_created_at 
                    ON meeting_records(created_at)
                """))
                print("Created index on created_at")
            except SQLAlchemyError as e:
                print(f"Warning: Could not create created_at index: {e}")
            
            conn.commit()
        
        print("PostgreSQL migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
