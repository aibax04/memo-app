from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from api.models.user import User
from api.schemas.user import UserResponse
from api.services.auth_service import get_current_user, refresh_access_token
from pydantic import BaseModel
import logging

# Set up logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    logger.info("🔄 Refresh token request received")
    
    try:
        # Use the refresh token to get a new access token
        token_data = refresh_access_token(request.refresh_token, db)
        
        logger.info("✅ Access token refreshed successfully")
        
        return TokenResponse(
            access_token=token_data["access_token"],
            token_type=token_data["token_type"],
            expires_in=token_data["expires_in"]
        )
        
    except HTTPException as e:
        logger.warning(f"❌ Token refresh failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"❌ Unexpected error during token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token refresh"
        )
