"""
Mobile Audio Analytics - Audio and Voice-Focused Analytics
Specialized analytics for mobile app recordings focusing on audio/voice characteristics
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

class MobileAudioAnalytics:
    def __init__(self):
        """Initialize the mobile audio analytics extractor with Gemini configuration"""
        if not settings.GEMINI_KEY:
            raise ValueError("GEMINI_KEY is required for analytics extraction")
        
        genai.configure(api_key=settings.GEMINI_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Mobile Audio Analytics initialized with Gemini 2.0 Flash")
    
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
        Extract audio/voice-focused analytics for mobile app recordings
        
        Args:
            meeting_id: ID of the meeting
            user_email: Email of the user who owns the meeting
            meeting_title: Title of the meeting
            meeting_date: Date when the meeting occurred (ISO format string)
            transcript: List of transcript segments
            participants: List of participant names (optional)
            duration_minutes: Meeting duration in minutes (optional)
        
        Returns:
            Single flat JSON object with audio/voice-focused analytics fields
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Extracting mobile audio analytics for meeting {meeting_id}: {meeting_title}")
            
            # Extract participants and duration from transcript if not provided
            if not participants:
                participants = self._extract_participants_from_transcript(transcript)
            if not duration_minutes:
                duration_minutes = self._calculate_duration_from_transcript(transcript)
            
            logger.info(f"Extracted {len(participants)} participants and {duration_minutes} minutes duration from transcript")
            
            # Prepare transcript text
            transcript_text = self._prepare_transcript_text(transcript)
            logger.info(f"Prepared transcript with {len(transcript)} segments")
            
            # Create prompt for Gemini focused on audio/voice characteristics
            prompt = self._create_audio_analytics_prompt(transcript_text, meeting_title, participants, duration_minutes)
            
            # Extract analytics using Gemini
            logger.info("Sending request to Gemini for mobile audio analytics extraction...")
            response = self.model.generate_content(prompt)
            
            if not response.text:
                raise ValueError("No response generated from Gemini")
            
            # Log raw response for debugging (first 500 chars)
            logger.info(f"Raw Gemini response (first 500 chars): {response.text[:500]}...")
            
            # Parse JSON response
            analytics_data = self._parse_gemini_response(response.text)
            
            # Log what keys we got from Gemini
            logger.info(f"Keys in parsed analytics_data: {list(analytics_data.keys())}")
            
            # Calculate processing duration
            processing_duration = (datetime.now() - start_time).total_seconds()
            
            # Extract sentiment values with safe fallbacks
            sentiment_value = "neutral"
            sentiment_score_value = 5.0
            
            try:
                if "sentiment_analysis" in analytics_data:
                    sentiment_data = analytics_data["sentiment_analysis"]
                    sentiment_value = sentiment_data.get("overall_sentiment", "neutral")
                    sentiment_score_value = sentiment_data.get("sentiment_score", 5.0)
                    logger.info(f"✅ Extracted sentiment from Gemini: {sentiment_value} (score: {sentiment_score_value})")
                else:
                    logger.warning("⚠️ sentiment_analysis not found in Gemini response - using defaults (neutral, 5.0)")
            except Exception as e:
                logger.error(f"❌ Error extracting sentiment data: {e}")
            
            # Create single flat JSON object with audio/voice-focused analytics
            flat_analytics = {
                # Meeting identification
                "meeting_id": str(meeting_id),
                "user_email": user_email,
                "meeting_title": meeting_title,
                "meeting_date": meeting_date,
                
                # Audio Quality Metrics (5 fields)
                "audio_clarity": analytics_data.get("audio_quality", {}).get("clarity_score", 7.0),
                "background_noise_level": analytics_data.get("audio_quality", {}).get("background_noise_level", 5.0),
                "audio_consistency": analytics_data.get("audio_quality", {}).get("consistency_score", 7.0),
                "volume_stability": analytics_data.get("audio_quality", {}).get("volume_stability", 7.0),
                "speech_intelligibility": analytics_data.get("audio_quality", {}).get("speech_intelligibility", 7.0),
                
                # Voice Characteristics (6 fields)
                "speaking_pace": analytics_data.get("voice_characteristics", {}).get("average_speaking_pace", 5.0),
                "pauses_and_silences": analytics_data.get("voice_characteristics", {}).get("pause_frequency", 5.0),
                "voice_energy_level": analytics_data.get("voice_characteristics", {}).get("energy_level", 5.0),
                "articulation_quality": analytics_data.get("voice_characteristics", {}).get("articulation_quality", 7.0),
                "vocal_clarity": analytics_data.get("voice_characteristics", {}).get("vocal_clarity", 7.0),
                "speaking_rate_variation": analytics_data.get("voice_characteristics", {}).get("rate_variation", 5.0),
                
                # Communication Patterns (7 fields)
                "filler_words_count": analytics_data.get("communication_patterns", {}).get("filler_words_count", 0),
                "filler_words_frequency": analytics_data.get("communication_patterns", {}).get("filler_words_frequency", 5.0),
                "interruptions_count": analytics_data.get("communication_patterns", {}).get("interruptions_count", 0),
                "turn_taking_quality": analytics_data.get("communication_patterns", {}).get("turn_taking_quality", 7.0),
                "overlapping_speech": analytics_data.get("communication_patterns", {}).get("overlapping_speech_frequency", 5.0),
                "question_frequency": analytics_data.get("communication_patterns", {}).get("question_count", 0),
                "response_time_average": analytics_data.get("communication_patterns", {}).get("average_response_time", 5.0),
                
                # Sentiment & Emotion Analysis (5 fields)
                "sentiment": sentiment_value,
                "sentiment_score": sentiment_score_value,
                "emotional_tone": analytics_data.get("sentiment_analysis", {}).get("emotional_tone", "neutral"),
                "tension_level": analytics_data.get("sentiment_analysis", {}).get("tension_level", 5.0),
                "enthusiasm_level": analytics_data.get("sentiment_analysis", {}).get("enthusiasm_level", 5.0),
                
                # Conflicts & Disagreements (5 fields)
                "conflicts_detected": analytics_data.get("conflict_analysis", {}).get("conflicts_detected", 0),
                "disagreement_frequency": analytics_data.get("conflict_analysis", {}).get("disagreement_frequency", 5.0),
                "conflict_resolution_quality": analytics_data.get("conflict_analysis", {}).get("resolution_quality", 7.0),
                "constructive_discussion_score": analytics_data.get("conflict_analysis", {}).get("constructive_score", 7.0),
                "tension_indicators": analytics_data.get("conflict_analysis", {}).get("tension_indicators", []),
                
                # Engagement & Participation (6 fields)
                "total_participants": len(participants) if participants else analytics_data.get("participation", {}).get("total_participants", 1),
                "active_participation": analytics_data.get("participation", {}).get("active_participation_score", 7.0),
                "engagement_level": analytics_data.get("participation", {}).get("engagement_level_score", 7.0),
                "speaking_distribution": analytics_data.get("participation", {}).get("speaking_distribution_score", 7.0),
                "listening_quality": analytics_data.get("participation", {}).get("listening_quality_score", 7.0),
                "participation_balance": analytics_data.get("participation", {}).get("participation_balance", 7.0),
                "silent_participants": analytics_data.get("participation", {}).get("silent_participants_count", 0),
                
                # Meeting Effectiveness (5 fields)
                "agenda_coverage": analytics_data.get("effectiveness", {}).get("agenda_coverage", 70.0),
                "time_management": analytics_data.get("effectiveness", {}).get("time_management_score", 7.0),
                "action_items_defined": analytics_data.get("effectiveness", {}).get("action_items_count", 0),
                "decision_making_efficiency": analytics_data.get("effectiveness", {}).get("decision_making_score", 7.0),
                "discussion_relevance": analytics_data.get("effectiveness", {}).get("relevance_score", 7.0),
                
                # Communication Quality (5 fields)
                "clarity_of_communication": analytics_data.get("communication_quality", {}).get("clarity_score", 7.0),
                "professionalism": analytics_data.get("communication_quality", {}).get("professionalism_score", 7.0),
                "respectful_communication": analytics_data.get("communication_quality", {}).get("respect_score", 7.0),
                "active_listening": analytics_data.get("communication_quality", {}).get("active_listening_score", 7.0),
                "conversation_flow": analytics_data.get("communication_quality", {}).get("conversation_flow_score", 7.0),
                
                # Additional Audio Insights (4 fields)
                "key_moments": analytics_data.get("audio_insights", {}).get("key_moments", []),
                "notable_silences": analytics_data.get("audio_insights", {}).get("notable_silences_count", 0),
                "energy_shifts": analytics_data.get("audio_insights", {}).get("energy_shifts_count", 0),
                "speech_patterns": analytics_data.get("audio_insights", {}).get("notable_patterns", []),
                
                # Metadata
                "extraction_timestamp": datetime.now().isoformat(),
                "transcript_length": len(transcript),
                "processing_duration_seconds": processing_duration,
                "model_used": "gemini-2.0-flash",
                "analytics_type": "mobile_audio",
                "participants": participants or [],
                "duration_minutes": duration_minutes if duration_minutes is not None else 0.0,
                "transcriptions": transcript  # Include full transcription data
            }
            
            logger.info(f"Successfully extracted mobile audio analytics for meeting {meeting_id} in {processing_duration:.2f} seconds")
            logger.info(f"Final sentiment: {flat_analytics.get('sentiment')} (score: {flat_analytics.get('sentiment_score')})")
            
            return flat_analytics
            
        except Exception as e:
            logger.error(f"Error extracting mobile audio analytics for meeting {meeting_id}: {str(e)}")
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
            max_end_time = 0
            for segment in transcript:
                if isinstance(segment, dict) and 'end' in segment:
                    end_time = segment['end']
                    if isinstance(end_time, (int, float)):
                        max_end_time = max(max_end_time, end_time)
                    elif isinstance(end_time, str):
                        if ':' in end_time:
                            parts = end_time.split(':')
                            if len(parts) == 3:
                                hours, minutes, seconds = parts
                                total_seconds = float(hours) * 3600 + float(minutes) * 60 + float(seconds)
                            elif len(parts) == 2:
                                minutes, seconds = parts
                                total_seconds = float(minutes) * 60 + float(seconds)
                            else:
                                continue
                        else:
                            total_seconds = float(end_time)
                        max_end_time = max(max_end_time, total_seconds)
            
            duration_minutes = int((max_end_time / 60) + 0.5)
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
    
    def _create_audio_analytics_prompt(self, transcript_text: str, meeting_title: str, participants: Optional[List[str]], duration_minutes: Optional[int]) -> str:
        """Create comprehensive prompt for Gemini to extract audio/voice-focused analytics"""
        
        context_parts = [f"Meeting Title: {meeting_title}"]
        if participants:
            context_parts.append(f"Participants: {', '.join(participants)}")
        if duration_minutes:
            context_parts.append(f"Duration: {duration_minutes} minutes")
        
        context_info = "\n".join(context_parts)
        
        return f"""
