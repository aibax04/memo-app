#!/usr/bin/env python3
"""
Migration script to add action_items column to meeting_records table
This script adds a new JSON column to store action items extracted from transcriptions
"""

import sys
import os
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

def migrate_add_action_items():
    """Add action_items column to meeting_records table"""
    
    # Create engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            logger.info("Starting migration to add action_items column...")
            
            # Check if column already exists
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='meeting_records' AND column_name='action_items'
            """))
            exists = result.fetchone()
            
            if exists:
                logger.info("action_items column already exists. Migration not needed.")
                return
            
            # Add the column
            logger.info("Adding action_items column to meeting_records table...")
            db.execute(text("""
                ALTER TABLE meeting_records 
                ADD COLUMN action_items JSON
            """))
            db.commit()
            
            logger.info("Migration completed successfully! action_items column added.")
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            db.rollback()
            raise

if __name__ == "__main__":
    migrate_add_action_items()

