import sqlite3
import os

db_path = "/home/ubuntu/memoapp/memwebapp/backend/meeting_records.db"

def fix_db():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get current columns
    cursor.execute("PRAGMA table_info(meeting_records)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Current columns: {columns}")

    # Columns to add
    to_add = [
        ("duration", "INTEGER"),
        ("platform", "TEXT"),
        ("analytics_status", "TEXT DEFAULT 'PENDING'"),
        ("analytics_data", "TEXT")
    ]

    for col_name, col_type in to_add:
        if col_name not in columns:
            print(f"Adding column {col_name}...")
            try:
                cursor.execute(f"ALTER TABLE meeting_records ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column {col_name} already exists.")

    conn.commit()
    conn.close()
    print("Database fix complete.")

if __name__ == "__main__":
    fix_db()
