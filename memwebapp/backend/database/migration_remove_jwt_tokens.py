#!/usr/bin/env python3
"""
Database migration script to remove JWT refresh token fields from the User table.
This script removes refresh_token and refresh_token_expires_at columns from the users table.
"""

import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config.settings import settings
import logging

# Set up logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def run_migration():
    """Run the JWT tokens removal migration"""
    try:
        # Create database engine
        engine = create_engine(settings.DATABASE_URL)
        
        logger.info("🔧 Starting JWT tokens removal migration...")
        logger.info(f"📊 Database URL: {settings.DATABASE_URL}")
        
        # Check if columns exist before removing
        with engine.connect() as conn:
            # Check if refresh_token column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'refresh_token'
            """))
            
            refresh_token_exists = result.fetchone() is not None
            
            # Check if refresh_token_expires_at column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'refresh_token_expires_at'
            """))
            
            refresh_token_expires_at_exists = result.fetchone() is not None
            
            if not refresh_token_exists and not refresh_token_expires_at_exists:
                logger.info("✅ JWT token columns don't exist. Migration not needed.")
                return True
            
            # Remove refresh_token column if it exists
            if refresh_token_exists:
                logger.info("➖ Removing refresh_token column...")
                conn.execute(text("""
                    ALTER TABLE users 
                    DROP COLUMN refresh_token
                """))
                conn.commit()
                logger.info("✅ refresh_token column removed successfully")
            else:
                logger.info("ℹ️  refresh_token column doesn't exist")
            
            # Remove refresh_token_expires_at column if it exists
            if refresh_token_expires_at_exists:
                logger.info("➖ Removing refresh_token_expires_at column...")
                conn.execute(text("""
                    ALTER TABLE users 
                    DROP COLUMN refresh_token_expires_at
                """))
                conn.commit()
                logger.info("✅ refresh_token_expires_at column removed successfully")
            else:
                logger.info("ℹ️  refresh_token_expires_at column doesn't exist")
        
        logger.info("🎉 JWT tokens removal migration completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        logger.error(f"🔍 Error type: {type(e).__name__}")
        import traceback
        logger.error(f"📚 Full traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting JWT tokens removal database migration...")
    
    success = run_migration()
    
    if success:
        logger.info("✅ Migration completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed!")
        sys.exit(1)
