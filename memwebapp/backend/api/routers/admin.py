from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database.connection import get_db
from api.models.user import User
from api.models.meeting import MeetingRecord, TranscriptionStatus
from api.models.pro_subscription import ProSubscription
from api.schemas.user import UserCreate, UserResponse
from api.services.auth_service import get_password_hash
from config.settings import settings
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ──────────────────────────────────────────
# Admin Key Dependency
# ──────────────────────────────────────────
def verify_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Verify the admin key from request header"""
    if not settings.ADMIN_KEY:
        raise HTTPException(status_code=500, detail="Admin key not configured on server")
    if x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


# ──────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserWithStats(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    auth_provider: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    meeting_count: int = 0
    completed_meetings: int = 0
    total_duration_minutes: int = 0
    last_meeting_at: Optional[datetime] = None
    is_pro: bool = False

    class Config:
        from_attributes = True

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_meetings: int
    completed_meetings: int
    pending_meetings: int
    failed_meetings: int
    total_duration_minutes: int
    meetings_today: int
    meetings_this_week: int
    meetings_this_month: int
    total_pro_users: int

class AdminLoginRequest(BaseModel):
    admin_key: str

class AdminLoginResponse(BaseModel):
    success: bool
    message: str


# ──────────────────────────────────────────
# Auth Endpoint
# ──────────────────────────────────────────
@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """Validate admin key - used by frontend to authenticate admin"""
    if not settings.ADMIN_KEY:
        raise HTTPException(status_code=500, detail="Admin key not configured")
    if request.admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return AdminLoginResponse(success=True, message="Admin authenticated")


# ──────────────────────────────────────────
# Dashboard Stats
# ──────────────────────────────────────────
@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Get overall platform statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_meetings = db.query(func.count(MeetingRecord.id)).scalar() or 0
    completed = db.query(func.count(MeetingRecord.id)).filter(
        MeetingRecord.status == TranscriptionStatus.COMPLETED
    ).scalar() or 0
    pending = db.query(func.count(MeetingRecord.id)).filter(
        MeetingRecord.status.in_([TranscriptionStatus.PENDING, TranscriptionStatus.PROCESSING])
    ).scalar() or 0
    failed = db.query(func.count(MeetingRecord.id)).filter(
        MeetingRecord.status == TranscriptionStatus.FAILED
    ).scalar() or 0
    total_duration = db.query(func.coalesce(func.sum(MeetingRecord.duration), 0)).scalar() or 0
    meetings_today = db.query(func.count(MeetingRecord.id)).filter(
        MeetingRecord.created_at >= today_start
    ).scalar() or 0
    meetings_week = db.query(func.count(MeetingRecord.id)).filter(
        MeetingRecord.created_at >= week_start
    ).scalar() or 0
    meetings_month = db.query(func.count(MeetingRecord.id)).filter(
        MeetingRecord.created_at >= month_start
    ).scalar() or 0

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_meetings=total_meetings,
        completed_meetings=completed,
        pending_meetings=pending,
        failed_meetings=failed,
        total_duration_minutes=total_duration,
        meetings_today=meetings_today,
        meetings_this_week=meetings_week,
        meetings_this_month=meetings_month,
        total_pro_users=db.query(func.count(ProSubscription.id)).filter(ProSubscription.is_active == True).scalar() or 0
    )


# ──────────────────────────────────────────
# Users CRUD
# ──────────────────────────────────────────
@router.get("/users", response_model=List[UserWithStats])
async def get_all_users(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Get all users with their meeting stats"""
    users = db.query(User).order_by(desc(User.created_at)).all()
    result = []

    for user in users:
        meeting_count = db.query(func.count(MeetingRecord.id)).filter(
            MeetingRecord.user_id == user.id
        ).scalar() or 0
        
        completed = db.query(func.count(MeetingRecord.id)).filter(
            MeetingRecord.user_id == user.id,
            MeetingRecord.status == TranscriptionStatus.COMPLETED
        ).scalar() or 0
        
        total_dur = db.query(func.coalesce(func.sum(MeetingRecord.duration), 0)).filter(
            MeetingRecord.user_id == user.id
        ).scalar() or 0

        last_meeting = db.query(func.max(MeetingRecord.created_at)).filter(
            MeetingRecord.user_id == user.id
        ).scalar()

        result.append(UserWithStats(
            id=user.id,
            name=user.name,
            email=user.email,
            is_active=user.is_active,
            auth_provider=user.auth_provider or "local",
            created_at=user.created_at,
            updated_at=user.updated_at,
            meeting_count=meeting_count,
            completed_meetings=completed,
            total_duration_minutes=total_dur,
            last_meeting_at=last_meeting,
            is_pro=db.query(ProSubscription).filter(
                ProSubscription.user_id == user.id,
                ProSubscription.is_active == True
            ).first() is not None,
        ))

    return result


