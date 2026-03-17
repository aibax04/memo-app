from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database.connection import get_db
from api.models.user import User
from api.models.pro_subscription import ProSubscription
from api.schemas.user import UserCreate, UserResponse
from api.services.auth_service import (
    verify_password, 
    get_password_hash, 
    create_token_pair,
    get_current_user
)
from config.settings import settings
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["basic-auth"])

class ActivateProRequest(BaseModel):
    promo_code: str

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    Also returns the user's pro subscription status.
    """
    logger.info(f"🔐 Login attempt for user: {form_data.username}")
    
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        logger.warning(f"❌ Login failed: User {form_data.username} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, user.password_hash):
        logger.warning(f"❌ Login failed: Invalid password for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        logger.warning(f"❌ Login failed: Inactive user {form_data.username}")
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Check pro subscription
    pro_sub = db.query(ProSubscription).filter(
        ProSubscription.user_id == user.id,
        ProSubscription.is_active == True
    ).first()
    
    # Generate tokens
    tokens = create_token_pair(user.email)
    tokens["is_pro"] = pro_sub is not None
    logger.info(f"✅ Login successful for {form_data.username} (pro={tokens['is_pro']})")
    return tokens


@router.get("/pro-status")
async def get_pro_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if the current user has an active pro subscription"""
    pro_sub = db.query(ProSubscription).filter(
        ProSubscription.user_id == current_user.id,
        ProSubscription.is_active == True
    ).first()
    return {"is_pro": pro_sub is not None}


@router.post("/activate-pro")
async def activate_pro_subscription(
    request: ActivateProRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlock Pro via a promo code"""
    if request.promo_code.strip().upper() != settings.PROMO_CODE.upper():
        logger.warning(f"🚫 Invalid promo code attempt by {current_user.email}")
        raise HTTPException(status_code=400, detail="Invalid promo code")

    # Check if already has a record
    pro_sub = db.query(ProSubscription).filter(ProSubscription.user_id == current_user.id).first()

    if pro_sub:
        pro_sub.is_active = True
        pro_sub.granted_at = datetime.utcnow()
        pro_sub.granted_by = "promo_code"
        pro_sub.revoked_at = None
    else:
        pro_sub = ProSubscription(
            user_id=current_user.id,
            is_active=True,
            granted_by="promo_code",
            granted_at=datetime.utcnow()
        )
        db.add(pro_sub)

    db.commit()
    logger.info(f"✨ Pro activated for {current_user.email} via promo code")
    return {"status": "ok", "message": "Pro unlocked successfully!"}


@router.post("/revoke-pro")
async def revoke_pro_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually revoke Pro status (User initiated)"""
    pro_sub = db.query(ProSubscription).filter(
        ProSubscription.user_id == current_user.id,
        ProSubscription.is_active == True
    ).first()

    if not pro_sub:
        raise HTTPException(status_code=400, detail="No active Pro subscription found")

    pro_sub.is_active = False
    pro_sub.revoked_at = datetime.utcnow()
    pro_sub.notes = f"Self-revoked by user at {datetime.utcnow()}"

    db.commit()
    logger.info(f"📉 Pro revoked by user: {current_user.email}")
    return {"status": "ok", "message": "Pro subscription revoked"}


@router.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Public user registration – DISABLED.
    User accounts are now created exclusively via the Admin Dashboard.
    """
    logger.warning(f"🚫 Public signup attempt blocked for: {user.email}")
    raise HTTPException(
        status_code=403,
        detail="Public registration is disabled. Please contact your administrator."
    )
