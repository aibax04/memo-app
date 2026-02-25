import sys
from sqlalchemy import create_engine
try:
    engine = create_engine('postgresql://memoapp:memoapp_secure_2026@localhost:5433/memoapp')
    with engine.connect() as conn:
        print("Connected to DB successfully!")
except Exception as e:
    print(f"Error connecting to DB: {e}")
    sys.exit(1)
