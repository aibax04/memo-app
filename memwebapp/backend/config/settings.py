import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./meeting_records.db")
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    HTTPS_ENABLED: bool = os.getenv("HTTPS_ENABLED", "false").lower() == "true"
    
    # Google Generative AI settings
    GEMINI_KEY: str = os.getenv("GEMINI_KEY", "")
    
    # Audio processing settings
    MAX_AUDIO_FILE_SIZE: str = os.getenv("MAX_AUDIO_FILE_SIZE", "50MB")
    SUPPORTED_AUDIO_FORMATS: list = os.getenv("SUPPORTED_AUDIO_FORMATS", "mp3,wav,m4a,flac,webm,opus").split(",")
    
    # Microsoft Authentication settings
    MICROSOFT_CLIENT_ID: str = os.getenv("MICROSOFT_CLIENT_ID", "")
    MICROSOFT_CLIENT_SECRET: str = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    MICROSOFT_TENANT_ID: str = os.getenv("MICROSOFT_TENANT_ID", "")
    MICROSOFT_REDIRECT_URI: str = os.getenv("MICROSOFT_REDIRECT_URI", "")
    
    # Google Authentication settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "")
    
    # Ngrok settings
    NGROK_URL: str = os.getenv("NGROK_URL", "")
    NGROK_ENABLED: bool = os.getenv("NGROK_ENABLED", "false").lower() == "true"
    
    # Application settings
    APP_NAME: str = os.getenv("APP_NAME", "Memo App")
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "API for managing meeting records with audio processing capabilities"
    # Company domains - can be a single domain or comma-separated list
    COMPANY_DOMAINS: list = os.getenv("COMPANY_DOMAINS", "panscience.ai").split(",")
    
    # Backward compatibility - keep COMPANY_DOMAIN for existing code
    @property
    def COMPANY_DOMAIN(self) -> str:
        """Get the first company domain for backward compatibility"""
        return self.COMPANY_DOMAINS[0] if self.COMPANY_DOMAINS else "panscience.ai"
    
    # Environment settings
    NODE_ENV: str = os.getenv("NODE_ENV", "development")
    
    # JWT settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-here")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_HOURS: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "6"))  # 6 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days
    
    # Dashboard settings
    DASHBOARD_BASE_URL: str = os.getenv("DASHBOARD_BASE_URL", "http://localhost:5173")
    DASHBOARD_USERNAME: str = os.getenv("USERNAME", "")
    DASHBOARD_PASSWORD: str = os.getenv("PASSWORD", "")
    
    # Frontend settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # AWS S3 settings
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "memoapp-audio-files")
    S3_AUDIO_PREFIX: str = os.getenv("S3_AUDIO_PREFIX", "meetings/audio/")
    
    # CORS settings - Dynamic based on environment and ngrok
    @property
    def CORS_ORIGINS(self) -> list:
        origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8000",
            "https://ext.makememo.ai",
            "http://ext.makememo.ai",
            "http://192.168.88.15",
            "http://43.205.135.78",
            "memoapp://auth/callback",
        ]
        
        # Add ngrok URL if enabled
        if self.NGROK_ENABLED and self.NGROK_URL:
            # Add both http and https versions of ngrok URL
            ngrok_base = self.NGROK_URL.rstrip('/')
            origins.extend([
                f"{ngrok_base}",
                f"{ngrok_base.replace('https://', 'http://')}",
                f"{ngrok_base.replace('http://', 'https://')}"
            ])
            
            # Add ngrok callback URLs for mobile apps
            origins.extend([
                f"{ngrok_base}/auth/microsoft/callback",
                f"{ngrok_base}/auth/google/callback",
                f"{ngrok_base}/auth/callback"
            ])
        
        # Add local network IPs for mobile device testing
        if self.NODE_ENV == "development":
            # Common local network ranges
            local_ips = [
                "http://192.168.1.0/24",
                "http://192.168.0.0/24", 
                "http://10.0.0.0/24",
                "http://172.16.0.0/24"
            ]
            origins.extend(local_ips)
        
        # Production: allow FRONTEND_URL and DASHBOARD_BASE_URL so CORS works when served via nginx
        for url in (self.FRONTEND_URL, self.DASHBOARD_BASE_URL):
            if url and url.rstrip("/") not in [o.rstrip("/") for o in origins]:
                origins.append(url.rstrip("/"))
        
        return origins
    
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    # Get the current base URL for the application
    @property
    def BASE_URL(self) -> str:
        if self.NGROK_ENABLED and self.NGROK_URL:
            return self.NGROK_URL.rstrip('/')
        elif self.HTTPS_ENABLED:
            return f"https://{self.HOST}:{self.PORT}"
        else:
            return f"http://{self.HOST}:{self.PORT}"

settings = Settings() 