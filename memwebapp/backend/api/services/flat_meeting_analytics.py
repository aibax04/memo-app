"""
Flat Meeting Analytics - Single JSON structure
All analytics fields in one flat JSON object for easy dashboard integration
"""
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
from config.settings import settings

# Configure logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

class FlatMeetingAnalytics:
    def __init__(self):
        """Initialize the analytics extractor with Gemini configuration"""
        self.model = None
        if not settings.GEMINI_KEY:
            logger.warning("GEMINI_KEY not found. Analytics extraction will not be available.")
            return
        
        genai.configure(api_key=settings.GEMINI_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Flat Meeting Analytics initialized with Gemini 2.0 Flash")
    
    def extract_analytics(
        self,
        meeting_id: int,
        user_email: str,
        meeting_title: str,
        meeting_date: str,
        transcript: List[Dict[str, Any]],
        participants: Optional[List[str]] = None,
        duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Extract analytics and return as single flat JSON object
        
        Args:
            meeting_id: ID of the meeting
            user_email: Email of the user who owns the meeting
            meeting_title: Title of the meeting
            meeting_date: Date when the meeting occurred (ISO format string)
            transcript: List of transcript segments
            participants: List of participant names (optional)
            duration_minutes: Meeting duration in minutes (optional)
        
        Returns:
            Single flat JSON object with all analytics fields
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Extracting flat analytics for meeting {meeting_id}: {meeting_title}")
            
            # Extract participants and duration from transcript if not provided
            if not participants:
                participants = self._extract_participants_from_transcript(transcript)
            if not duration_minutes:
                duration_minutes = self._calculate_duration_from_transcript(transcript)
            
            logger.info(f"Extracted {len(participants)} participants and {duration_minutes} minutes duration from transcript")
            
            # Prepare transcript text
            transcript_text = self._prepare_transcript_text(transcript)
            logger.info(f"Prepared transcript with {len(transcript)} segments")
            
            # Create prompt for Gemini
            prompt = self._create_analytics_prompt(transcript_text, meeting_title, participants, duration_minutes)
            
            # Extract analytics using Gemini
            logger.info("Sending request to Gemini for analytics extraction...")
            logger.info(f"📤 [Sentiment] Prompt includes sentiment analysis: {'meeting_sentiment' in prompt}")
            response = self.model.generate_content(prompt)
            
            if not response.text:
                raise ValueError("No response generated from Gemini")
            
            # Log raw response for debugging (first 500 chars)
            logger.info(f"📥 [Sentiment] Raw Gemini response (first 500 chars): {response.text[:500]}...")
            
            # Parse JSON response
            analytics_data = self._parse_gemini_response(response.text)
            
            # Log what keys we got from Gemini
            logger.info(f"📋 [Sentiment] Keys in parsed analytics_data: {list(analytics_data.keys())}")
            
            # Calculate processing duration
            processing_duration = (datetime.now() - start_time).total_seconds()
            
            # Extract sentiment values with safe fallbacks
            sentiment_value = "neutral"
            sentiment_score_value = 5.0
            
            try:
                if "meeting_sentiment" in analytics_data:
                    sentiment_data = analytics_data["meeting_sentiment"]
                    sentiment_value = sentiment_data.get("sentiment", "neutral")
                    sentiment_score_value = sentiment_data.get("sentiment_score", 5.0)
                    logger.info(f"✅ [Sentiment] Extracted sentiment from Gemini: {sentiment_value} (score: {sentiment_score_value})")
                else:
                    logger.warning("⚠️ [Sentiment] meeting_sentiment not found in Gemini response - using defaults (neutral, 5.0)")
                    logger.warning(f"⚠️ [Sentiment] Available keys in analytics_data: {list(analytics_data.keys())}")
            except Exception as e:
                logger.error(f"❌ [Sentiment] Error extracting sentiment data: {e}")
                logger.error(f"❌ [Sentiment] Using defaults: neutral, 5.0")
            
            logger.info(f"📝 [Sentiment] Final extracted values - sentiment: '{sentiment_value}', score: {sentiment_score_value}")
            
            # Create single flat JSON object
            flat_analytics = {
                # Meeting identification
                "meeting_id": str(meeting_id),  # Convert UUID to string for JSON serialization
                "user_email": user_email,
                "meeting_title": meeting_title,
                "meeting_date": meeting_date,
                
                # Technical Audio Visual Quality (6 fields)
                "audio_clarity": analytics_data["technical_audio_visual_quality"]["audio_clarity"],
                "video_quality": analytics_data["technical_audio_visual_quality"]["video_quality"],
                "connectivity_stability": analytics_data["technical_audio_visual_quality"]["connectivity_stability"],
                "latency_delay": analytics_data["technical_audio_visual_quality"]["latency_delay"],
                "mute_unmute_usage": analytics_data["technical_audio_visual_quality"]["mute_unmute_usage"],
                "screen_sharing_quality": analytics_data["technical_audio_visual_quality"]["screen_sharing_quality"],
                
                # Participation Engagement (7 fields)
                "total_participants": analytics_data["participation_engagement"]["attendance"]["total_participants"],
                "on_time_participants": analytics_data["participation_engagement"]["attendance"]["on_time"],
                "late_participants": analytics_data["participation_engagement"]["attendance"]["late"],
                "avg_duration_minutes": analytics_data["participation_engagement"]["attendance"]["avg_duration_minutes"],
                "active_participation": analytics_data["participation_engagement"]["active_participation"],
                "engagement_level": analytics_data["participation_engagement"]["engagement_level"],
                "chat_contributions": analytics_data["participation_engagement"]["chat_contributions"],
                "poll_responses": analytics_data["participation_engagement"]["poll_responses"],
                
                # Meeting Effectiveness (5 fields)
                "agenda_coverage": analytics_data["meeting_effectiveness"]["agenda_coverage"],
                "time_management": analytics_data["meeting_effectiveness"]["time_management"],
                "action_items_defined": analytics_data["meeting_effectiveness"]["action_items_defined"],
                "decision_making_efficiency": analytics_data["meeting_effectiveness"]["decision_making_efficiency"],
                "discussion_relevance": analytics_data["meeting_effectiveness"]["discussion_relevance"],
                
                # Engagement & Participation (Specific to UI)
                "speaking_distribution": analytics_data["participation_engagement"].get("speaking_distribution", 7.0),
                "listening_quality": analytics_data["participation_engagement"].get("listening_quality", 7.0),
                "participation_balance": analytics_data["participation_engagement"].get("participation_balance", 7.0),
                
                # Audio Insights & Voice Characteristics
                "key_moments": analytics_data.get("audio_insights", {}).get("key_moments", []),
                "notable_silences": analytics_data.get("audio_insights", {}).get("notable_silences_count", 0),
                "energy_shifts": analytics_data.get("audio_insights", {}).get("energy_shifts_count", 0),
                "speech_patterns": analytics_data.get("audio_insights", {}).get("notable_patterns", []),
                
                # Collaboration Communication (5 fields)
                "clarity_of_communication": analytics_data["collaboration_communication"]["clarity_of_communication"],
                "inclusiveness": analytics_data["collaboration_communication"]["inclusiveness"],
                "team_collaboration": analytics_data["collaboration_communication"]["team_collaboration"],
                "conflict_handling": analytics_data["collaboration_communication"]["conflict_handling"],
                "cross_department_interactions": analytics_data["collaboration_communication"]["cross_department_interactions"],
                
                # Behavioral Professional Aspects (5 fields)
                "professional_etiquette": analytics_data["behavioral_professional_aspects"]["professional_etiquette"],
                "camera_discipline": analytics_data["behavioral_professional_aspects"]["camera_discipline"],
                "non_verbal_cues": analytics_data["behavioral_professional_aspects"]["non_verbal_cues"],
                "respectful_communication": analytics_data["behavioral_professional_aspects"]["respectful_communication"],
                "follow_up_ownership": analytics_data["behavioral_professional_aspects"]["follow_up_ownership"],
                
                # Security Compliance (4 fields)
                "meeting_access_control": analytics_data["security_compliance"]["meeting_access_control"],
                "confidentiality_maintained": analytics_data["security_compliance"]["confidentiality_maintained"],
                "recording_compliance": analytics_data["security_compliance"]["recording_compliance"],
                "data_sharing_policies": analytics_data["security_compliance"]["data_sharing_policies"],
                
                # Post Meeting Outcomes (4 fields)
                "meeting_minutes_shared": analytics_data["post_meeting_outcomes"]["meeting_minutes_shared"],
                "action_items_tracked": analytics_data["post_meeting_outcomes"]["action_items_tracked"],
                "feedback_collection": analytics_data["post_meeting_outcomes"]["feedback_collection"],
                "meeting_roi": analytics_data["post_meeting_outcomes"]["meeting_roi"],
                
                # Meeting Sentiment (2 fields)
                "sentiment": sentiment_value,
                "sentiment_score": sentiment_score_value,
                
                # Metadata
                "extraction_timestamp": datetime.now().isoformat(),
                "transcript_length": len(transcript),
                "processing_duration_seconds": processing_duration,
                "model_used": "gemini-2.0-flash",
                "participants": participants or [],
                "duration_minutes": duration_minutes if duration_minutes is not None else 0.0,
                "transcriptions": transcript  # Include full transcription data
            }
            
            # Log final sentiment values in flat analytics
            final_sentiment = flat_analytics.get("sentiment", "not_set")
            final_sentiment_score = flat_analytics.get("sentiment_score", "not_set")
            logger.info(f"📊 [Sentiment] Final sentiment in flat_analytics: {final_sentiment} (score: {final_sentiment_score})")
            
            logger.info(f"Successfully extracted flat analytics for meeting {meeting_id} in {processing_duration:.2f} seconds")
            return flat_analytics
            
        except Exception as e:
            logger.error(f"Error extracting flat analytics for meeting {meeting_id}: {str(e)}")
            raise
    
    def _extract_participants_from_transcript(self, transcript: List[Dict[str, Any]]) -> List[str]:
        """Extract unique participants from transcript segments"""
        if not transcript:
            return []
        
        participants = set()
        for segment in transcript:
            if isinstance(segment, dict) and 'speaker' in segment:
                speaker = segment['speaker']
                if speaker and speaker not in participants:
                    participants.add(speaker)
        
        return list(participants)
    
    def _calculate_duration_from_transcript(self, transcript: List[Dict[str, Any]]) -> Optional[int]:
        """Calculate meeting duration in minutes from transcript timestamps"""
        if not transcript:
            return None
        
        try:
            # Find the maximum end time across all segments
            max_end_time = 0
            for segment in transcript:
                if isinstance(segment, dict) and 'end' in segment:
                    end_time = segment['end']
                    if isinstance(end_time, (int, float)):
                        max_end_time = max(max_end_time, end_time)
                    elif isinstance(end_time, str):
                        # Convert timestamp string to seconds
                        if ':' in end_time:
                            parts = end_time.split(':')
                            if len(parts) == 3:  # HH:MM:SS.MS format
                                hours, minutes, seconds = parts
                                total_seconds = float(hours) * 3600 + float(minutes) * 60 + float(seconds)
                            elif len(parts) == 2:  # MM:SS.MS format
                                minutes, seconds = parts
                                total_seconds = float(minutes) * 60 + float(seconds)
                            else:
                                continue
                        else:
                            total_seconds = float(end_time)
                        
                        max_end_time = max(max_end_time, total_seconds)
            
            # Convert seconds to minutes and round up
            duration_minutes = int((max_end_time / 60) + 0.5)  # Round up
            return duration_minutes if duration_minutes > 0 else None
            
        except Exception as e:
            logger.warning(f"Error calculating duration from transcript: {e}")
            return None
    
    def _prepare_transcript_text(self, transcript: List[Dict[str, Any]]) -> str:
        """Convert transcript segments to readable text"""
        if not transcript:
            return ""
        
        text_parts = []
        for segment in transcript:
            if isinstance(segment, dict):
                if 'text' in segment:
                    text_parts.append(segment['text'])
                elif 'transcript' in segment:
                    text_parts.append(segment['transcript'])
                elif 'content' in segment:
                    text_parts.append(segment['content'])
            elif isinstance(segment, str):
                text_parts.append(segment)
        
        return " ".join(text_parts)
    
    def _create_analytics_prompt(self, transcript_text: str, meeting_title: str, participants: Optional[List[str]], duration_minutes: Optional[int]) -> str:
        """Create comprehensive prompt for Gemini to extract analytics"""
        
        # Build context information
        context_parts = [f"Meeting Title: {meeting_title}"]
        if participants:
            context_parts.append(f"Participants: {', '.join(participants)}")
        if duration_minutes:
            context_parts.append(f"Duration: {duration_minutes} minutes")
        
        context_info = "\n".join(context_parts)
        
        return f"""
You are an expert meeting analyst. Analyze the following meeting transcript and extract comprehensive analytics in the exact JSON format specified below.

Meeting Context:
{context_info}

Meeting Transcript:
{transcript_text}

Please analyze this meeting and provide analytics in the following JSON format. For numerical scores, use a 0-10 scale where 10 is excellent and 0 is poor. For percentages, use 0-100. For counts, provide actual numbers. For boolean values, use true/false.

{{
  "technical_audio_visual_quality": {{
    "audio_clarity": 0-10,
    "video_quality": 0-10,
    "connectivity_stability": 0-10,
    "latency_delay": 0-10,
    "mute_unmute_usage": 0-10,
    "screen_sharing_quality": 0-10
  }},
  "participation_engagement": {{
    "attendance": {{
      "total_participants": number,
      "on_time": number,
      "late": number,
      "avg_duration_minutes": number
    }},
    "active_participation": 0-10,
    "engagement_level": 0-10,
    "speaking_distribution": 0-10,
    "listening_quality": 0-10,
    "participation_balance": 0-10,
    "chat_contributions": number,
    "poll_responses": number
  }},
  "meeting_effectiveness": {{
    "agenda_coverage": 0-100,
    "time_management": 0-10,
    "action_items_defined": number,
    "decision_making_efficiency": 0-100,
    "discussion_relevance": 0-100
  }},
  "collaboration_communication": {{
    "clarity_of_communication": 0-10,
    "inclusiveness": 0-10,
    "team_collaboration": 0-10,
    "conflict_handling": 0-10,
    "cross_department_interactions": 0-10
  }},
  "behavioral_professional_aspects": {{
    "professional_etiquette": 0-10,
    "camera_discipline": 0-10,
    "non_verbal_cues": 0-10,
    "respectful_communication": 0-10,
    "follow_up_ownership": 0-10
  }},
  "security_compliance": {{
    "meeting_access_control": true/false,
    "confidentiality_maintained": true/false,
    "recording_compliance": true/false,
    "data_sharing_policies": true/false
  }},
  "post_meeting_outcomes": {{
    "meeting_minutes_shared": true/false,
    "action_items_tracked": true/false,
    "feedback_collection": number,
    "meeting_roi": 0-10
  }},
  "meeting_sentiment": {{
    "sentiment": "positive|negative|neutral",
    "sentiment_score": 0-10
  }},
  "audio_insights": {{
    "key_moments": ["list", "of", "notable", "moments"],
    "notable_silences_count": number,
    "energy_shifts_count": number,
    "notable_patterns": ["list", "of", "speech", "patterns"]
  }}
}}

Analysis Guidelines:
1. Technical Quality: Assess audio/video quality, connectivity issues, and technical problems mentioned
2. Participation: Count participants, assess engagement, speaking patterns, and interaction quality
3. Effectiveness: Evaluate agenda adherence, time management, decision-making, and action items
4. Collaboration: Analyze communication clarity, inclusiveness, teamwork, and conflict resolution
5. Professional Behavior: Assess etiquette, camera usage, respect, and follow-through
6. Security: Check for access controls, confidentiality, recording policies, and data sharing
7. Outcomes: Evaluate meeting minutes, action tracking, feedback, and overall ROI
8. Sentiment Analysis: Analyze the overall emotional tone and sentiment of the meeting. Consider:
   - Positive indicators: enthusiasm, agreement, appreciation, constructive feedback, successful resolutions, collaborative spirit, optimism
   - Negative indicators: frustration, disagreement, complaints, conflicts, unresolved issues, tension, pessimism
   - Neutral indicators: factual discussions, routine updates, standard procedures, balanced exchanges
   - Score interpretation: 7-10 = positive, 4-6 = neutral, 0-3 = negative
   - The sentiment label should match the score: positive (7-10), neutral (4-6), negative (0-3)
9. Audio Insights: Identify key moments, notable silences, energy shifts, and notable speech patterns (e.g., filler words, articulation, rhetorical questions)

Provide only the JSON response, no additional text or explanations.
"""
    
    def _parse_gemini_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the JSON response from Gemini"""
        try:
            response_text = response_text.strip()
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
            
            json_text = response_text[start_idx:end_idx]
            return json.loads(json_text)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Gemini response: {e}")
            logger.error(f"Response text: {response_text}")
            raise ValueError(f"Invalid JSON response from Gemini: {e}")
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            raise ValueError(f"Failed to parse Gemini response: {e}")

# Global instance - ready to use
try:
    flat_analytics = FlatMeetingAnalytics()
except Exception as e:
    logger.warning(f"Flat Meeting Analytics not available: {e}")
    flat_analytics = None