You are an expert audio and voice analyst specializing in analyzing meeting recordings from mobile devices. Analyze the following meeting transcript and extract comprehensive audio/voice-focused analytics in the exact JSON format specified below.

Meeting Context:
{context_info}

Meeting Transcript:
{transcript_text}

Please analyze this audio recording and provide analytics focused on audio characteristics, voice patterns, speech quality, and communication dynamics. For numerical scores, use a 0-10 scale where 10 is excellent and 0 is poor. For percentages, use 0-100. For counts, provide actual numbers.

{{
  "audio_quality": {{
    "clarity_score": 0-10,
    "background_noise_level": 0-10,
    "consistency_score": 0-10,
    "volume_stability": 0-10,
    "speech_intelligibility": 0-10
  }},
  "voice_characteristics": {{
    "average_speaking_pace": 0-10,
    "pause_frequency": 0-10,
    "energy_level": 0-10,
    "articulation_quality": 0-10,
    "vocal_clarity": 0-10,
    "rate_variation": 0-10
  }},
  "communication_patterns": {{
    "filler_words_count": number,
    "filler_words_frequency": 0-10,
    "interruptions_count": number,
    "turn_taking_quality": 0-10,
    "overlapping_speech_frequency": 0-10,
    "question_count": number,
    "average_response_time": 0-10
  }},
  "sentiment_analysis": {{
    "overall_sentiment": "positive|negative|neutral",
    "sentiment_score": 0-10,
    "emotional_tone": "positive|neutral|negative|mixed",
    "tension_level": 0-10,
    "enthusiasm_level": 0-10
  }},
  "conflict_analysis": {{
    "conflicts_detected": number,
    "disagreement_frequency": 0-10,
    "resolution_quality": 0-10,
    "constructive_score": 0-10,
    "tension_indicators": ["list", "of", "specific", "indicators"]
  }},
  "participation": {{
    "total_participants": number,
    "active_participation_score": 0-10,
    "engagement_level_score": 0-10,
    "speaking_distribution_score": 0-10,
    "listening_quality_score": 0-10,
    "participation_balance": 0-10,
    "silent_participants_count": number
  }},
  "effectiveness": {{
    "agenda_coverage": 0-100,
    "time_management_score": 0-10,
    "action_items_count": number,
    "decision_making_score": 0-10,
    "relevance_score": 0-10
  }},
  "communication_quality": {{
    "clarity_score": 0-10,
    "professionalism_score": 0-10,
    "respect_score": 0-10,
    "active_listening_score": 0-10,
    "conversation_flow_score": 0-10
  }},
  "audio_insights": {{
    "key_moments": ["list", "of", "notable", "moments"],
    "notable_silences_count": number,
    "energy_shifts_count": number,
    "notable_patterns": ["list", "of", "speech", "patterns"]
  }}
}}

