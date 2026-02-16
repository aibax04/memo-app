from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.microsoft_auth_service import microsoft_auth_service
from api.models.user import User
from config.settings import settings
import logging
from api.routers.utils.auth_utils import get_redirect_uri_microsoft, create_auth_redirect_response

# Set up logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/microsoft", tags=["microsoft-authentication"])

@router.get("/login")
async def microsoft_login(request: Request):
    """Redirect user to Microsoft OAuth2 login"""
    logger.info("🚀 Microsoft login initiated - generating auth URL")
    
    redirect_uri = get_redirect_uri_microsoft(request)
    auth_url = microsoft_auth_service.get_auth_url(redirect_uri)
    logger.info(f"🔗 Generated Microsoft auth URL: {auth_url}")
    
    return RedirectResponse(url=auth_url)

@router.post("/callback")
async def microsoft_callback_post(request: Request, db: Session = Depends(get_db)):
    """Handle Microsoft OAuth2 callback via POST"""
    logger.info("📥 POST callback received - processing Microsoft authentication")
    
    try:
        body = await request.json()
        code = body.get("code")
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization code is required"
            )
        
        redirect_uri = get_redirect_uri_microsoft(request)
        
        # Authenticate user
        auth_result = await microsoft_auth_service.authenticate_microsoft_user(code, db, redirect_uri)
        logger.info("✅ Microsoft authentication successful")
        
        # For development: Always redirect to custom scheme for mobile apps
        if settings.NODE_ENV == "development":
            return create_auth_redirect_response(request, auth_result, "microsoft")
        
        return auth_result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Microsoft authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Microsoft authentication failed: {str(e)}"
        )

@router.get("/callback")
async def microsoft_callback_get(code: str, request: Request, db: Session = Depends(get_db)):
    """Handle Microsoft OAuth2 callback via GET"""
    logger.info("📥 GET callback received")
    
    try:
        redirect_uri = get_redirect_uri_microsoft(request)
        
        # Authenticate user
        auth_result = await microsoft_auth_service.authenticate_microsoft_user(code, db, redirect_uri)
        logger.info("✅ Microsoft authentication successful")
        
        return create_auth_redirect_response(request, auth_result, "microsoft")
        
    except Exception as e:
        logger.error(f"❌ Microsoft authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Microsoft authentication failed: {str(e)}"
        )

@router.get("/status")
async def microsoft_auth_status():
    """Check Microsoft authentication configuration status"""
    return {
        "configured": bool(microsoft_auth_service.client_id != "your-microsoft-client-id"),
        "tenant_id": microsoft_auth_service.tenant_id,
        "redirect_uri": microsoft_auth_service.redirect_uri,
        "environment": settings.NODE_ENV,
        "message": "Configure Microsoft Azure AD credentials to enable authentication"
    }

@router.post("/test-auth")
async def test_microsoft_auth_for_swagger(
    email: str = "test@panscience.ai",
    name: str = "Test User",
    db: Session = Depends(get_db)
):
    """Test endpoint for Swagger UI"""
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=name, email=email, is_active=True, auth_provider="microsoft")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # We don't necessarily update provider here in test, but okay
            pass
        
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
