"""
Dashboard service for sending analytics data to dashboard backend
"""
import asyncio
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from config.settings import settings

# Configure logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

class DashboardService:
    def __init__(self):
        self.dashboard_base_url = getattr(settings, 'DASHBOARD_BASE_URL', 'http://localhost:5173')
        self.username = getattr(settings, 'DASHBOARD_USERNAME', '')
        self.password = getattr(settings, 'DASHBOARD_PASSWORD', '')
        self.access_token = None
        self.token_expires_at = None
        
    async def _login(self) -> bool:
        """
        Login to dashboard API and get access token
        
        Returns:
            bool: True if login successful, False otherwise
        """
        try:
            if not self.username or not self.password:
                logger.error("Dashboard username or password not configured")
                return False
            
            # Prepare login data
            login_data = {
                "grant_type": "password",
                "username": self.username,
                "password": self.password,
                "scope": "",
                "client_id": "string",
                "client_secret": "string"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.dashboard_base_url}/api/v1/auth/login",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.access_token = token_data.get("access_token")
                    self.token_expires_at = datetime.now().timestamp() + 3600  # Assume 1 hour expiry
                    
                    logger.info("🔐 Successfully logged in to dashboard API")
                    logger.info(f"Token received: {self.access_token[:50]}...")
                    logger.info(f"Token expires at: {datetime.fromtimestamp(self.token_expires_at).isoformat()}")
                    return True
                else:
                    logger.error(f"❌ Login failed with status {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error during login: {str(e)}")
            return False
    
    async def _ensure_valid_token(self) -> bool:
        """
        Ensure we have a valid access token, login if needed
        
        Returns:
            bool: True if we have a valid token, False otherwise
        """
        # Check if we have a token and it's not expired
        if self.access_token and self.token_expires_at:
            if datetime.now().timestamp() < self.token_expires_at - 60:  # 1 minute buffer
                return True
        
        # Need to login
        return await self._login()
    
    async def send_analytics_data(self, analytics_data: Dict[str, Any], max_retries: int = 3) -> bool:
        """
        Send analytics data to dashboard backend with retry logic
        
        Args:
            analytics_data: Flat analytics data from FlatMeetingAnalytics
            max_retries: Maximum number of retry attempts
            
        Returns:
            bool: True if successful, False otherwise
        """
        meeting_id = analytics_data.get('meeting_id', 'unknown')
        
        # Ensure we have a valid token
        if not await self._ensure_valid_token():
            logger.error("Failed to get valid access token for dashboard API")
            return False
        
        for attempt in range(max_retries + 1):
            try:
                # Map analytics data to dashboard API format
                dashboard_payload = self._map_to_dashboard_format(analytics_data)
                
                # Log the data being sent to dashboard
                logger.info(f"Sending analytics data to dashboard for meeting {meeting_id}")
                logger.info(f"Dashboard payload keys: {list(dashboard_payload.keys())}")
                logger.info(f"Meeting details: ID={dashboard_payload.get('meeting_id')}, Title='{dashboard_payload.get('meeting_title')}', Participants={len(dashboard_payload.get('participants', []))}")
                logger.info(f"Analytics scores: audio_clarity={dashboard_payload.get('audio_clarity')}, video_quality={dashboard_payload.get('video_quality')}, total_participants={dashboard_payload.get('total_participants')}")
                logger.info(f"Processing metadata: model_used='{dashboard_payload.get('model_used')}', transcript_length={dashboard_payload.get('transcript_length')}, processing_duration={dashboard_payload.get('processing_duration_seconds')}s")
                
                # Send to dashboard API
                async with httpx.AsyncClient(timeout=30.0) as client:
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.access_token}"
                    }
                    
                    response = await client.post(
                        f"{self.dashboard_base_url}/api/v1/call-record/",
                        json=dashboard_payload,
                        headers=headers
                    )
                    
                    if response.status_code == 200 or response.status_code == 201:
                        logger.info(f"✅ Successfully sent analytics data to dashboard for meeting {meeting_id}")
                        logger.info(f"Dashboard response: {response.status_code} - {response.text[:200]}...")
                        return True
                    elif response.status_code == 401:
                        # Token expired, try to login again
                        logger.warning(f"🔑 Token expired, attempting to login again (attempt {attempt + 1}/{max_retries + 1})")
                        if await self._login():
                            logger.info("🔄 Token refreshed successfully, retrying dashboard API call")
                            continue  # Retry with new token
                        else:
                            logger.error("❌ Failed to refresh token")
                            return False
                    else:
                        logger.warning(f"⚠️ Dashboard API returned status {response.status_code} (attempt {attempt + 1}/{max_retries + 1})")
                        logger.warning(f"Response body: {response.text}")
                        if attempt < max_retries:
                            logger.info(f"⏳ Retrying in {2 ** attempt} seconds...")
                            await asyncio.sleep(2 ** attempt)  # Exponential backoff
                            continue
                        else:
                            logger.error(f"❌ Failed to send analytics data to dashboard after {max_retries + 1} attempts")
                            return False
                        
            except httpx.TimeoutException:
                logger.warning(f"Timeout while sending data to dashboard API (attempt {attempt + 1}/{max_retries + 1})")
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    logger.error("Timeout while sending data to dashboard API after all retries")
                    return False
            except httpx.RequestError as e:
                logger.warning(f"Request error while sending data to dashboard API (attempt {attempt + 1}/{max_retries + 1}): {str(e)}")
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    logger.error(f"Request error while sending data to dashboard API after all retries: {str(e)}")
                    return False
            except Exception as e:
                logger.error(f"Unexpected error while sending data to dashboard API: {str(e)}")
                return False
        
        return False
    
    def _map_to_dashboard_format(self, analytics_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map flat analytics data to dashboard API format
        
        Args:
            analytics_data: Flat analytics data from FlatMeetingAnalytics
            
        Returns:
            dict: Mapped data in dashboard API format
        """
        # Extract participants list and convert to dict format
        participants = analytics_data.get("participants", [])
        if isinstance(participants, str):
            # If participants is a string, split by comma
            participants = [p.strip() for p in participants.split(',') if p.strip()]
        elif not isinstance(participants, list):
            participants = []
        
        # Convert participants to dict format as expected by dashboard API
        participants_dict = [{"name": p} for p in participants]
        
        logger.info(f"📊 Mapping analytics data for meeting {analytics_data.get('meeting_id', 'unknown')}")
        logger.info(f"Participants: {participants} -> {participants_dict}")
        
        # Map to dashboard format
        dashboard_data = {
            "meeting_id": analytics_data.get("meeting_id", 0),
            "user_id": 0,  # Dashboard expects user_id, but we're using user_email
            "meeting_title": analytics_data.get("meeting_title", ""),
            "meeting_date": analytics_data.get("meeting_date", ""),
            
            # Technical Audio Visual Quality (6 fields)
            "audio_clarity": self._safe_int(analytics_data.get("audio_clarity", 0)),
            "video_quality": self._safe_int(analytics_data.get("video_quality", 0)),
            "connectivity_stability": self._safe_int(analytics_data.get("connectivity_stability", 0)),
            "latency_delay": self._safe_int(analytics_data.get("latency_delay", 0)),
            "mute_unmute_usage": self._safe_int(analytics_data.get("mute_unmute_usage", 0)),
            "screen_sharing_quality": self._safe_int(analytics_data.get("screen_sharing_quality", 0)),
            
            # Participation Engagement (7 fields)
            "total_participants": self._safe_int(analytics_data.get("total_participants", 0)),
            "on_time_participants": self._safe_int(analytics_data.get("on_time_participants", 0)),
            "late_participants": self._safe_int(analytics_data.get("late_participants", 0)),
            "avg_duration_minutes": self._safe_int(analytics_data.get("avg_duration_minutes", 0)),
            "active_participation": self._safe_int(analytics_data.get("active_participation", 0)),
            "engagement_level": self._safe_int(analytics_data.get("engagement_level", 0)),
            "speaking_distribution": self._safe_int(analytics_data.get("speaking_distribution", 0)),
            "listening_quality": self._safe_int(analytics_data.get("listening_quality", 0)),
            "participation_balance": self._safe_int(analytics_data.get("participation_balance", 0)),
            "chat_contributions": self._safe_int(analytics_data.get("chat_contributions", 0)),
            "poll_responses": self._safe_int(analytics_data.get("poll_responses", 0)),
            
            # Meeting Effectiveness (5 fields)
            "agenda_coverage": self._safe_int(analytics_data.get("agenda_coverage", 0)),
            "time_management": self._safe_int(analytics_data.get("time_management", 0)),
            "action_items_defined": self._safe_int(analytics_data.get("action_items_defined", 0)),
            "decision_making_efficiency": self._safe_int(analytics_data.get("decision_making_efficiency", 0)),
            "discussion_relevance": self._safe_int(analytics_data.get("discussion_relevance", 0)),
            
            # Collaboration Communication (5 fields)
            "clarity_of_communication": self._safe_int(analytics_data.get("clarity_of_communication", 0)),
            "inclusiveness": self._safe_int(analytics_data.get("inclusiveness", 0)),
            "team_collaboration": self._safe_int(analytics_data.get("team_collaboration", 0)),
            "conflict_handling": self._safe_int(analytics_data.get("conflict_handling", 0)),
            "cross_department_interactions": self._safe_int(analytics_data.get("cross_department_interactions", 0)),
            
            # Behavioral Professional Aspects (5 fields)
            "professional_etiquette": self._safe_int(analytics_data.get("professional_etiquette", 0)),
            "camera_discipline": self._safe_int(analytics_data.get("camera_discipline", 0)),
            "non_verbal_cues": self._safe_int(analytics_data.get("non_verbal_cues", 0)),
            "respectful_communication": self._safe_int(analytics_data.get("respectful_communication", 0)),
            "follow_up_ownership": self._safe_int(analytics_data.get("follow_up_ownership", 0)),
            
            # Security Compliance (4 fields) - Convert to boolean
            "meeting_access_control": self._safe_bool(analytics_data.get("meeting_access_control", True)),
            "confidentiality_maintained": self._safe_bool(analytics_data.get("confidentiality_maintained", True)),
            "recording_compliance": self._safe_bool(analytics_data.get("recording_compliance", True)),
            "data_sharing_policies": self._safe_bool(analytics_data.get("data_sharing_policies", True)),
            
            # Post Meeting Outcomes (4 fields)
            "meeting_minutes_shared": self._safe_bool(analytics_data.get("meeting_minutes_shared", True)),
            "action_items_tracked": self._safe_bool(analytics_data.get("action_items_tracked", True)),
            "feedback_collection": self._safe_int(analytics_data.get("feedback_collection", 0)),
            "meeting_roi": self._safe_int(analytics_data.get("meeting_roi", 0)),
            
            # Metadata
            "extraction_timestamp": analytics_data.get("extraction_timestamp", datetime.now().isoformat()),
            "transcript_length": self._safe_int(analytics_data.get("transcript_length", 0)),
            "processing_duration_seconds": self._safe_int(analytics_data.get("processing_duration_seconds", 0)),
            "model_used": analytics_data.get("model_used", "gemini-2.0-flash"),
            "participants": participants_dict,
            "duration_minutes": self._safe_int(analytics_data.get("duration_minutes", 0)),
            "transcriptions": self._format_transcriptions(analytics_data.get("transcriptions", []))
        }

        # Add Audio Insights (if available)
        if "key_moments" in analytics_data:
            dashboard_data["key_moments"] = analytics_data.get("key_moments", [])
        if "notable_silences" in analytics_data:
            dashboard_data["notable_silences"] = self._safe_int(analytics_data.get("notable_silences", 0))
        if "energy_shifts" in analytics_data:
            dashboard_data["energy_shifts"] = self._safe_int(analytics_data.get("energy_shifts", 0))
        if "speech_patterns" in analytics_data:
            dashboard_data["speech_patterns"] = analytics_data.get("speech_patterns", [])
        
        logger.info(f"✅ Dashboard payload mapped successfully - {len(dashboard_data)} fields")
        logger.info(f"Key metrics: audio_clarity={dashboard_data.get('audio_clarity')}, video_quality={dashboard_data.get('video_quality')}, engagement_level={dashboard_data.get('engagement_level')}")
        
        return dashboard_data
    
    def _safe_int(self, value: Any, default: int = 0) -> int:
        """Safely convert value to int"""
        try:
            if value is None:
                return default
            return int(float(str(value)))
        except (ValueError, TypeError):
            return default
    
    def _safe_bool(self, value: Any, default: bool = True) -> bool:
        """Safely convert value to bool"""
        try:
            if value is None:
                return default
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ('true', '1', 'yes', 'on')
            return bool(value)
        except (ValueError, TypeError):
            return default
    
    def _format_transcriptions(self, transcriptions: list) -> dict:
        """
        Format transcription data for dashboard API
        
        Args:
            transcriptions: List of transcription segments
            
        Returns:
            dict: Formatted transcription data
        """
        if not transcriptions or not isinstance(transcriptions, list):
            return {}
        
        try:
            # Group transcriptions by speaker
            speaker_transcriptions = {}
            
            for segment in transcriptions:
                if isinstance(segment, dict) and 'speaker' in segment:
                    speaker = segment['speaker']
                    if speaker not in speaker_transcriptions:
                        speaker_transcriptions[speaker] = []
                    
                    # Format the segment
                    formatted_segment = {
                        'start': segment.get('start', 0),
                        'end': segment.get('end', 0),
                        'text': segment.get('text', ''),
                        'timestamp': segment.get('start', 0)  # Use start time as timestamp
                    }
                    speaker_transcriptions[speaker].append(formatted_segment)
            
            # Convert to the format expected by dashboard API
            formatted_transcriptions = {}
            for speaker, segments in speaker_transcriptions.items():
                formatted_transcriptions[speaker] = {
                    'segments': segments,
                    'total_segments': len(segments),
                    'total_duration': max([s.get('end', 0) for s in segments]) if segments else 0
                }
            
            logger.info(f"📝 Formatted {len(transcriptions)} transcription segments for {len(speaker_transcriptions)} speakers")
            return formatted_transcriptions
            
        except Exception as e:
            logger.warning(f"Error formatting transcriptions: {e}")
            return {}

# Global instance
dashboard_service = DashboardService()
