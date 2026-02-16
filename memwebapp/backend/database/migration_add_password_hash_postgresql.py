
"""
Database migration to add password_hash column to users table in PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def migrate():
    """Add password_hash column to users table"""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment variables")
        return False
        
    print(f"🔄 Starting password_hash migration on {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")
    
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='password_hash'
            """))
            
            if result.fetchone():
                print("⚠️  password_hash column already exists in users table")
            else:
                print("➕ Adding password_hash column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
                conn.commit()
                print("✅ password_hash column added successfully")
                
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ Database error: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if migrate():
        print("✅ Migration completed successfully")
        sys.exit(0)
    else:
        print("❌ Migration failed")
        sys.exit(1)
