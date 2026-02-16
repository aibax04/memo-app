from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from api.models.user import User
from api.services.auth_service import create_token_pair
from config.settings import settings
import logging
import httpx

logger = logging.getLogger(__name__)

class BaseAuthService:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str, token_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.token_url = token_url

    async def get_token_from_code(self, auth_code: str, redirect_uri: str = None) -> Dict[str, Any]:
        """Exchange authorization code for access token (Common Logic)"""
        actual_redirect_uri = redirect_uri or self.redirect_uri
        
        async with httpx.AsyncClient() as client:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": auth_code,
                "redirect_uri": actual_redirect_uri,
                "grant_type": "authorization_code"
            }
            
            logger.info(f"📤 Sending token request to: {self.token_url}")
            
            try:
                response = await client.post(self.token_url, data=data)
                
                if response.status_code != 200:
                    logger.error(f"❌ Token exchange failed with status: {response.status_code}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to get access token. Status: {response.status_code}, Response: {response.text}"
                    )
                
                token_data = response.json()
                logger.info("✅ Access token received successfully")
                return token_data
                
            except httpx.HTTPError as e:
                logger.error(f"❌ HTTP error during token exchange: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"HTTP error during token exchange: {str(e)}"
                )

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Abstract method to get user info from provider"""
        raise NotImplementedError("Subclasses must implement get_user_info")

    def validate_company_email(self, email: str) -> bool:
        """Validate that email is from one of the allowed company domains"""
        logger.info(f"🔍 Validating company email: {email}")
        logger.info(f"🔍 Allowed domains: {settings.COMPANY_DOMAINS}")
        
        # Check if email ends with any of the allowed domains
        is_valid = any(email.lower().endswith(f"@{domain}") for domain in settings.COMPANY_DOMAINS)
        
        if is_valid:
            matched_domain = next((domain for domain in settings.COMPANY_DOMAINS if email.lower().endswith(f"@{domain}")), None)
            logger.info(f"✅ Email {email} is valid for domain @{matched_domain}")
        else:
            logger.warning(f"⚠️  Email {email} is not valid for any allowed domains: {settings.COMPANY_DOMAINS}")
        
        return is_valid

    async def authenticate_user(self, auth_code: str, db: Session, redirect_uri: str = None, provider: str = "google") -> Dict[str, Any]:
        """Complete authentication flow (Common Logic)"""
        # 1. Get Access Token
        token_data = await self.get_token_from_code(auth_code, redirect_uri)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail=f"No access token received from {provider}")

        # 2. Get User Info
        user_info = await self.get_user_info(access_token)
        
        # Normalize user info (Subclasses should ensure these keys exist or we handle it here)
        email = user_info.get("email") # Expecting subclasses to normalize this if needed
        name = user_info.get("name", "Unknown")

        if not email:
            raise HTTPException(status_code=400, detail=f"No email found in {provider} user info")

        # 3. Find or Create User
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logger.info(f"🆕 Creating new user: {name} ({email})")
            user = User(
                name=name,
                email=email,
                is_active=True,
                auth_provider=provider
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
             # Update auth provider if needed
            if user.auth_provider != provider:
                user.auth_provider = provider
                db.commit()
                db.refresh(user)
            
            if not user.is_active:
                raise HTTPException(status_code=403, detail="User account is deactivated")

        # 4. Generate JWT
        jwt_token_data = create_token_pair(user.email)
        
        # 5. Return Result
        return {
            "success": True,
            "access_token": jwt_token_data["access_token"],
            "refresh_token": jwt_token_data["refresh_token"],
            "token_type": jwt_token_data["token_type"],
            "expires_in": jwt_token_data["expires_in"],
            f"{provider}_access_token": access_token,
            f"{provider}_refresh_token": token_data.get("refresh_token"),
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "company": settings.COMPANY_DOMAIN,
                "auth_provider": user.auth_provider
            }
        }
