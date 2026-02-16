from typing import Dict, Any
from fastapi import HTTPException, status
import logging
import httpx
from config.settings import settings
from config.microsoft_config import microsoft_config
from api.services.base_auth_service import BaseAuthService

logger = logging.getLogger(__name__)

class MicrosoftAuthService(BaseAuthService):
    def __init__(self):
        super().__init__(
            client_id=microsoft_config.CLIENT_ID,
            client_secret=microsoft_config.CLIENT_SECRET,
            redirect_uri=microsoft_config.REDIRECT_URI,
            token_url=microsoft_config.TOKEN_URL
        )
        self.tenant_id = microsoft_config.TENANT_ID
        logger.info("🔧 MicrosoftAuthService initialized")

    def get_auth_url(self, redirect_uri: str = None) -> str:
        """Generate Microsoft OAuth2 authorization URL"""
        actual_redirect_uri = redirect_uri or self.redirect_uri
        
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": actual_redirect_uri,
            "scope": " ".join(microsoft_config.SCOPES),
            "response_mode": "query",
            "prompt": "consent"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        auth_url = f"{microsoft_config.AUTH_URL}?{query_string}"
        
        logger.info(f"🔗 Generated Microsoft auth URL: {auth_url}")
        return auth_url

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Microsoft Graph API"""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            graph_url = f"{microsoft_config.GRAPH_URL}/me"
            
            try:
                response = await client.get(graph_url, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"❌ Failed to get user info. Status: {response.status_code}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to get user info from Microsoft"
                    )
                
                user_info = response.json()
                
                # Normalize data for consumption by base class or caller
                # Microsoft returns 'mail' or 'userPrincipalName' for email
                # BaseAuthService expects 'email' key in the dict returned by get_user_info?
                # Actually BaseAuthService calls `user_info.get("email")`
                # So we should probably inject 'email' if it's missing but present as 'mail'
                
                email = user_info.get("mail") or user_info.get("userPrincipalName")
                name = user_info.get("displayName", "Unknown")
                
                # Inject normalized keys
                user_info["email"] = email
                user_info["name"] = name
                
                logger.info(f"✅ User information retrieved: {email}")
                return user_info
                
            except httpx.HTTPError as e:
                logger.error(f"❌ HTTP error during user info fetch: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"HTTP error during user info fetch: {str(e)}"
                )

    async def authenticate_microsoft_user(self, auth_code: str, db: Any, redirect_uri: str = None) -> Dict[str, Any]:
         return await self.authenticate_user(auth_code, db, redirect_uri, provider="microsoft")

# Global instance
microsoft_auth_service = MicrosoftAuthService()
