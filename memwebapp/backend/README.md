# Memo App Backend

A comprehensive enterprise-grade backend API for audio transcription, meeting management, and speaker analytics. This production-ready application powers mobile apps with AI-driven audio processing using Google Gemini AI, multi-provider authentication, cloud storage integration, and advanced CRM features.

## 🏗️ Project Architecture

```
memwebapp/backend/
├── api/
│   ├── routers/                    # API Endpoints
│   │   ├── meetings.py            # Meeting CRUD, audio processing
│   │   ├── auth.py                # Token refresh, user info
│   │   ├── microsoft_auth.py      # Microsoft OAuth flow
│   │   ├── google_auth.py         # Google OAuth flow
│   │   ├── templates.py           # Template management
│   │   └── crm.py                 # Speaker profiles & CRM
│   ├── models/                    # Database Models
│   │   ├── meeting.py             # MeetingRecord with analytics
│   │   ├── user.py                # User with auth provider
│   │   ├── template.py            # Custom AI templates
│   │   └── speaker_profile.py     # CRM contacts
│   ├── services/                  # Business Logic
│   │   ├── audio_service.py       # Gemini AI transcription
│   │   ├── meeting_service.py     # Meeting CRUD operations
│   │   ├── background_transcription_service.py  # Async processing
│   │   ├── s3_service.py          # AWS S3 integration
│   │   ├── ai_suggestion_service.py  # Smart suggestions
│   │   ├── dashboard_service.py   # External dashboard sync
│   │   ├── flat_meeting_analytics.py  # Analytics engine
│   │   ├── mobile_audio_analytics.py  # Mobile-specific analytics
│   │   ├── auth_service.py        # JWT authentication
│   │   ├── microsoft_auth_service.py  # Microsoft auth logic
│   │   ├── google_auth_service.py     # Google auth logic
│   │   ├── template_service.py    # Template operations
│   │   └── speaker_profile_service.py  # CRM operations
│   └── schemas/                   # Pydantic Schemas
│       ├── meeting.py             # Meeting request/response
│       ├── user.py                # User schemas
│       ├── template.py            # Template schemas
│       └── speaker_profile.py     # Speaker profile schemas
├── config/
│   ├── settings.py               # Environment configuration
│   ├── microsoft_config.py       # Microsoft OAuth config
│   └── google_config.py          # Google OAuth config
├── database/
│   ├── base.py                   # SQLAlchemy base
│   ├── connection.py             # PostgreSQL connection
│   └── migration_*.py            # Database migrations
├── main.py                       # FastAPI application
├── run.py                        # Development server
└── requirements.txt              # Python dependencies
```

## 🚀 Core Features

### 🎙️ **Audio Processing & AI Transcription**
- **Google Gemini 2.0 Flash AI**: State-of-the-art audio transcription with speaker diarization
- **Dual Audio Support**: Merge two audio streams (e.g., mobile mic + system audio)
- **Background Processing**: Asynchronous transcription service for improved performance
- **Smart Chunking**: Automatically splits large audio files for efficient processing
- **Multiple Formats**: MP3, WAV, M4A, FLAC, WebM, Opus support
- **AWS S3 Integration**: Cloud storage for audio files with presigned URL access

### 🤖 **AI-Powered Features**
- **Smart Template Suggestions**: AI recommends best template based on audio content
- **Auto Title Generation**: Automatically suggests meeting titles from audio
- **Auto Description**: Generates contextual meeting descriptions
- **Custom Summaries**: Template-based AI summarization
- **Key Points Extraction**: Intelligent extraction of important discussion points
- **Action Items**: Automatic identification of tasks and follow-ups
- **Speaker Identification**: Detects and labels different speakers

### 🔐 **Enterprise Authentication**
- **Microsoft OAuth 2.0**: Enterprise SSO with Azure AD integration
- **Google OAuth 2.0**: Google Workspace authentication
- **JWT Token Management**: Secure access & refresh token flow
- **Multi-Tenant Support**: User isolation with company domain validation
- **Role-Based Access**: User-specific data access control

### 📊 **Meeting Management**
- **CRUD Operations**: Complete meeting lifecycle management
- **Status Tracking**: PENDING → PROCESSING → COMPLETED/FAILED states
- **Analytics Pipeline**: Comprehensive meeting analytics with separate status tracking
- **Advanced Filtering**: Filter by status, date range, participants, search query
- **Pagination**: Efficient data loading with page-based navigation
- **Bulk Operations**: Update multiple speaker names simultaneously

### 👥 **CRM & Speaker Management**
- **Speaker Profiles**: Create and manage contact information for speakers
- **Speaker Search**: Find all meetings featuring specific speakers
- **Profile Mapping**: Link detected speakers to CRM profiles
- **Contact Management**: Store names, emails, phone numbers, companies, designations
- **Meeting History**: Track all interactions with specific speakers

