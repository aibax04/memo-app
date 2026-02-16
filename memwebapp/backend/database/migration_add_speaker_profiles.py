"""
Database migration script to add speaker_profiles table
"""
import sqlite3
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_migration():
    """Add speaker_profiles table to database"""
    # Get database path from environment or use default
    db_path = os.environ.get('DATABASE_PATH', 'meeting_records.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Starting speaker profiles migration...")
        
        # Check if table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='speaker_profiles'
        """)
        
        if cursor.fetchone():
            print("⚠️  speaker_profiles table already exists, skipping creation")
        else:
            # Create speaker_profiles table
            cursor.execute("""
                CREATE TABLE speaker_profiles (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    first_name TEXT NOT NULL,
                    middle_name TEXT,
                    last_name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    company TEXT,
                    designation TEXT,
                    created_at DATETIME DEFAULT (datetime('now')),
                    updated_at DATETIME DEFAULT (datetime('now')),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(user_id, email)
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX idx_speaker_profiles_id ON speaker_profiles(id)
            """)
            
            cursor.execute("""
                CREATE INDEX idx_speaker_profiles_user_id ON speaker_profiles(user_id)
            """)
            
            cursor.execute("""
                CREATE INDEX idx_speaker_profiles_email ON speaker_profiles(email)
            """)
            
            print("✅ speaker_profiles table created successfully")
        
        conn.commit()
        conn.close()
        
        print("✅ Migration completed successfully!")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ SQLite error during migration: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

