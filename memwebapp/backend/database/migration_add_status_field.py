"""
Migration to add status field to meeting_records table
"""
import sqlite3
import os
from datetime import datetime

def migrate():
    """Add status field to meeting_records table"""
    db_path = "meeting_records.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found. Skipping migration.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if status column already exists
        cursor.execute("PRAGMA table_info(meeting_records)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'status' not in columns:
            print("Adding status column to meeting_records table...")
            
            # Add status column with default value 'pending'
            cursor.execute("""
                ALTER TABLE meeting_records 
                ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL
            """)
            
            # Update existing records based on their current state
            # If they have transcription, summary, or key_points, mark as completed
            cursor.execute("""
                UPDATE meeting_records 
                SET status = 'completed' 
                WHERE transcription IS NOT NULL 
                   OR summary IS NOT NULL 
                   OR key_points IS NOT NULL
            """)
            
            # If they have audio_filename but no processing results, mark as pending
            cursor.execute("""
                UPDATE meeting_records 
                SET status = 'pending' 
                WHERE audio_filename IS NOT NULL 
                  AND transcription IS NULL 
                  AND summary IS NULL 
                  AND key_points IS NULL
            """)
            
            # Create index on status column for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_meeting_records_status 
                ON meeting_records(status)
            """)
            
            conn.commit()
            print("Status column added successfully!")
            
            # Show statistics
            cursor.execute("SELECT status, COUNT(*) FROM meeting_records GROUP BY status")
            stats = cursor.fetchall()
            print("Status distribution:")
            for status, count in stats:
                print(f"  {status}: {count} records")
                
        else:
            print("Status column already exists. Skipping migration.")
        
        conn.close()
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    migrate()

