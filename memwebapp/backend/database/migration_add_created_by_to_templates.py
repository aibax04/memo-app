#!/usr/bin/env python3
"""
Database migration script to add created_by field to templates table.
This script adds a foreign key relationship to the users table to track who created each template.
Default templates will have created_by = NULL.
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import settings

def run_migration():
    """Add created_by field to templates table"""
    
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
            
            # Check if created_by column already exists
            column_check = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'templates' AND column_name = 'created_by'
                )
            """))
            
            if column_check.fetchone()[0]:
                print("⚠️  created_by column already exists in templates table.")
                return True
            
            print("🔄 Adding created_by column to templates table...")
            
            # Add created_by column
            connection.execute(text("""
                ALTER TABLE templates 
                ADD COLUMN created_by INTEGER REFERENCES users(id)
            """))
            
            # Add index for better query performance
            connection.execute(text("""
                CREATE INDEX idx_templates_created_by ON templates(created_by)
            """))
            
            connection.commit()
            print("✅ Successfully added created_by column to templates table.")
            print("✅ Added index on created_by column for better performance.")
            
            # Verify the column was added
            verify_result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'templates' AND column_name = 'created_by'
            """))
            
            column_info = verify_result.fetchone()
            if column_info:
                print(f"✅ Verification: created_by column added successfully")
                print(f"   - Data type: {column_info[1]}")
                print(f"   - Nullable: {column_info[2]}")
            else:
                print("❌ Verification failed: created_by column not found")
                return False
            
            return True
            
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Running database migration to add created_by field to templates...")
    success = run_migration()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)
