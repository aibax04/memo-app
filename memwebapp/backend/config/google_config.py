import os
from dotenv import load_dotenv

load_dotenv()

# Google OAuth2 Configuration
# These values need to be configured in your Google Cloud Console

class GoogleConfig:
    # Google OAuth2 App settings
    CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # Redirect URI for OAuth2 flow - MUST be HTTP/HTTPS for Google Console
    # The custom scheme (memoapp://) is handled by your backend after authentication
    REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")
    
    # Company domain validation - will be set from settings
    COMPANY_DOMAINS = []
    
    # Scopes for Google OAuth2 API
    # Including Calendar API scopes for Google Calendar integration
    SCOPES = [
        "openid",
        "profile", 
        "email",
        "https://www.googleapis.com/auth/calendar.readonly",  # Read calendar events
        "https://www.googleapis.com/auth/calendar.events",    # Create/modify calendar events
    ]
    
    # Google OAuth2 endpoints
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def is_configured(self) -> bool:
        """Check if Google authentication is properly configured"""
        return (
            self.CLIENT_ID != "" and
            self.CLIENT_SECRET != "" and
            self.REDIRECT_URI != ""
        )

# Global instance
google_config = GoogleConfig()
