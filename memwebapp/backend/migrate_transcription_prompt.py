#!/usr/bin/env python3
"""
Migration script to add transcription_prompt column to templates table.
"""

import sys
from sqlalchemy import text
from database.connection import engine

def migrate_transcription_prompt():
    """Add transcription_prompt column to templates table"""
    print("🚀 Starting transcription_prompt column migration...")
    
    try:
        with engine.connect() as conn:
            # Add the new column
            conn.execute(text("""
                ALTER TABLE templates 
                ADD COLUMN IF NOT EXISTS transcription_prompt TEXT
            """))
            
            # Commit the changes
            conn.commit()
            
        print("✅ Successfully added transcription_prompt column to templates table")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = migrate_transcription_prompt()
    sys.exit(0 if success else 1)
