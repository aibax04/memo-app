"""
Database migration to convert meeting_records.id from integer to UUID
and add s3_audio_path field.

This migration:
1. Adds a new UUID column (id_new) 
2. Adds s3_audio_path column
3. Generates UUIDs for existing records
4. Updates foreign key references
5. Drops old id column and renames id_new to id
6. Updates indexes and constraints

Run this migration carefully in a production environment!
"""

import os
import sys
import uuid
from sqlalchemy import create_engine, text, MetaData, Table, Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import sessionmaker
from config.settings import settings

def run_migration():
    """Run the UUID and S3 migration"""
    
    # Create database connection
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🚀 Starting UUID and S3 migration...")
        
        # Step 1: Add new UUID column and S3 path column
        print("📝 Step 1: Adding new UUID column and S3 path column...")
        session.execute(text("""
            ALTER TABLE meeting_records 
            ADD COLUMN id_new UUID DEFAULT gen_random_uuid(),
            ADD COLUMN s3_audio_path VARCHAR(500);
        """))
        session.commit()
        print("✅ Added new columns")
        
        # Step 2: Generate UUIDs for existing records
        print("🔄 Step 2: Generating UUIDs for existing records...")
        result = session.execute(text("SELECT id FROM meeting_records ORDER BY id"))
        existing_ids = [row[0] for row in result.fetchall()]
        
        for old_id in existing_ids:
            new_uuid = str(uuid.uuid4())
            session.execute(text("""
                UPDATE meeting_records 
                SET id_new = :new_uuid 
                WHERE id = :old_id
            """), {"new_uuid": new_uuid, "old_id": old_id})
        
        session.commit()
        print(f"✅ Generated UUIDs for {len(existing_ids)} existing records")
        
        # Step 3: Drop foreign key constraints temporarily
        print("🔧 Step 3: Dropping foreign key constraints...")
        session.execute(text("""
            ALTER TABLE meeting_records 
            DROP CONSTRAINT IF EXISTS meeting_records_user_id_fkey;
        """))
        session.commit()
        print("✅ Dropped foreign key constraints")
        
        # Step 4: Drop old id column and rename new column
        print("🔄 Step 4: Replacing old id column with new UUID column...")
        session.execute(text("""
            ALTER TABLE meeting_records 
            DROP COLUMN id;
        """))
        session.execute(text("""
            ALTER TABLE meeting_records 
            RENAME COLUMN id_new TO id;
        """))
        session.execute(text("""
            ALTER TABLE meeting_records 
            ALTER COLUMN id SET NOT NULL;
        """))
        session.commit()
        print("✅ Replaced id column with UUID")
        
        # Step 5: Add primary key constraint
        print("🔑 Step 5: Adding primary key constraint...")
        session.execute(text("""
            ALTER TABLE meeting_records 
            ADD PRIMARY KEY (id);
        """))
        session.commit()
        print("✅ Added primary key constraint")
        
        # Step 6: Recreate foreign key constraint
        print("🔗 Step 6: Recreating foreign key constraint...")
        session.execute(text("""
            ALTER TABLE meeting_records 
            ADD CONSTRAINT meeting_records_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id);
        """))
        session.commit()
        print("✅ Recreated foreign key constraint")
        
        # Step 7: Recreate indexes
        print("📊 Step 7: Recreating indexes...")
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_records_id ON meeting_records (id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_records_user_id ON meeting_records (user_id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_records_status ON meeting_records (status);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_records_analytics_status ON meeting_records (analytics_status);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_records_title ON meeting_records (title);
        """))
        session.commit()
        print("✅ Recreated indexes")
        
        # Step 8: Verify migration
        print("🔍 Step 8: Verifying migration...")
        result = session.execute(text("""
            SELECT COUNT(*) as total_records,
                   COUNT(s3_audio_path) as records_with_s3_path,
                   COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as records_with_uuid
            FROM meeting_records
        """))
        
        stats = result.fetchone()
        print(f"📊 Migration verification:")
        print(f"   Total records: {stats[0]}")
        print(f"   Records with UUID: {stats[2]}")
        print(f"   Records with S3 path: {stats[1]}")
        
        if stats[0] == stats[2]:
            print("✅ Migration completed successfully!")
        else:
            print("❌ Migration verification failed!")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        return False
    finally:
        session.close()

def rollback_migration():
    """Rollback the migration (WARNING: This will lose data!)"""
    print("⚠️  WARNING: This will rollback the UUID migration and may cause data loss!")
    print("This operation is not recommended in production.")
    
    response = input("Are you sure you want to continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Rollback cancelled.")
        return False
    
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🔄 Rolling back migration...")
        
        # This is a simplified rollback - in production, you'd need a more sophisticated approach
        print("❌ Rollback not implemented for safety reasons.")
        print("Please restore from backup if rollback is needed.")
        
        return False
        
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        return False
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback_migration()
    else:
        print("UUID and S3 Migration Script")
        print("==========================")
        print("This will convert meeting_records.id from integer to UUID")
        print("and add s3_audio_path field.")
        print()
        print("⚠️  WARNING: This is a destructive operation!")
        print("Make sure to backup your database before running this migration.")
        print()
        
        response = input("Do you want to continue? (yes/no): ")
        if response.lower() == 'yes':
            success = run_migration()
            if success:
                print("\n🎉 Migration completed successfully!")
                print("You can now use UUID-based meeting IDs and S3 audio storage.")
            else:
                print("\n❌ Migration failed!")
                sys.exit(1)
        else:
            print("Migration cancelled.")