### 📝 **Template System**
- **Custom Templates**: Create user-specific transcription templates
- **Default Templates**: Pre-configured templates for common scenarios
- **Prompt Customization**: Define custom AI prompts for transcription and summarization
- **Key Points Configuration**: Specify which information to extract
- **Speaker Diarization Rules**: Custom instructions for speaker identification
- **Template Sharing**: System-wide default templates and user-specific templates

### 🔄 **Background Services**
- **Async Transcription**: Non-blocking audio processing with queue management
- **Auto-Retry Logic**: Handles failures with exponential backoff
- **Status Monitoring**: Real-time transcription service health checks
- **Batch Processing**: Process multiple pending meetings
- **Dashboard Sync**: Automatic synchronization with external dashboard

### 🌐 **API Features**
- **RESTful Design**: Clean, intuitive endpoints with proper HTTP methods
- **OpenAPI Documentation**: Interactive Swagger UI & ReDoc
- **CORS Support**: Configured for mobile and web clients
- **Multiple API Versions**: Support for /api/v1/mobile and /api/v1/web paths
- **Presigned URLs**: Secure temporary access to S3 audio files
- **Streaming Downloads**: Efficient audio file delivery

## 🔧 Technology Stack

### **Backend Framework**
- **FastAPI**: High-performance async web framework
- **Python 3.12**: Latest Python features
- **Uvicorn**: ASGI server with auto-reload
- **Pydantic**: Data validation and settings management

### **Database**
- **PostgreSQL**: Production-grade relational database
- **SQLAlchemy 2.0**: ORM with async support
- **psycopg2**: PostgreSQL adapter

### **AI & Machine Learning**
- **Google Generative AI (Gemini 2.0 Flash)**: Audio transcription & text generation
- **Concurrent Processing**: Multi-threaded audio chunk processing

### **Cloud Services**
- **AWS S3**: Audio file storage with boto3
- **Presigned URLs**: Secure temporary file access

### **Authentication**
- **MSAL**: Microsoft Authentication Library
- **Google Auth OAuth**: Google authentication
- **python-jose**: JWT token generation & validation
- **passlib & bcrypt**: Password hashing

### **Audio Processing**
- **PyDub**: Audio format conversion and manipulation
- **Multiple Codecs**: Support for various audio formats

### **API Documentation**
- **OpenAPI 3.0**: Automatic schema generation
- **Swagger UI**: Interactive API testing
- **ReDoc**: Alternative documentation interface

## 📦 Installation & Setup

### **Prerequisites**
- Python 3.12+
- PostgreSQL 12+
- AWS Account (for S3 storage)
- Google Gemini API Key
- Microsoft Azure App Registration (for Microsoft auth)
- Google Cloud Project (for Google auth)

### **1. Clone the Repository**
   ```bash
   git clone <repository-url>
cd memwebapp/backend
```

### **2. Create Virtual Environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### **3. Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### **4. Configure Environment Variables**

Create a `.env` file in the project root:

   ```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Server Configuration
HOST=0.0.0.0
PORT=8000
HTTPS_ENABLED=false

# Google Gemini AI
GEMINI_KEY=your-gemini-api-key

# Audio Processing
MAX_AUDIO_FILE_SIZE=50MB
SUPPORTED_AUDIO_FORMATS=mp3,wav,m4a,flac,webm,opus

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-azure-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:8000/api/v1/mobile/auth/microsoft/callback

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/mobile/auth/google/callback

# Company Configuration
COMPANY_DOMAINS=yourcompany.com,partner.com
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_HOURS=6
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_AUDIO_PREFIX=meetings/audio/

# Frontend URLs
FRONTEND_URL=https://yourapp.com
DASHBOARD_BASE_URL=https://dashboard.yourapp.com
```

### **5. Initialize Database**
   ```bash
# Database tables will be created automatically on first run
python main.py
   ```

### **6. Run the Application**

**Development Mode:**
   ```bash
   python run.py
   ```

**Production Mode:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### **7. Access the API**
- **API Base**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

## 🌐 API Endpoints

### **Authentication Endpoints**

#### Microsoft OAuth Login
```http
GET /api/v1/mobile/auth/microsoft/login
```

#### Microsoft OAuth Callback
```http
GET /api/v1/mobile/auth/microsoft/callback?code={code}
```

#### Google OAuth Login
```http
GET /api/v1/mobile/auth/google/login
```

#### Google OAuth Callback
```http
GET /api/v1/mobile/auth/google/callback?code={code}
```

#### Get Current User
```http
GET /api/v1/mobile/auth/me
Authorization: Bearer {access_token}
```

