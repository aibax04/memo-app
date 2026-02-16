from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database.connection import get_db
from api.models.user import User
from config.settings import settings
import secrets
import logging

# Set up logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

# JWT token scheme
security = HTTPBearer()

# Password hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token (6 hours by default)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow()
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    logger.info(f"🔐 Access token created for user: {data.get('sub', 'unknown')}")
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token (7 days by default)"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(32)  # Unique token ID for revocation
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    logger.info(f"🔄 Refresh token created for user: {data.get('sub', 'unknown')}")
    return encoded_jwt

def create_token_pair(user_email: str) -> Dict[str, Any]:
    """Create both access and refresh tokens for a user"""
    data = {"sub": user_email}
    
    access_token = create_access_token(data)
    refresh_token = create_refresh_token(data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600  # in seconds
    }

def verify_access_token(token: str) -> Optional[str]:
    """Verify and decode an access token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        
        # Check if it's an access token
        if payload.get("type") != "access":
            logger.warning("❌ Token is not an access token")
            return None
            
        email: str = payload.get("sub")
        if email is None:
            logger.warning("❌ No email found in access token")
            return None
            
        logger.info(f"✅ Access token verified for user: {email}")
        return email
    except JWTError as e:
        logger.warning(f"❌ Access token verification failed: {str(e)}")
        return None

def verify_refresh_token(token: str) -> Optional[str]:
    """Verify and decode a refresh token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        
        # Check if it's a refresh token
        if payload.get("type") != "refresh":
            logger.warning("❌ Token is not a refresh token")
            return None
            
        email: str = payload.get("sub")
        if email is None:
            logger.warning("❌ No email found in refresh token")
            return None
            
        logger.info(f"✅ Refresh token verified for user: {email}")
        return email
    except JWTError as e:
        logger.warning(f"❌ Refresh token verification failed: {str(e)}")
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get the current authenticated user from access token"""
    token = credentials.credentials
    logger.info(f"🔍 Verifying access token: {token[:20]}...")
    
    email = verify_access_token(token)
    if email is None:
        logger.warning("❌ Access token verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"❌ User not found for email: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"❌ User account is deactivated: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"✅ User authenticated: {user.email}")
    return user

def refresh_access_token(refresh_token: str, db: Session) -> Dict[str, Any]:
    """Refresh an access token using a refresh token - STATELESS VERSION"""
    logger.info("🔄 Attempting to refresh access token")
    
    # Verify the refresh token (stateless - no database lookup needed)
    email = verify_refresh_token(refresh_token)
    if email is None:
        logger.warning("❌ Invalid refresh token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user from database (only to verify user exists and is active)
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"❌ User not found for email: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        logger.warning(f"❌ User account is deactivated: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated"
        )
    
    # Create new access token
    data = {"sub": user.email}
    new_access_token = create_access_token(data)
    
    logger.info(f"✅ New access token created for user: {user.email}")
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600
    }

# Backward compatibility
def verify_token(token: str) -> Optional[str]:
    """Backward compatibility function - now verifies access tokens"""
    return verify_access_token(token)