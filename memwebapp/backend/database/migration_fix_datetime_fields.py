"""
Migration script to fix datetime fields and update schema
This script should be run after updating the models to fix datetime validation issues
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Fix datetime fields and update schema"""
    db_path = "meeting_records.dble"
    
    if not os.path.exists(db_path):
        print("Database file not found. Please run the application first to create the database.")
        return
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Fixing datetime fields and updating schema...")
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [table[0] for table in cursor.fetchall()]
        
        if "users" in tables:
            print("Updating users table...")
            # Update users table with proper datetime defaults
            cursor.execute("""
                CREATE TABLE users_new (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    email VARCHAR UNIQUE NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT (datetime('now')),
                    updated_at DATETIME DEFAULT (datetime('now')),
                    auth_provider VARCHAR DEFAULT 'microsoft'
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO users_new 
                SELECT id, name, email, is_active, 
                       COALESCE(created_at, datetime('now')) as created_at,
                       COALESCE(updated_at, datetime('now')) as updated_at,
                       COALESCE(auth_provider, 'microsoft') as auth_provider
                FROM users
            """)
            
            # Drop old table
            cursor.execute("DROP TABLE users")
            
            # Rename new table to original name
            cursor.execute("ALTER TABLE users_new RENAME TO users")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX idx_users_email ON users(email)")
            print("✅ Users table updated successfully")
        
        if "meeting_records" in tables:
            print("Updating meeting_records table...")
            # Update meeting_records table with proper datetime defaults
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
                    created_at DATETIME DEFAULT (datetime('now')),
                    updated_at DATETIME DEFAULT (datetime('now')),
                    is_processed BOOLEAN DEFAULT 0
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO meeting_records_new 
                SELECT id, title, description, participants, transcription, summary, 
                       key_points, audio_filename, user_id,
                       COALESCE(created_at, datetime('now')) as created_at,
                       COALESCE(updated_at, datetime('now')) as updated_at,
                       COALESCE(is_processed, 0) as is_processed
                FROM meeting_records
            """)
            
            # Drop old table
            cursor.execute("DROP TABLE meeting_records")
            
            # Rename new table to original name
            cursor.execute("ALTER TABLE meeting_records_new RENAME TO meeting_records")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX idx_meeting_records_title ON meeting_records(title)")
            cursor.execute("CREATE INDEX idx_meeting_records_user_id ON meeting_records(user_id)")
            print("✅ Meeting_records table updated successfully")
        
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
