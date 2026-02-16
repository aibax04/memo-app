from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager
import logging

from config.settings import settings
from database.connection import engine
from database.base import Base
from api.routers import meetings, auth, microsoft_auth, google_auth, templates, crm, stream, basic_auth, dashboards, charts, generation


from api.models.user import User  # Import User model to create table
from api.models.meeting import MeetingRecord  # Import MeetingRecord model to create table
from api.models.template import Template  # Import Template model to create table
from api.models.dashboard import Dashboard  # Import Dashboard model to create table
from api.models.chart import Chart  # Import Chart model to create table
from api.services.background_transcription_service import background_service
from api.services.watchdog_service import watchdog_service


# Set up logging with timestamps
# Use INFO for production, DEBUG for development
log_level = logging.DEBUG if settings.NODE_ENV == "development" else logging.INFO
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Custom AccessFormatter with timestamps for uvicorn access logs
from uvicorn.logging import AccessFormatter
import time

class TimestampedAccessFormatter(AccessFormatter):
    """Custom access formatter that adds timestamps to uvicorn access logs"""
    def format(self, record):
        # Get timestamp
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(record.created))
        # Call parent to get the formatted message, then prepend timestamp
        # Uvicorn's AccessFormatter creates messages like: "IP:PORT - \"REQUEST\" STATUS"
        formatted_message = super().format(record)
        # Prepend timestamp
        return f"{timestamp} - {formatted_message}"

# Create database tables
Base.metadata.create_all(bind=engine)

