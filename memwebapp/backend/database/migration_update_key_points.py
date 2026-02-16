"""
Migration script to update key_points column from Text to JSON
This script should be run after updating the models to change key_points data type
"""

import sqlite3
import os

def migrate_database():
    """Update key_points column from Text to JSON"""
    db_path = "meeting_records.dble"
    
    if not os.path.exists(db_path):
        print("Database file not found. Please run the application first to create the database.")
        return
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Updating key_points column from Text to JSON...")
        
        # SQLite doesn't have a direct ALTER COLUMN TYPE command
        # We need to recreate the table with the new schema
        
        # Get current table structure
        cursor.execute("PRAGMA table_info(meeting_records)")
        columns = cursor.fetchall()
        
        # Create new table with updated schema
        cursor.execute("""
            CREATE TABLE meeting_records_new (
                id INTEGER PRIMARY KEY,
                title VARCHAR NOT NULL,
                description TEXT,
                participants TEXT,
                transcription JSON,
                summary JSON,
                key_points JSON,
                audio_filename VARCHAR,
                user_id INTEGER NOT NULL,
                created_at DATETIME,
                updated_at DATETIME,
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
        
        # Commit the changes
        conn.commit()
        print("✅ Successfully updated key_points column to JSON type")
        
        # Close the connection
        conn.close()
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    migrate_database()
