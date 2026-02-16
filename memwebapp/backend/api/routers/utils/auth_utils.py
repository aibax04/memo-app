from fastapi import Request
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

def get_redirect_uri(request: Request, configured_redirect_uri: str, provider_path: str) -> str:
    """
    Constructs the appropriate redirect URI based on the request source (mobile vs web).
    
    Args:
        request: The FastAPI request object.
        configured_redirect_uri: The redirect URI from settings (e.g. settings.GOOGLE_REDIRECT_URI).
        provider_path: The path segment for the provider, e.g. "auth/google/callback" or "auth/microsoft/callback".
    """
    if "/mobile/" in str(request.url.path):
        # Mobile logic
        if configured_redirect_uri:
            # Replace /web/ with /mobile/ if configured uri has it, or ensure it points to mobile
            # Assuming standard structure where configured is usually for web or generic
            # Only replacing if it explicitly contains /web/ might be safe, but let's follow the original logic's intent
            # Original logic: replace "/web/auth/.../callback" with "/mobile/auth/.../callback"
            if "/web/" in configured_redirect_uri:
                 return configured_redirect_uri.replace(f"/web/{provider_path}", f"/mobile/{provider_path}")
            else:
                 # If configured URI is generic or doesn't have /web/, better rely on it if it matches mobile expectation
                 # But usually we need to construct it dynamically if we are using different endpoints for mobile
                 # For now, let's stick to the replacement logic found in original code which assumes the env var is set for web.
                 return configured_redirect_uri.replace(f"/web/{provider_path}", f"/mobile/{provider_path}")
        else:
            # Fallback
            base_url = f"{request.url.scheme}://{request.url.netloc}"
            return f"{base_url}/api/v1/mobile/{provider_path}"
    else:
        # Web logic
        return configured_redirect_uri or f"http://localhost:8000/api/v1/web/{provider_path}"

def get_redirect_uri_google(request: Request) -> str:
    return get_redirect_uri(request, settings.GOOGLE_REDIRECT_URI, "auth/google/callback")

def get_redirect_uri_microsoft(request: Request) -> str:
    return get_redirect_uri(request, settings.MICROSOFT_REDIRECT_URI, "auth/microsoft/callback")

import json
import urllib.parse
from fastapi.responses import RedirectResponse

def create_auth_redirect_response(request: Request, auth_result: dict, provider: str) -> RedirectResponse:
    """
    Creates a redirect response for the Flutter app or Web frontend with the auth data.
    """
    # Encode the data
    encoded_data = urllib.parse.quote(json.dumps(auth_result))
    
    provider_path = f"auth/{provider}/callback"
    
    # Check if it matches the web path pattern
    # The path usually starts with /api/v1/...
    if f"/web/{provider_path}" in str(request.url.path):
        # Redirect to frontend callback page for web authentication
        redirect_url = f"{settings.FRONTEND_URL}?data={encoded_data}"
        logger.info(f"🔗 Redirecting to Web Frontend: {redirect_url}")
    else:   
        # Redirect to custom scheme for mobile
        redirect_url = f"memoapp://auth/callback?data={encoded_data}"
        logger.info(f"🔗 Redirecting to Custom Scheme: {redirect_url}")
    
    return RedirectResponse(url=redirect_url, status_code=302)