#### Refresh Access Token
```http
POST /api/v1/mobile/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your-refresh-token"
}
```

### **Meeting Endpoints**

#### Create Meeting (with Audio Processing)
```http
POST /api/v1/mobile/meetings/
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Form Data:
- title (required): Meeting title
- description (optional): Meeting description
- participants (optional): JSON array of participant names
- templateid (optional): Template UUID
- custom_template_points (optional): Custom extraction points
- audio_file (required): Primary audio file
- second_audio_file (optional): Secondary audio (will be merged)
```

#### Get All Meetings (with Filters & Pagination)
```http
GET /api/v1/mobile/meetings/?page=1&limit=100&status=completed&search=keyword
Authorization: Bearer {access_token}

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 100, max: 1000)
- status: Filter by transcription status (pending/processing/completed/failed)
- analytics_status: Filter by analytics status
- search: Search in title or participants
- date_from: Filter from date (ISO format)
- date_to: Filter to date (ISO format)
```

#### Get Meeting by ID
```http
GET /api/v1/mobile/meetings/{meeting_id}
Authorization: Bearer {access_token}
```

#### Update Meeting
```http
PUT /api/v1/mobile/meetings/{meeting_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "participants": ["John Doe", "Jane Smith"]
}
```

#### Delete Meeting
```http
DELETE /api/v1/mobile/meetings/{meeting_id}
Authorization: Bearer {access_token}
```

#### Get Meeting Audio (Presigned URL)
```http
GET /api/v1/mobile/meetings/{meeting_id}/audio/url?expiration=3600
Authorization: Bearer {access_token}
```

#### Download Meeting Audio
```http
GET /api/v1/mobile/meetings/{meeting_id}/audio
Authorization: Bearer {access_token}
```

#### Update Speaker Names
```http
PUT /api/v1/mobile/meetings/{meeting_id}/speaker-names
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "old_speaker_name": "Speaker1",
  "new_speaker_name": "John Doe"
}
```

#### Bulk Update Speaker Names
```http
PUT /api/v1/mobile/meetings/{meeting_id}/speaker-names/bulk
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "speaker_updates": {
    "Speaker1": "John Doe",
    "Speaker2": "Jane Smith"
  }
}
```

### **AI Suggestion Endpoints**

#### Suggest Template for Audio
```http
POST /api/v1/mobile/meetings/suggest-template
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Form Data:
- audio_file (required): Audio file to analyze
```

#### Suggest Meeting Title
```http
POST /api/v1/mobile/meetings/suggest-title
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Form Data:
- audio_file (required): Audio file to analyze
```

#### Suggest Meeting Description
```http
POST /api/v1/mobile/meetings/suggest-description
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Form Data:
- audio_file (required): Audio file to analyze
```

### **Template Endpoints**

#### Get All Templates
```http
GET /api/v1/mobile/templates?page=1&limit=20&search=keyword
Authorization: Bearer {access_token}
```

#### Get Default Templates
```http
GET /api/v1/mobile/templates/defaults
Authorization: Bearer {access_token}
```

#### Get User Templates
```http
GET /api/v1/mobile/templates/user
Authorization: Bearer {access_token}
```

#### Create Custom Template
```http
POST /api/v1/mobile/templates
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Sales Call Template",
  "description": "Template for sales calls",
  "transcription_prompt": "Custom transcription instructions...",
  "summary_prompt": "Custom summary instructions...",
  "key_points_prompt": ["Product discussed", "Price mentioned", "Next steps"],
  "speaker_diarization": "Identify sales rep and customer..."
}
```

### **CRM / Speaker Endpoints**

#### Get All Speakers
```http
GET /api/v1/crm/speakers
Authorization: Bearer {access_token}
```

#### Search Meetings by Speaker
```http
GET /api/v1/crm/speakers/{speaker_name}/meetings?page=1&limit=20
Authorization: Bearer {access_token}
```

#### Get Speaker Profiles
```http
GET /api/v1/crm/speaker-profiles?page=1&limit=20&search=name
Authorization: Bearer {access_token}
```

#### Create Speaker Profile
```http
POST /api/v1/crm/speaker-profiles
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "designation": "Product Manager"
}
```

#### Map Speaker to Profile
```http
POST /api/v1/crm/speaker-profiles/{profile_id}/map
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "speaker_name": "Speaker1"
}
```

### **Background Service Endpoints**

#### Start Background Transcription
```http
POST /api/v1/mobile/meetings/transcription/start-background
Authorization: Bearer {access_token}
```

#### Get Background Service Status
```http
GET /api/v1/mobile/meetings/transcription/status
Authorization: Bearer {access_token}
```

#### Process All Pending
```http
POST /api/v1/mobile/meetings/transcription/process-all
Authorization: Bearer {access_token}
```

### **Health & Debug**