@router.post("/users", response_model=UserWithStats)
async def create_user(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Admin: Create a new user account"""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed,
        auth_provider="local",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"✅ Admin created user: {new_user.email} (ID: {new_user.id})")

    return UserWithStats(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        is_active=new_user.is_active,
        auth_provider=new_user.auth_provider or "local",
        created_at=new_user.created_at,
        updated_at=new_user.updated_at,
        meeting_count=0,
        completed_meetings=0,
        total_duration_minutes=0,
        last_meeting_at=None,
        is_pro=False
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    updates: AdminUserUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Admin: Update a user account"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if updates.name is not None:
        user.name = updates.name
    if updates.email is not None:
        # Check uniqueness
        existing = db.query(User).filter(User.email == updates.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = updates.email
    if updates.is_active is not None:
        user.is_active = updates.is_active
    if updates.password is not None:
        user.password_hash = get_password_hash(updates.password)

    db.commit()
    db.refresh(user)
    logger.info(f"✅ Admin updated user: {user.email} (ID: {user.id})")
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Admin: Delete a user and all their data"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete all meetings
    db.query(MeetingRecord).filter(MeetingRecord.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    logger.info(f"🗑️ Admin deleted user: {user.email} (ID: {user.id})")
    return {"status": "ok", "message": f"User {user.email} deleted"}


# ──────────────────────────────────────────
# User Meetings (for admin drill-down)
# ──────────────────────────────────────────
@router.get("/users/{user_id}/meetings")
async def get_user_meetings(
    user_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Get all meetings for a specific user"""
    meetings = db.query(MeetingRecord).filter(
        MeetingRecord.user_id == user_id
    ).order_by(desc(MeetingRecord.created_at)).limit(50).all()

    return [
        {
            "id": str(m.id),
            "title": m.title,
            "status": m.status.value if m.status else "UNKNOWN",
            "duration": m.duration,
            "platform": m.platform,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_processed": m.is_processed,
            "participants": m.participants or [],
        }
        for m in meetings
    ]


# ──────────────────────────────────────────
# Pro Subscription Management
# ──────────────────────────────────────────
@router.post("/users/{user_id}/toggle-pro")
async def toggle_user_pro(
    user_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """Admin: Grant or revoke Pro subscription for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pro_sub = db.query(ProSubscription).filter(ProSubscription.user_id == user_id).first()

    if pro_sub:
        # Toggle existing
        pro_sub.is_active = not pro_sub.is_active
        if not pro_sub.is_active:
            pro_sub.revoked_at = datetime.utcnow()
        else:
            pro_sub.granted_at = datetime.utcnow()
            pro_sub.revoked_at = None
        db.commit()
        status = "active" if pro_sub.is_active else "inactive"
        logger.info(f"✨ Admin toggled Pro for {user.email} to {status}")
        return {"status": "ok", "is_pro": pro_sub.is_active}
    else:
        # Create new
        new_sub = ProSubscription(
            user_id=user_id,
            is_active=True,
            granted_by="admin",
            granted_at=datetime.utcnow()
        )
        db.add(new_sub)
        db.commit()
        logger.info(f"✨ Admin granted Pro to {user.email}")
        return {"status": "ok", "is_pro": True}
