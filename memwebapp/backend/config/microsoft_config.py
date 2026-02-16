import os
from dotenv import load_dotenv

load_dotenv()

# Microsoft Azure AD Configuration
# These values need to be configured in your Azure portal

class MicrosoftConfig:
    # Azure AD App Registration settings
    CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
    CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "")
    
    # Redirect URI for OAuth2 flow - MUST be HTTP/HTTPS for Azure Portal
    # The custom scheme (memoapp://) is handled by your backend after authentication
    REDIRECT_URI = os.getenv("MICROSOFT_REDIRECT_URI", "")
    
    # Company domain validation - will be set from settings
    COMPANY_DOMAINS = []
    
    # Scopes for Microsoft Graph API
    SCOPES = [
        "openid",
        "profile", 
        "email",
        "User.Read",
        "Calendars.ReadWrite",  # For calendar access
        "OnlineMeetings.ReadWrite"  # For creating Teams meetings
    ]
    
    # Microsoft endpoints
    @property
    def AUTH_URL(self):
        return f"https://login.microsoftonline.com/{self.TENANT_ID}/oauth2/v2.0/authorize"
    
    @property
    def TOKEN_URL(self):
        return f"https://login.microsoftonline.com/{self.TENANT_ID}/oauth2/v2.0/token"
    
    @property
    def GRAPH_URL(self):
        return "https://graph.microsoft.com/v1.0"
    
    def is_configured(self) -> bool:
        """Check if Microsoft authentication is properly configured"""
        return (
            self.CLIENT_ID != "your-microsoft-client-id" and
            self.CLIENT_SECRET != "your-microsoft-client-secret" and
            self.TENANT_ID != "your-tenant-id"
        )

# Global instance
microsoft_config = MicrosoftConfig()
