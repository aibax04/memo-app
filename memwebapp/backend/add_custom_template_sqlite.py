#!/usr/bin/env python3
"""
SQLite migration script to add custom_template_points column to meeting_records table.
"""

import sqlite3
import os

def run_sqlite_migration():
    """Add custom_template_points column to meeting_records table in SQLite."""
    
    db_path = 'meeting_records.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(meeting_records)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'custom_template_points' in columns:
            print("✅ Column 'custom_template_points' already exists in meeting_records table.")
            conn.close()
            return True
        
        # Add the new column
        cursor.execute("""
            ALTER TABLE meeting_records 
            ADD COLUMN custom_template_points TEXT
        """)
        
        conn.commit()
        print("✅ Successfully added 'custom_template_points' column to meeting_records table.")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(meeting_records)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'custom_template_points' in columns:
            print("✅ Verification successful: custom_template_points column is now present.")
        else:
            print("❌ Verification failed: custom_template_points column was not added.")
            return False
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Running SQLite migration to add custom_template_points column...")
    success = run_sqlite_migration()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!")
