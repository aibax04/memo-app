from database.connection import engine
from sqlalchemy import text

def add_duration_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE meeting_records ADD COLUMN duration INTEGER;"))
            conn.commit()
            print("Successfully added duration column to meeting_records table.")
        except Exception as e:
            print(f"Error adding duration column: {e}")

if __name__ == "__main__":
    add_duration_column()
