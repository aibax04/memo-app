from typing import Dict, Any
from urllib.parse import urlencode
from fastapi import HTTPException, status
import logging
import httpx
from config.settings import settings
from config.google_config import google_config
from api.services.base_auth_service import BaseAuthService

logger = logging.getLogger(__name__)

class GoogleAuthService(BaseAuthService):
    def __init__(self):
        super().__init__(
            client_id=google_config.CLIENT_ID,
            client_secret=google_config.CLIENT_SECRET,
            redirect_uri=google_config.REDIRECT_URI,
            token_url=google_config.TOKEN_URL
        )
        logger.info("🔧 GoogleAuthService initialized")

    def get_auth_url(self, redirect_uri: str = None, state: str = None) -> str:
        """Generate Google OAuth2 authorization URL"""
        actual_redirect_uri = redirect_uri or self.redirect_uri

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": actual_redirect_uri,
            "scope": " ".join(google_config.SCOPES),
            "access_type": "offline",
            "prompt": "select_account",
        }
        if state:
            # Google echoes this back untouched on the callback -- used to
            # remember which page the user started from (e.g. a specific
            # meeting's chatbot) so we can send them back there afterward
            # instead of dumping them on a generic default page.
            params["state"] = state
        auth_url = f"{google_config.AUTH_URL}?{urlencode(params)}"
        
        logger.info(f"🔗 Generated Google auth URL: {auth_url}")
        return auth_url

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Google OAuth2 API"""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            try:
                response = await client.get(google_config.USER_INFO_URL, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"❌ Failed to get user info. Status: {response.status_code}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to get user info from Google. Status: {response.status_code}"
                    )
                
                user_info = response.json()
                logger.info(f"✅ User information retrieved: {user_info.get('email')}")
                return user_info
                
            except httpx.HTTPError as e:
                logger.error(f"❌ HTTP error during user info fetch: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"HTTP error during user info fetch: {str(e)}"
                )

    async def authenticate_google_user(self, auth_code: str, db: Any, redirect_uri: str = None) -> Dict[str, Any]:
        """Wrapper for authenticate_user to maintain backward compatibility if needed, or alias."""
        return await self.authenticate_user(auth_code, db, redirect_uri, provider="google")

# Global instance
google_auth_service = GoogleAuthService()
