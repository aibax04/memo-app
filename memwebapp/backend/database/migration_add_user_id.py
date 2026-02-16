"""
Migration script to add user_id column to meeting_records table
This script should be run after updating the models to add the user_id relationship
"""

import sqlite3
import os

def migrate_database():
    """Add user_id column to meeting_records table"""
    db_path = "meeting_records.db"
    
    if not os.path.exists(db_path):
        print("Database file not found. Please run the application first to create the database.")
        return
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if user_id column already exists
        cursor.execute("PRAGMA table_info(meeting_records)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'user_id' not in columns:
            print("Adding user_id column to meeting_records table...")
            
            # Add user_id column (defaulting to 1 for existing records)
            # Note: You may want to set this to a specific user ID based on your needs
            cursor.execute("ALTER TABLE meeting_records ADD COLUMN user_id INTEGER DEFAULT 1")
            
            # Create index on user_id for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_meeting_records_user_id ON meeting_records(user_id)")
            
            # Commit the changes
            conn.commit()
            print("Successfully added user_id column to meeting_records table")
        else:
            print("user_id column already exists in meeting_records table")
        
        # Close the connection
        conn.close()
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    migrate_database()