# Create temp_audio directory if it doesn't exist
temp_audio_dir = Path("temp_audio")
temp_audio_dir.mkdir(exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("=" * 50)
    logger.info("🚀 Server is starting up!")
    logger.info(f"🔌 Listening on {settings.HOST}:{settings.PORT}")
    logger.info(f"🌍 Environment: {settings.NODE_ENV}")
    if settings.HTTPS_ENABLED:
        logger.info(f"🔒 HTTPS: https://{settings.HOST}:{settings.PORT}")
    else:
        logger.info(f"🌐 HTTP: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"🔍 Health Check: http://{settings.HOST}:{settings.PORT}/health")
    logger.info("=" * 50)
    
    # Log configuration (only in development or if explicitly enabled)
    if settings.NODE_ENV == "development":
        logger.info("🏢 Company Domains Configuration:")
        logger.info(f"   📧 Allowed Domains: {settings.COMPANY_DOMAINS}")
        
        # Log Microsoft authentication configuration
        logger.info("🔐 Microsoft Authentication Configuration:")
        logger.info(f"   🔑 Client ID: {settings.MICROSOFT_CLIENT_ID[:8] if settings.MICROSOFT_CLIENT_ID else 'Not configured'}...")
        logger.info(f"   🏢 Tenant ID: {settings.MICROSOFT_TENANT_ID[:8] if settings.MICROSOFT_TENANT_ID else 'Not configured'}...")
        logger.info(f"   🔗 Redirect URI: {settings.MICROSOFT_REDIRECT_URI}")
        
        # Log Google authentication configuration
        logger.info("🔐 Google Authentication Configuration:")
        logger.info(f"   🔑 Client ID: {settings.GOOGLE_CLIENT_ID[:8] if settings.GOOGLE_CLIENT_ID else 'Not configured'}...")
        logger.info(f"   🔗 Redirect URI: {settings.GOOGLE_REDIRECT_URI}")
        
        # Log ngrok configuration
        if settings.NGROK_ENABLED and settings.NGROK_URL:
            logger.info("🚀 Ngrok Configuration:")
            logger.info(f"   🌐 Ngrok URL: {settings.NGROK_URL}")
            logger.info(f"   🔗 Base URL: {settings.BASE_URL}")
        
        # Log CORS origins (first 5 only in dev)
        logger.info(f"🌍 CORS Origins: {len(settings.CORS_ORIGINS)} configured")
        if len(settings.CORS_ORIGINS) <= 5:
            for origin in settings.CORS_ORIGINS:
                logger.debug(f"   ✅ {origin}")
    
    # Validate Microsoft configuration
    if not settings.MICROSOFT_CLIENT_ID or settings.MICROSOFT_CLIENT_ID == "your-application-client-id-from-azure":
        logger.warning("⚠️  Microsoft Client ID not configured - Microsoft authentication will not work")
    if not settings.MICROSOFT_CLIENT_SECRET or settings.MICROSOFT_CLIENT_SECRET == "your-client-secret-from-azure":
        logger.warning("⚠️  Microsoft Client Secret not configured - Microsoft authentication will not work")
    if not settings.MICROSOFT_TENANT_ID or settings.MICROSOFT_TENANT_ID == "your-tenant-id-from-azure":
        logger.warning("⚠️  Microsoft Tenant ID not configured - Microsoft authentication will not work")
    
    # Validate Google configuration
    if not settings.GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID == "":
        logger.warning("⚠️  Google Client ID not configured - Google authentication will not work")
    if not settings.GOOGLE_CLIENT_SECRET or settings.GOOGLE_CLIENT_SECRET == "":
        logger.warning("⚠️  Google Client Secret not configured - Google authentication will not work")
    if not settings.GOOGLE_REDIRECT_URI or settings.GOOGLE_REDIRECT_URI == "":
        logger.warning("⚠️  Google Redirect URI not configured - Google authentication will not work")
    
    # Check authentication status
    microsoft_configured = settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET and settings.MICROSOFT_TENANT_ID
    google_configured = settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and settings.GOOGLE_REDIRECT_URI
    
    if microsoft_configured:
        logger.info("✅ Microsoft authentication is properly configured")
    else:
        logger.warning("❌ Microsoft authentication is not properly configured")
    
    if google_configured:
        logger.info("✅ Google authentication is properly configured")
    else:
        logger.warning("❌ Google authentication is not properly configured")
    
    if not microsoft_configured and not google_configured:
        logger.error("❌ No authentication providers are configured!")
    
    # Start background transcription service
    try:
        background_service.start()
        if background_service.is_running:
            logger.info("🎵 Background transcription service started successfully")
        else:
            logger.error("❌ Background transcription service failed to start")
            # Try to restart it
            try:
                background_service.start()
                if background_service.is_running:
                    logger.info("🔄 Background transcription service restarted successfully")
                else:
                    logger.error("❌ Background transcription service still failed to start after retry")
            except Exception as retry_error:
                logger.error(f"❌ Failed to restart background transcription service: {str(retry_error)}")
    except Exception as e:
        logger.error(f"❌ Failed to start background transcription service: {str(e)}")
        import traceback
        logger.error(f"📊 Traceback: {traceback.format_exc()}")
        
    # Start watchdog service
    try:
        watchdog_service.start()
    except Exception as e:
        logger.error(f"❌ Failed to start watchdog service: {e}")
    
    yield
    
    # Stop watchdog service
    try:
        watchdog_service.stop()
    except Exception as e:
        logger.error(f"❌ Error stopping watchdog service: {e}")

    # Stop background transcription service
    try:
        background_service.stop()
        logger.info("🛑 Background transcription service stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping background transcription service: {str(e)}")
    
    # Shutdown
    logger.info("🛑 Server is shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Add CORS middleware with production settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Function to include router with multiple prefixes
def include_router_with_prefixes(app, router, prefixes, **kwargs):
    """Include a router with multiple prefixes"""
    for prefix in prefixes:
        app.include_router(router, prefix=prefix, **kwargs)


# Include auth routers with multiple prefixes
include_router_with_prefixes(app, microsoft_auth.router, ["/api/v1/mobile", "/api/v1/web"])
include_router_with_prefixes(app, google_auth.router, ["/api/v1/mobile", "/api/v1/web"])
include_router_with_prefixes(app, meetings.router, ["/api/v1/mobile", "/api/v1/web"])
include_router_with_prefixes(app, auth.router, ["/api/v1/mobile", "/api/v1/web"])
include_router_with_prefixes(app, templates.router, ["/api/v1/mobile", "/api/v1/web"])
include_router_with_prefixes(app, crm.router, ["/api/v1"])
# Stream router (Replaces WebSocket)
include_router_with_prefixes(app, stream.router, ["/api/v1/mobile", "/api/v1/web"])

# Basic Auth router for /token and /users/ (Compatibility with legacy frontend calls)
app.include_router(basic_auth.router)

# Dashboards & Charts routers (Root level to match frontend expectations)
app.include_router(dashboards.router)
app.include_router(dashboards.filters_router)  # /filters endpoint for DataSidebar
app.include_router(charts.router)
app.include_router(generation.router)




@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {"message": settings.APP_NAME, "version": settings.APP_VERSION}

@app.get("/health")
@app.get("/healthcheck")
async def health_check():
    """Health check endpoint for monitoring (frontend may call /healthcheck)"""
    return {"status": "healthy", "version": settings.APP_VERSION}

# Debug endpoint - only available in development
if settings.NODE_ENV == "development":
    @app.get("/api/v1/mobile/debug/routes")
    async def debug_routes():
        """Debug endpoint to check registered routes and their order (development only)"""
        routes_info = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                routes_info.append({
                    "path": route.path,
                    "methods": list(route.methods) if route.methods else [],
                    "name": getattr(route, 'name', 'unknown')
                })
        
        # Filter for meetings routes
        meetings_routes = [r for r in routes_info if '/meetings' in r['path']]
        
        return {
            "total_routes": len(routes_info),
            "meetings_routes": meetings_routes,
            "suggest_routes": [r for r in meetings_routes if 'suggest' in r['path']],
            "parameterized_routes": [r for r in meetings_routes if '{' in r['path']]
        }

# Serve static files
app.mount("/static", StaticFiles(directory="."), name="static")

# Serve the auth callback page
@app.get("/auth_callback.html")
async def auth_callback_page():
    """Serve the authentication callback page"""
    return FileResponse("auth_callback.html")

if __name__ == "__main__":
    """
    Development server entry point.
    For production, use: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
    """
    # Configure uvicorn logging format with timestamps
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "access": {
                # Custom access log format with timestamp
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(client_addr)s:%(client_port)s - \"%(request_line)s\" %(status_code)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": "INFO", "propagate": False},
            "uvicorn.error": {"handlers": ["default"], "level": "INFO", "propagate": False},
            "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
            "watchfiles.main": {"handlers": ["default"], "level": "WARNING", "propagate": False},
            "watchfiles": {"handlers": ["default"], "level": "WARNING", "propagate": False},
        },
        "root": {
            "level": "INFO",
            "handlers": ["default"],
        },
    }
    
    # Use the custom TimestampedAccessFormatter for access logs
    log_config["formatters"]["access"] = {
        "()": "main.TimestampedAccessFormatter"
    }
    
    # Only enable reload in development
    reload_enabled = settings.NODE_ENV == "development"
    
    logger.warning("⚠️  Running in development mode. For production, use:")
    logger.warning("   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4")
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=reload_enabled,  # Only reload in development
        log_level="info",
        log_config=log_config,
        access_log=True,
    ) 