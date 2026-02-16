#!/usr/bin/env python3
"""
Database migration script to add custom_template_points column to meeting_records table.
Run this script to update your existing database schema.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import settings

def run_migration():
    """Add custom_template_points column to meeting_records table."""
    
    # Database connection
    DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if column already exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='meeting_records' 
                AND column_name='custom_template_points'
            """))
            
            if result.fetchone():
                print("✅ Column 'custom_template_points' already exists in meeting_records table.")
                return
            
            # Add the new column
            connection.execute(text("""
                ALTER TABLE meeting_records 
                ADD COLUMN custom_template_points TEXT
            """))
            
            connection.commit()
            print("✅ Successfully added 'custom_template_points' column to meeting_records table.")
            
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔄 Running database migration to add custom_template_points column...")
    run_migration()
    print("🎉 Migration completed successfully!")
