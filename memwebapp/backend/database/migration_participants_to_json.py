#!/usr/bin/env python3
"""
Migration script to convert participants field from Text to JSON array
This script converts existing string participants (comma-separated) to JSON arrays
"""

import sys
import os
import json
import logging
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to Python path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings

# Setup logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def migrate_participants_to_json():
    """Migrate participants field from Text to JSON array format"""
    
    # Create engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            logger.info("Starting migration of participants field from Text to JSON...")
            
            # First, let's see what we're working with
            result = db.execute(text("SELECT COUNT(*) as total FROM meeting_records WHERE participants IS NOT NULL"))
            total_records = result.fetchone().total
            logger.info(f"Found {total_records} records with non-null participants field")
            
            if total_records == 0:
                logger.info("No records to migrate. Migration complete.")
                return
            
            # Get all records with participants
            result = db.execute(text("SELECT id, participants FROM meeting_records WHERE participants IS NOT NULL"))
            records = result.fetchall()
            
            migrated_count = 0
            for record in records:
                record_id = record.id
                participants_str = record.participants
                
                try:
                    # Try to parse as JSON first (in case it's already JSON)
                    participants_list = json.loads(participants_str)
                    if isinstance(participants_list, list):
                        logger.info(f"Record {record_id}: Already JSON format, skipping")
                        continue
                except (json.JSONDecodeError, TypeError):
                    pass
                
                # Convert string to list
                if isinstance(participants_str, str) and participants_str.strip():
                    # Split by comma and clean up
                    participants_list = [p.strip() for p in participants_str.split(',') if p.strip()]
                else:
                    participants_list = []
                
                # Convert to JSON
                participants_json = json.dumps(participants_list)
                
                # Update the record
                db.execute(
                    text("UPDATE meeting_records SET participants = :participants WHERE id = :id"),
                    {"participants": participants_json, "id": record_id}
                )
                
                migrated_count += 1
                logger.info(f"Record {record_id}: '{participants_str}' -> {participants_list}")
            
            # Commit the changes
            db.commit()
            logger.info(f"Successfully migrated {migrated_count} records")
            
            # Now alter the column type to JSON (this is PostgreSQL specific)
            logger.info("Altering column type to JSON...")
            db.execute(text("ALTER TABLE meeting_records ALTER COLUMN participants TYPE JSON USING participants::json"))
            db.commit()
            
            logger.info("Migration completed successfully!")
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            db.rollback()
            raise

if __name__ == "__main__":
    migrate_participants_to_json()
