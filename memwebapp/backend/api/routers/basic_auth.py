from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database.connection import get_db
from api.models.user import User
from api.schemas.user import UserCreate, UserResponse
from api.services.auth_service import (
    verify_password, 
    get_password_hash, 
    create_token_pair
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["basic-auth"])

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.info(f"🔐 Login attempt for user: {form_data.username}")
    
    # form_data.username is the email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Verify user exists and password matches
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
        
    # Generate tokens
    tokens = create_token_pair(user.email)
    logger.info(f"✅ Login successful for {form_data.username}")
    return tokens

@router.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user with email and password
    """
    logger.info(f"👤 Creating new user: {user.email}")
    
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        logger.warning(f"❌ User creation failed: Email {user.email} already exists")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email, 
        name=user.name or tuple(user.email.split('@'))[0], 
        password_hash=hashed_password,
        auth_provider="local",
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"✅ User created successfully: {user.email} (ID: {db_user.id})")
    return db_user