#### Health Check
```http
GET /health
```

#### Debug Routes
```http
GET /api/v1/mobile/debug/routes
```

## 🗄️ Database Schema

### **Users Table**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auth_provider VARCHAR DEFAULT 'microsoft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Meeting Records Table**
```sql
CREATE TABLE meeting_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT,
    participants JSON,  -- Array of participant names
    transcription JSON,  -- Array of transcription segments with speaker info
    summary TEXT,
    key_points TEXT,
    action_items JSON,  -- Array of extracted action items
    audio_filename VARCHAR,
    s3_audio_path VARCHAR,  -- AWS S3 path
    templateid VARCHAR,
    custom_template_points TEXT,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    status VARCHAR DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED
    analytics_status VARCHAR DEFAULT 'PENDING',
    analytics_data JSON,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Templates Table**
```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT,
    transcription_prompt TEXT,
    summary_prompt TEXT,
    key_points_prompt JSON,  -- Array of key points to extract
    speaker_diarization TEXT,
    created_by INTEGER REFERENCES users(id),  -- NULL for default templates
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Speaker Profiles Table (CRM)**
```sql
CREATE TABLE speaker_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR NOT NULL,
    middle_name VARCHAR,
    last_name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    company VARCHAR,
    designation VARCHAR,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Audio Processing Pipeline

### **Synchronous Flow (Meeting Creation)**
1. **Upload Validation**: Audio file format and size validation
2. **Dual Audio Merging** (Optional): Merge primary and secondary audio streams
3. **S3 Upload**: Upload audio file to AWS S3 with unique meeting UUID
4. **Database Entry**: Create meeting record with PENDING status
5. **Background Queue**: Meeting added to background processing queue
6. **Cleanup**: Remove local temporary files

### **Asynchronous Background Processing**
1. **Queue Monitoring**: Background service polls for PENDING meetings
2. **Status Update**: Change status to PROCESSING
3. **S3 Download**: Download audio from S3 to temporary location
4. **Audio Chunking**: Split large files into manageable chunks (if needed)
5. **Gemini Transcription**: 
   - Apply template-specific prompts
   - Perform speaker diarization
   - Generate timestamped segments
6. **AI Analysis**:
   - Generate summary using template prompts
   - Extract key points based on template configuration
   - Identify action items
7. **Analytics Generation**: 
   - Calculate meeting metrics
   - Generate dashboard data
   - Process mobile-specific analytics
8. **Database Update**: 
   - Store transcription, summary, key points, action items
   - Update status to COMPLETED
   - Store analytics data
9. **External Sync**: 
   - Push data to external dashboard (if configured)
10. **Cleanup**: Remove temporary files

### **Error Handling**
- **Retry Logic**: Exponential backoff for failed transcriptions
- **Status Tracking**: FAILED status with error details
- **Manual Retry**: API endpoint to retry failed meetings
- **Logging**: Comprehensive error logging with timestamps

## ⚙️ Configuration Details

### **Authentication Setup**

#### Microsoft Azure AD Setup
1. Register app in Azure Portal
2. Configure redirect URI: `{BASE_URL}/api/v1/mobile/auth/microsoft/callback`
3. Enable "ID tokens" under Authentication
4. Add API permissions: `User.Read`, `email`, `profile`, `openid`
5. Create client secret
6. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`

#### Google Cloud Setup
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure redirect URI: `{BASE_URL}/api/v1/mobile/auth/google/callback`
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### **AWS S3 Setup**
1. Create S3 bucket
2. Configure CORS policy:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```
3. Create IAM user with S3 permissions
4. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

### **Supported Audio Formats**
- **MP3**: MPEG Audio Layer 3
- **WAV**: Waveform Audio File Format
- **M4A**: MPEG-4 Audio
- **FLAC**: Free Lossless Audio Codec
- **WebM**: WebM Audio
- **Opus**: Opus Audio Codec

### **Audio Processing Limits**
- Maximum file size: 50MB (configurable via `MAX_AUDIO_FILE_SIZE`)
- Concurrent processing: 4 threads (adjustable in audio_service.py)
- Chunk size: 20 minutes per chunk for large files
- Supported sample rates: Auto-detected
- Supported channels: Mono and Stereo

## 💻 Usage Examples

### **Mobile App Integration (Flutter/React Native)**

#### Authentication Flow (Microsoft)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final String baseUrl = 'https://your-backend.com/api/v1/mobile';
  
  // Step 1: Get Microsoft login URL
  Future<String> getMicrosoftLoginUrl() async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/microsoft/login')
    );
    final data = json.decode(response.body);
    return data['auth_url'];
  }
  
  // Step 2: Exchange code for tokens (after OAuth redirect)
  Future<Map<String, dynamic>> handleAuthCallback(String code) async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/microsoft/callback?code=$code')
    );
    return json.decode(response.body);
    // Returns: { access_token, refresh_token, user: { id, email, name } }
  }
  
  // Step 3: Store tokens securely
  void saveTokens(String accessToken, String refreshToken) {
    // Save to secure storage (e.g., flutter_secure_storage)
  }
}
```

