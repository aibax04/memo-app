#!/usr/bin/env python3
"""
Database migration script to add speaker_diarization field to templates table.
This script adds a text column to store speaker identification instructions.
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import settings

# Default speaker diarization prompt
DEFAULT_SPEAKER_DIARIZATION_PROMPT = """**SPEAKER IDENTIFICATION:**
- Listen carefully for when speakers introduce themselves or mention their names
- If a speaker says "Hi, I'm John" or "My name is Sarah", use "John" or "Sarah" as the speaker name
- If speakers mention their roles like "I'm the manager" or "I'm the customer", use those roles
- If you can identify distinct voices but no names are mentioned, use "Speaker1", "Speaker2", etc.
- Pay attention to how speakers refer to each other in conversation
- Use the most specific identifier available (actual name > role > generic speaker)"""

def run_migration():
    """Add speaker_diarization field to templates table"""
    
    # Database connection
    DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if templates table exists
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'templates'
                )
            """))
            
            if not result.fetchone()[0]:
                print("❌ Templates table does not exist. Please run the main migration first.")
                return False
            
            # Check if speaker_diarization column already exists
            column_check = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'templates' AND column_name = 'speaker_diarization'
                )
            """))
            
            if column_check.fetchone()[0]:
                print("⚠️  speaker_diarization column already exists in templates table.")
                return True
            
            print("🔄 Adding speaker_diarization column to templates table...")
            
            # Add speaker_diarization column
            connection.execute(text("""
                ALTER TABLE templates 
                ADD COLUMN speaker_diarization TEXT
            """))
            
            print("✅ Successfully added speaker_diarization column to templates table.")
            
            # Update all existing templates with the default speaker diarization prompt
            print("🔄 Populating speaker_diarization for all existing templates...")
            
            update_result = connection.execute(text("""
                UPDATE templates 
                SET speaker_diarization = :prompt
                WHERE speaker_diarization IS NULL
            """), {"prompt": DEFAULT_SPEAKER_DIARIZATION_PROMPT})
            
            connection.commit()
            
            rows_updated = update_result.rowcount
            print(f"✅ Updated {rows_updated} template(s) with default speaker diarization prompt.")
            
            # Verify the column was added
            verify_result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'templates' AND column_name = 'speaker_diarization'
            """))
            
            column_info = verify_result.fetchone()
            if column_info:
                print(f"✅ Verification: speaker_diarization column added successfully")
                print(f"   - Data type: {column_info[1]}")
                print(f"   - Nullable: {column_info[2]}")
            else:
                print("❌ Verification failed: speaker_diarization column not found")
                return False
            
            # Count total templates
            count_result = connection.execute(text("""
                SELECT COUNT(*) FROM templates
            """))
            total_templates = count_result.fetchone()[0]
            print(f"📊 Total templates in database: {total_templates}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Running database migration to add speaker_diarization field to templates...")
    success = run_migration()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)

