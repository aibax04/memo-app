from sqlalchemy.orm import Session
from database.connection import SessionLocal
from api.models.user import User
from api.models.meeting import MeetingRecord
from api.models.speaker_profile import SpeakerProfile
from api.models.dashboard import Dashboard
from api.models.chart import Chart
from api.services.auth_service import get_password_hash
import uuid

def seed_users():
    db = SessionLocal()
    try:
        users_to_seed = [
            {"email": "demo@example.com", "password": "password", "name": "Demo User"},
            {"email": "hardik@indika.ai", "password": "hardik", "name": "Hardik Dave"}
        ]
        
        for u_data in users_to_seed:
            db_user = db.query(User).filter(User.email == u_data["email"]).first()
            if not db_user:
                print(f"Creating user: {u_data['email']}")
                hashed_password = get_password_hash(u_data["password"])
                db_user = User(
                    email=u_data["email"],
                    name=u_data["name"],
                    password_hash=hashed_password,
                    auth_provider="local",
                    is_active=True
                )
                db.add(db_user)
            else:
                print(f"User {u_data['email']} already exists.")
        
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