#### Create Meeting with Audio
```dart
import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:convert';

Future<Map<String, dynamic>> createMeeting({
  required File audioFile,
  required String title,
  String? description,
  List<String>? participants,
  String? templateId,
  File? secondAudioFile,
  required String accessToken,
}) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('https://your-backend.com/api/v1/mobile/meetings/'),
  );
  
  // Add headers
  request.headers['Authorization'] = 'Bearer $accessToken';
  
  // Add form fields
  request.fields['title'] = title;
  if (description != null) request.fields['description'] = description;
  if (participants != null) {
    request.fields['participants'] = json.encode(participants);
  }
  if (templateId != null) request.fields['templateid'] = templateId;
  
  // Add audio files
  request.files.add(
    await http.MultipartFile.fromPath('audio_file', audioFile.path),
  );
  if (secondAudioFile != null) {
    request.files.add(
      await http.MultipartFile.fromPath('second_audio_file', secondAudioFile.path),
    );
  }
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  return json.decode(responseData);
}
```

#### Get AI Suggestions Before Creating Meeting
```dart
// Suggest meeting title
Future<String> suggestTitle(File audioFile, String accessToken) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('https://your-backend.com/api/v1/mobile/meetings/suggest-title'),
  );
  request.headers['Authorization'] = 'Bearer $accessToken';
  request.files.add(await http.MultipartFile.fromPath('audio_file', audioFile.path));
  
  var response = await request.send();
  var data = json.decode(await response.stream.bytesToString());
  return data['suggested_title'];
}

// Suggest template
Future<Map<String, dynamic>> suggestTemplate(File audioFile, String accessToken) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('https://your-backend.com/api/v1/mobile/meetings/suggest-template'),
  );
  request.headers['Authorization'] = 'Bearer $accessToken';
  request.files.add(await http.MultipartFile.fromPath('audio_file', audioFile.path));
  
  var response = await request.send();
  return json.decode(await response.stream.bytesToString());
  // Returns: { suggested_template_id, suggested_template_name, confidence, reason }
}
```

#### Fetch Meetings with Filters
```dart
Future<Map<String, dynamic>> getMeetings({
  int page = 1,
  int limit = 20,
  String? status,
  String? search,
  String? dateFrom,
  String? dateTo,
  required String accessToken,
}) async {
  var uri = Uri.parse('https://your-backend.com/api/v1/mobile/meetings/');
  uri = uri.replace(queryParameters: {
    'page': page.toString(),
    'limit': limit.toString(),
    if (status != null) 'status': status,
    if (search != null) 'search': search,
    if (dateFrom != null) 'date_from': dateFrom,
    if (dateTo != null) 'date_to': dateTo,
  });
  
  final response = await http.get(
    uri,
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  return json.decode(response.body);
  // Returns: { data: [...], total, page, limit, total_pages }
}
```

### **Python Client Example**

```python
import requests
import json

class MemoAppClient:
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {access_token}'}
    
    def create_meeting(self, audio_path, title, description=None, 
                      participants=None, template_id=None):
        """Create a new meeting with audio processing"""
        url = f'{self.base_url}/api/v1/mobile/meetings/'
        
        files = {'audio_file': open(audio_path, 'rb')}
        data = {'title': title}
        
        if description:
            data['description'] = description
        if participants:
            data['participants'] = json.dumps(participants)
        if template_id:
            data['templateid'] = template_id
        
        response = requests.post(url, headers=self.headers, 
                               data=data, files=files)
        return response.json()
    
    def get_meetings(self, page=1, limit=20, status=None, search=None):
        """Get meetings with filters"""
        url = f'{self.base_url}/api/v1/mobile/meetings/'
        params = {'page': page, 'limit': limit}
        
        if status:
            params['status'] = status
        if search:
            params['search'] = search
        
        response = requests.get(url, headers=self.headers, params=params)
        return response.json()
    
    def get_meeting(self, meeting_id):
        """Get specific meeting by ID"""
        url = f'{self.base_url}/api/v1/mobile/meetings/{meeting_id}'
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def update_speaker_names(self, meeting_id, old_name, new_name):
        """Update speaker name in transcription"""
        url = f'{self.base_url}/api/v1/mobile/meetings/{meeting_id}/speaker-names'
data = {
            'old_speaker_name': old_name,
            'new_speaker_name': new_name
        }
        response = requests.put(url, headers=self.headers, json=data)
        return response.json()
    
    def get_speakers(self):
        """Get all unique speakers from user's meetings"""
        url = f'{self.base_url}/api/v1/crm/speakers'
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def search_by_speaker(self, speaker_name, page=1, limit=20):
        """Find all meetings with a specific speaker"""
        url = f'{self.base_url}/api/v1/crm/speakers/{speaker_name}/meetings'
        params = {'page': page, 'limit': limit}
        response = requests.get(url, headers=self.headers, params=params)
        return response.json()

# Usage
client = MemoAppClient('http://localhost:8000', 'your-access-token')

# Create meeting
meeting = client.create_meeting(
    audio_path='recording.mp3',
    title='Q4 Sales Review',
    description='Quarterly sales performance review',
    participants=['John Doe', 'Jane Smith']
)
print(f"Created meeting: {meeting['id']}")

# Get all completed meetings
meetings = client.get_meetings(status='completed')
print(f"Found {meetings['total']} completed meetings")

# Update speaker names
updated = client.update_speaker_names(
    meeting_id=meeting['id'],
    old_name='Speaker1',
    new_name='John Doe'
)
```