Analysis Guidelines:
1. Audio Quality: Assess clarity, background noise, consistency, volume stability, and speech intelligibility based on the transcript quality and speaking patterns
2. Voice Characteristics: Analyze speaking pace, pauses, energy levels, articulation, vocal clarity, and variations in speaking rate
3. Communication Patterns: Count filler words (um, uh, like, you know), interruptions, assess turn-taking quality, overlapping speech, question frequency, and response times
4. Sentiment & Emotion: Analyze overall sentiment (positive/negative/neutral), emotional tone, tension levels, and enthusiasm. Score 7-10 = positive, 4-6 = neutral, 0-3 = negative
5. Conflicts & Disagreements: Detect conflicts, measure disagreement frequency, assess resolution quality, constructive discussion score, and identify tension indicators
6. Participation: Analyze speaking distribution, active engagement, listening quality, participation balance, and silent participants
7. Effectiveness: Evaluate agenda coverage, time management, action items, decision-making, and discussion relevance
8. Communication Quality: Assess clarity, professionalism, respect, active listening, and conversation flow
9. Audio Insights: Identify key moments, notable silences, energy shifts, and notable speech patterns

Filler Words to Detect: "um", "uh", "like", "you know", "so", "well", "actually", "basically", "literally", "I mean"

Conflict Indicators: Disagreement phrases, raised concerns, contrasting opinions, defensive responses, argumentative language

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
mobile_audio_analytics = MobileAudioAnalytics()

