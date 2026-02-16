from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.google_auth_service import google_auth_service
from api.models.user import User
from config.settings import settings
import logging
from api.routers.utils.auth_utils import get_redirect_uri_google, create_auth_redirect_response

# Set up logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/google", tags=["google-authentication"])

@router.get("/login")
async def google_login(request: Request):
    """Redirect user to Google OAuth2 login"""
    logger.info("🚀 Google login initiated - generating auth URL")
    
    redirect_uri = get_redirect_uri_google(request)
    auth_url = google_auth_service.get_auth_url(redirect_uri)
    logger.info(f"🔗 Generated Google auth URL: {auth_url}")
    
    return RedirectResponse(url=auth_url)

@router.post("/callback")
async def google_callback_post(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth2 callback via POST"""
    logger.info("📥 POST callback received - processing Google authentication")
    
    try:
        body = await request.json()
        code = body.get("code")
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization code is required"
            )
        
        redirect_uri = get_redirect_uri_google(request)
        
        # Authenticate user
        auth_result = await google_auth_service.authenticate_google_user(code, db, redirect_uri)
        logger.info("✅ Google authentication successful")
        
        # For development: Always redirect to custom scheme for mobile apps
        if settings.NODE_ENV == "development":
            return create_auth_redirect_response(request, auth_result, "google")
        
        return auth_result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Google authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.get("/callback")
async def google_callback_get(code: str, request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth2 callback via GET"""
    logger.info("📥 GET callback received")
    
    try:
        redirect_uri = get_redirect_uri_google(request)
        
        # Authenticate user
        auth_result = await google_auth_service.authenticate_google_user(code, db, redirect_uri)
        logger.info("✅ Google authentication successful")
        
        return create_auth_redirect_response(request, auth_result, "google")
        
    except Exception as e:
        logger.error(f"❌ Google authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.get("/status")
async def google_auth_status():
    """Check Google authentication configuration status"""
    return {
        "configured": bool(google_auth_service.client_id != ""),
        "client_id": google_auth_service.client_id[:8] + "..." if google_auth_service.client_id else "Not configured",
        "redirect_uri": google_auth_service.redirect_uri,
        "environment": settings.NODE_ENV,
        "message": "Configure Google OAuth2 credentials to enable authentication"
    }

@router.post("/test-auth")
async def test_google_auth_for_swagger(
    email: str = "test@panscience.ai",
    name: str = "Test User",
    db: Session = Depends(get_db)
):
    """Test endpoint for Swagger UI"""
    # ... keeping test endpoint for convenience ... 
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=name, email=email, is_active=True, auth_provider="google")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.auth_provider = "google"
            db.commit()
            db.refresh(user)
        
        from api.services.auth_service import create_access_token
        jwt_token = create_access_token(data={"sub": user.email})
        
        return {
            "success": True,
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "auth_provider": user.auth_provider
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