## 📚 API Response Examples

### **Meeting Creation Response**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Q4 Sales Review",
  "description": "Quarterly sales performance discussion",
  "participants": ["John Doe", "Jane Smith"],
  "transcription": [
    {
      "speaker": "John Doe",
      "text": "Welcome everyone to our Q4 review...",
      "start_time": "0:00",
      "end_time": "0:15"
    },
    {
      "speaker": "Jane Smith",
      "text": "Thank you John. Let's start with...",
      "start_time": "0:15",
      "end_time": "0:30"
    }
  ],
  "summary": "The team discussed Q4 sales performance...",
  "key_points": "1. Revenue increased by 25%\n2. New product launch successful...",
  "action_items": [
    {
      "task": "Prepare Q1 forecast",
      "assigned_to": "Jane Smith",
      "due_date": "2024-01-15"
    }
  ],
  "audio_filename": "meeting_550e8400.mp3",
  "s3_audio_path": "meetings/audio/550e8400-e29b-41d4-a716-446655440000.mp3",
  "templateid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "PENDING",
  "analytics_status": "PENDING",
  "user_id": 42,
  "created_at": "2024-01-10T14:30:00Z",
  "updated_at": "2024-01-10T14:30:00Z"
}
```

### **Paginated Meetings Response**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Q4 Sales Review",
      "status": "COMPLETED",
      "created_at": "2024-01-10T14:30:00Z",
      ...
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "total_pages": 8
}
```

### **Template Suggestion Response**
```json
{
  "suggested_template_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "suggested_template_name": "Sales Call",
  "confidence": 0.92,
  "reason": "Audio contains sales-related keywords and pricing discussions",
  "alternative_templates": [
    {
      "template_id": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
      "template_name": "Customer Support",
      "confidence": 0.65
    }
  ]
}
```

### **Speaker List Response**
```json
{
  "speakers": [
    {
      "speaker_name": "John Doe",
      "meeting_count": 15,
      "profile": {
        "id": "profile-uuid",
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe",
        "email": "john@example.com",
        "company": "Acme Corp",
        "designation": "Sales Manager"
      }
    },
    {
      "speaker_name": "Speaker1",
      "meeting_count": 3,
      "profile": null
    }
  ],
  "total": 2
}
```

## 🚨 Error Handling

### **HTTP Status Codes**
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid input or malformed request
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server-side error
- `503 Service Unavailable`: AI service temporarily unavailable
- `504 Gateway Timeout`: Request timeout

### **Error Response Format**
```json
{
  "detail": "Error message describing what went wrong"
}
```

### **Common Error Scenarios**

#### Authentication Errors
```json
{
  "detail": "Could not validate credentials"
}
```

#### Validation Errors
```json
{
  "detail": [
    {
      "loc": ["body", "title"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### Audio Processing Errors
```json
{
  "detail": "Invalid audio file format. Please use M4A, WAV, or MP3."
}
```

### **Retry Strategy**
The background transcription service implements exponential backoff:
- **Initial delay**: 2 seconds
- **Max retries**: 3 attempts
- **Max delay**: 60 seconds
- **Backoff formula**: `min(base_delay * (2 ^ attempt) + random_jitter, max_delay)`

## 🔧 Development & Deployment

### **Development Best Practices**

#### Running in Development Mode
```bash
# With auto-reload
python run.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Database Migrations
```bash
# Run existing migrations
python database/migration_*.py

# Create new migration
# 1. Update model in api/models/
# 2. Create migration script in database/
# 3. Run migration script
```

#### Testing
```bash
# Test authentication
python test_auth.py

# Test background service
python test_background_service.py

# Reset failed meetings
python reset_failed_meetings.py
```

