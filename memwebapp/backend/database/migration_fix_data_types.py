"""
Migration script to fix data types for summary and key_points columns
This script updates the columns to match what the audio service actually returns
"""

import sqlite3
import os

def migrate_database():
    """Fix data types for summary and key_points columns"""
    db_path = "meeting_records.dble"
    
    if not os.path.exists(db_path):
        print("Database file not found. Please run the application first to create the database.")
        return
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Fixing data types for summary and key_points columns...")
        
        # Check if meeting_records table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='meeting_records'")
        if not cursor.fetchone():
            print("meeting_records table not found. Creating new table with correct schema...")
            
            # Create new table with correct schema
            cursor.execute("""
                CREATE TABLE meeting_records (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description TEXT,
                    participants TEXT,
                    transcription JSON,
                    summary TEXT,
                    key_points TEXT,
                    audio_filename VARCHAR,
                    user_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT (datetime('now')),
                    updated_at DATETIME DEFAULT (datetime('now')),
                    is_processed BOOLEAN DEFAULT 0
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX idx_meeting_records_title ON meeting_records(title)")
            cursor.execute("CREATE INDEX idx_meeting_records_user_id ON meeting_records(user_id)")
            
            print("✅ New meeting_records table created with correct schema")
        else:
            print("Updating existing meeting_records table...")
            
            # Create new table with correct schema
            cursor.execute("""
                CREATE TABLE meeting_records_new (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description TEXT,
                    participants TEXT,
                    transcription JSON,
                    summary TEXT,
                    key_points TEXT,
                    audio_filename VARCHAR,
                    user_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT (datetime('now')),
                    updated_at DATETIME DEFAULT (datetime('now')),
                    is_processed BOOLEAN DEFAULT 0
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO meeting_records_new 
                SELECT id, title, description, participants, transcription, summary, 
                       key_points, audio_filename, user_id, created_at, updated_at, is_processed
                FROM meeting_records
            """)
            
            # Drop old table
            cursor.execute("DROP TABLE meeting_records")
            
            # Rename new table to original name
            cursor.execute("ALTER TABLE meeting_records_new RENAME TO meeting_records")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX idx_meeting_records_title ON meeting_records(title)")
            cursor.execute("CREATE INDEX idx_meeting_records_user_id ON meeting_records(user_id)")
            
            print("✅ meeting_records table updated successfully")
        
        # Commit the changes
        conn.commit()
        print("✅ Database migration completed successfully")
        
        # Close the connection
        conn.close()
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    migrate_database()