### **Production Deployment**

#### Using Uvicorn with Multiple Workers
```bash
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --log-level info \
  --access-log \
  --proxy-headers
```

#### Using Gunicorn with Uvicorn Workers
```bash
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

#### Docker Deployment
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### Environment Variables for Production
```bash
NODE_ENV=production
HTTPS_ENABLED=true
JWT_SECRET=<strong-random-secret>
DATABASE_URL=<production-database-url>
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

### **Monitoring & Logging**

#### Log Files
- `logs/output.log`: General application logs
- `logs/error.log`: Error-specific logs

#### Logging Format
```
2024-01-10 14:30:45 - module_name - INFO - Log message
```

#### Health Check Endpoint
```bash
curl http://localhost:8000/health
# Response: {"status": "healthy", "version": "1.0.0"}
```

#### Background Service Status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/mobile/meetings/transcription/status
```

### **Performance Optimization**

#### Database Indexing
- User ID indexed for fast user-specific queries
- Status fields indexed for filtering
- Email indexed for authentication lookups
- Created_at indexed for date-range queries

#### Caching Strategies
- Template caching for frequently used templates
- Presigned URL caching (1-hour expiration)
- User session caching

#### Async Processing Benefits
- Non-blocking meeting creation (< 5 seconds)
- Background transcription processing
- Concurrent chunk processing for large audio files
- S3 async uploads

### **Security Considerations**

1. **Authentication**: JWT tokens with short expiration
2. **Authorization**: User-specific data access control
3. **Input Validation**: Pydantic schemas for all inputs
4. **File Upload Security**: 
   - File type validation
   - Size limits enforced
   - Unique S3 paths with UUIDs
5. **SQL Injection**: Protected via SQLAlchemy ORM
6. **CORS**: Configured allowed origins
7. **Environment Variables**: Never commit `.env` files
8. **HTTPS**: Strongly recommended for production

### **Scaling Strategies**

#### Horizontal Scaling
- Run multiple instances behind load balancer
- Shared PostgreSQL database
- Shared S3 storage
- Session-less JWT authentication

#### Vertical Scaling
- Increase worker count: `--workers 8`
- Increase concurrent chunk processing threads
- Larger database instance

#### Database Scaling
- Read replicas for GET requests
- Connection pooling (SQLAlchemy default)
- Query optimization with proper indexes

## 🔍 Troubleshooting

### **Common Issues and Solutions**

#### 1. Authentication Issues

**Problem**: `Could not validate credentials`
```bash
# Solution: Check if access token is expired
# Request new token using refresh token
curl -X POST http://localhost:8000/api/v1/mobile/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your-refresh-token"}'
```

**Problem**: Microsoft/Google OAuth not working
- Verify client ID and secret are correct
- Check redirect URI matches exactly (trailing slashes matter)
- Ensure app has required permissions in Azure/Google Cloud
- Check company domain matches user's email domain

#### 2. Audio Processing Issues

**Problem**: Audio processing stuck in PENDING status
```bash
# Check background service status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/mobile/meetings/transcription/status

# Restart background service
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/mobile/meetings/transcription/restart-background

# Process all pending meetings
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/mobile/meetings/transcription/process-all
```

**Problem**: Audio processing fails with FAILED status
- Check `GEMINI_KEY` is valid and has quota
- Verify audio file format is supported
- Check audio file size is within limits
- Review logs for specific error messages
- Manually retry failed meeting

**Problem**: "Audio file too large" error
- Check `MAX_AUDIO_FILE_SIZE` setting
- Compress audio file before upload
- Use lower bitrate audio recording

#### 3. S3 Integration Issues

**Problem**: Audio upload to S3 fails
- Verify AWS credentials are correct
- Check S3 bucket exists and is accessible
- Verify IAM permissions include `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
- Check bucket CORS policy

**Problem**: Presigned URL returns 403 Forbidden
- Verify AWS credentials have not expired
- Check IAM policy allows `s3:GetObject`
- Verify bucket policy allows access

#### 4. Database Issues

**Problem**: Connection errors
```bash
# Test database connection
psql $DATABASE_URL

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -c "\l"
```

**Problem**: Migration errors
- Run migrations in order (check timestamp)
- Backup database before migrations
- Review migration script for errors

#### 5. Performance Issues

**Problem**: Slow transcription processing
- Increase worker threads in `audio_service.py`
- Use smaller audio chunk sizes
- Check Gemini API rate limits
- Monitor server CPU and memory usage

**Problem**: High memory usage
- Reduce concurrent processing threads
- Implement audio streaming instead of loading full file
- Increase server RAM

#### 6. API Request Issues

**Problem**: CORS errors from mobile app
- Add app domain to `CORS_ORIGINS` in settings
- Check if credentials are included in requests
- Verify HTTP method is allowed

**Problem**: Request timeout
- Increase timeout in mobile app
- Use background processing instead of sync
- Check network connectivity

### **Debug Mode**

Enable detailed logging:
```python
# In config/settings.py or environment
LOG_LEVEL=DEBUG

# View logs
tail -f logs/output.log
tail -f logs/error.log
```

### **Useful Commands**

```bash
# Check server is running
curl http://localhost:8000/health

# View all registered routes
curl http://localhost:8000/api/v1/mobile/debug/routes

# Test authentication
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/mobile/auth/me

# Check background service
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/mobile/meetings/transcription/status

# Monitor PostgreSQL connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check disk space for audio files
df -h /path/to/uploads
aws s3 ls s3://your-bucket/meetings/audio/ --recursive --summarize
```

## 🎯 Key Features Summary

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Auth** | Microsoft & Google OAuth | ✅ Production Ready |
| **AI Transcription** | Gemini 2.0 Flash with speaker diarization | ✅ Production Ready |
| **Dual Audio** | Merge two audio streams | ✅ Production Ready |
| **Background Processing** | Async transcription with retry logic | ✅ Production Ready |
| **S3 Storage** | Cloud audio storage with presigned URLs | ✅ Production Ready |
| **AI Suggestions** | Auto-suggest title, description, template | ✅ Production Ready |
| **Custom Templates** | User-defined AI processing templates | ✅ Production Ready |
| **CRM Integration** | Speaker profiles and meeting history | ✅ Production Ready |
| **Analytics** | Comprehensive meeting analytics | ✅ Production Ready |
| **REST API** | RESTful endpoints with OpenAPI docs | ✅ Production Ready |
| **Status Tracking** | Real-time processing status | ✅ Production Ready |
| **Bulk Operations** | Update multiple records efficiently | ✅ Production Ready |

## 📊 System Requirements

### **Minimum Requirements**
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB (+ S3 for audio files)
- **Database**: PostgreSQL 12+
- **Python**: 3.12+

### **Recommended for Production**
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 50 GB SSD
- **Database**: PostgreSQL 14+ with 4 GB RAM
- **Network**: 100 Mbps+ bandwidth

## 📖 Additional Resources

### **Documentation Files**
- `RESTART_GUIDE.md`: Server restart and maintenance guide
- `TRANSCRIPTION_STATUS_FEATURES.md`: Detailed status tracking features
- `requirements.txt`: Complete Python dependencies list

### **API Documentation**
- **Swagger UI**: `http://your-domain/docs` - Interactive API testing
- **ReDoc**: `http://your-domain/redoc` - Clean API documentation

### **Related Services**
- **Dashboard**: External analytics dashboard integration
- **Mobile App**: Flutter/React Native client applications

## 🤝 Support & Contact

### **Getting Help**
1. Check the troubleshooting section above
2. Review API documentation at `/docs`
3. Check logs in `logs/` directory
4. Review database migration scripts

### **Feature Requests**
- Submit detailed feature requests with use cases
- Include API endpoint examples if applicable

## 🔐 Security & Privacy

- **Data Encryption**: All data encrypted in transit (HTTPS) and at rest (S3)
- **Authentication**: Industry-standard OAuth 2.0 with JWT
- **Access Control**: User-specific data isolation
- **Audio Storage**: Secure S3 storage with presigned temporary URLs
- **API Security**: Rate limiting and input validation
- **Audit Logging**: Comprehensive logging of all operations

## 📝 License

This project is proprietary software. All rights reserved.

## 🚀 Quick Start Checklist

- [ ] Install Python 3.12+
- [ ] Set up PostgreSQL database
- [ ] Configure AWS S3 bucket
- [ ] Get Google Gemini API key
- [ ] Set up Microsoft/Google OAuth apps
- [ ] Create `.env` file with all variables
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Run server: `python run.py`
- [ ] Access docs: `http://localhost:8000/docs`
- [ ] Test authentication flow
- [ ] Upload test audio file
- [ ] Verify background processing
- [ ] Check S3 upload successful

## 🎉 Production Checklist

- [ ] Use production database
- [ ] Enable HTTPS (`HTTPS_ENABLED=true`)
- [ ] Set strong `JWT_SECRET`
- [ ] Configure production `CORS_ORIGINS`
- [ ] Set up load balancer
- [ ] Configure monitoring and alerting
- [ ] Set up database backups
- [ ] Configure S3 bucket lifecycle policies
- [ ] Enable CloudWatch/logging
- [ ] Set up CI/CD pipeline
- [ ] Configure rate limiting
- [ ] Test disaster recovery procedures

---

**Built with ❤️ using FastAPI, Google Gemini AI, and modern cloud technologies.** 