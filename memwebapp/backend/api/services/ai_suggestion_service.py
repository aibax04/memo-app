import os
import logging
import tempfile
import time
from typing import Optional, Dict, List
import google.generativeai as genai
from pydub import AudioSegment
from config.settings import settings
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.template_service import get_templates
import json

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True  # Override any existing configuration
)
logger = logging.getLogger(__name__)

class AISuggestionService:
    def __init__(self):
        """Initialize AI suggestion service with Gemini"""
        self.genai_client = None
        self.MODEL_ID = "gemini-2.0-flash"
        self.MAX_RETRIES = 3  # Maximum retry attempts
        self.RETRY_DELAY = 2  # Seconds to wait between retries
        
        if settings.GEMINI_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_KEY)
                self.genai_client = genai.GenerativeModel(self.MODEL_ID)
                logger.info("AI Suggestion Service initialized with Gemini")
            except Exception as e:
                logger.error(f"Could not initialize Gemini client: {e}")
                raise Exception("Gemini API initialization failed. Please check API key and configuration.")
        else:
            logger.error("GEMINI_KEY not found in settings.")
            raise Exception("Gemini API key not configured. AI suggestions cannot work.")
    
    def _extract_audio_sample(self, audio_path: str, duration_seconds: int = 60) -> str:
        """
        Extract a sample from the beginning of the audio file for analysis.
        Only processes the first N seconds to avoid processing long audio files.
        Returns path to the temporary sample file.
        """
        try:
            # Load the audio file
            audio = AudioSegment.from_file(audio_path)
            
            # Extract first N seconds (or entire audio if shorter)
            # This ensures we never process more than the specified duration
            sample_duration_ms = min(duration_seconds * 1000, len(audio))
            audio_sample = audio[:sample_duration_ms]
            
            # Create a proper temporary file with .wav extension
            temp_file = tempfile.NamedTemporaryFile(
                delete=False,
                suffix='.wav',
                prefix='audio_sample_'
            )
            sample_path = temp_file.name
            temp_file.close()
            
            # Export sample to temporary file
            audio_sample.export(sample_path, format="wav")
            
            actual_duration = sample_duration_ms / 1000
            total_duration = len(audio) / 1000
            logger.info(
                f"Extracted {actual_duration:.1f}s audio sample "
                f"(from {total_duration:.1f}s total) to {sample_path}"
            )
            return sample_path
        except Exception as e:
            logger.error(f"Error extracting audio sample: {e}")
            # Return original path if extraction fails (fallback)
            return audio_path
    
    def suggest_meeting_title(self, audio_path: str) -> Optional[str]:
        """
        Analyze audio and suggest a meeting title with retry logic.
        Only processes the first 30 seconds of audio for efficiency.
        """
        if not self.genai_client:
            error_msg = "Gemini client not initialized. Cannot generate suggestions."
            logger.error(error_msg)
            raise Exception(error_msg)
        
        sample_path = None
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                logger.info(f"🔄 Attempt {attempt + 1}/{self.MAX_RETRIES}: Generating meeting title for: {audio_path}")
                
                # Extract only first 30 seconds of audio for faster processing
                if sample_path is None:  # Only extract once
                    sample_path = self._extract_audio_sample(audio_path, duration_seconds=30)
                
                if not os.path.exists(sample_path):
                    raise FileNotFoundError(f"Audio sample file not found: {sample_path}")
                
                # Upload audio file to Gemini with timeout handling
                logger.info(f"📤 Uploading audio sample to Gemini...")
                audio_file = genai.upload_file(sample_path)
                logger.info(f"✅ Uploaded: {audio_file.name}")
                
                # Create prompt for title suggestion
                prompt = """Listen to this audio recording and suggest a concise, professional meeting title (maximum 6-8 words).

The title should:
- Capture the main topic or purpose of the discussion
- Be clear and descriptive
- Use title case
- Be professional and business-appropriate

Return ONLY the suggested title, nothing else. No quotes, no explanations."""
                
                # Generate title with timeout
                logger.info("🤖 Requesting title from AI...")
                response = self.genai_client.generate_content(
                    [prompt, audio_file],
                    request_options={"timeout": 120}  # 2 minute timeout
                )
                
                if not response or not response.text:
                    raise Exception("AI returned empty response for title suggestion")
                
                suggested_title = response.text.strip().strip('"').strip("'")
                
                if not suggested_title or len(suggested_title) < 3:
                    raise Exception("AI returned invalid or too short title")
                
                logger.info(f"✅ Title suggested successfully: '{suggested_title}'")
                
                # Clean up sample file
                if sample_path != audio_path and os.path.exists(sample_path):
                    try:
                        os.remove(sample_path)
                    except:
                        pass
                
                return suggested_title
                
            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Attempt {attempt + 1} failed: {str(e)}")
                
                # If not last attempt, wait before retrying
                if attempt < self.MAX_RETRIES - 1:
                    wait_time = self.RETRY_DELAY * (attempt + 1)  # Exponential backoff
                    logger.info(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"❌ All {self.MAX_RETRIES} attempts failed for title suggestion")
        
        # Clean up on failure
        if sample_path and sample_path != audio_path and os.path.exists(sample_path):
            try:
                os.remove(sample_path)
            except:
                pass
        
        # Raise the last error instead of returning None
        error_msg = f"Failed to generate title after {self.MAX_RETRIES} attempts: {str(last_error)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    
    def suggest_meeting_description(self, audio_path: str) -> Optional[str]:
        """
        Analyze audio and suggest a meeting description with retry logic.
        Only processes the first 45 seconds of audio for efficiency.
        """
        if not self.genai_client:
            error_msg = "Gemini client not initialized. Cannot generate suggestions."
            logger.error(error_msg)
            raise Exception(error_msg)
        
        sample_path = None
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                logger.info(f"🔄 Attempt {attempt + 1}/{self.MAX_RETRIES}: Generating description for: {audio_path}")
                
                # Extract only first 45 seconds of audio for faster processing
                if sample_path is None:  # Only extract once
                    sample_path = self._extract_audio_sample(audio_path, duration_seconds=45)
                
                if not os.path.exists(sample_path):
                    raise FileNotFoundError(f"Audio sample file not found: {sample_path}")
                
                # Upload audio file to Gemini
                logger.info(f"📤 Uploading audio sample to Gemini...")
                audio_file = genai.upload_file(sample_path)
                logger.info(f"✅ Uploaded: {audio_file.name}")
                
                # Create prompt for description suggestion
                prompt = """Listen to this audio recording and write a brief meeting description (2-3 sentences, maximum 150 words).

The description should:
- Summarize the main purpose or topic of the meeting
- Mention key participants or roles if identifiable
- Be concise and informative
- Use professional language

Return ONLY the description, nothing else. No labels, no explanations."""
                
                # Generate description with timeout
                logger.info("🤖 Requesting description from AI...")
                response = self.genai_client.generate_content(
                    [prompt, audio_file],
                    request_options={"timeout": 120}  # 2 minute timeout
                )
                
                if not response or not response.text:
                    raise Exception("AI returned empty response for description suggestion")
                
                suggested_description = response.text.strip()
                
                if not suggested_description or len(suggested_description) < 10:
                    raise Exception("AI returned invalid or too short description")
                
                logger.info(f"✅ Description suggested successfully (length: {len(suggested_description)} chars)")
                
                # Clean up sample file
                if sample_path != audio_path and os.path.exists(sample_path):
                    try:
                        os.remove(sample_path)
                    except:
                        pass
                
                return suggested_description
                
            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Attempt {attempt + 1} failed: {str(e)}")
                
                # If not last attempt, wait before retrying
                if attempt < self.MAX_RETRIES - 1:
                    wait_time = self.RETRY_DELAY * (attempt + 1)  # Exponential backoff
                    logger.info(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"❌ All {self.MAX_RETRIES} attempts failed for description suggestion")
        
        # Clean up on failure
        if sample_path and sample_path != audio_path and os.path.exists(sample_path):
            try:
                os.remove(sample_path)
            except:
                pass
        
        # Raise the last error instead of returning None
        error_msg = f"Failed to generate description after {self.MAX_RETRIES} attempts: {str(last_error)}"
        logger.error(error_msg)
        raise Exception(error_msg)

    def suggest_template_with_db(self, audio_path: str, db: Session) -> Optional[Dict]:
        """
        Analyze audio and suggest the best matching template with retry logic.
        Uses provided DB session.
        """
        if not self.genai_client:
            error_msg = "Gemini client not initialized. Cannot generate suggestions."
            logger.error(error_msg)
            raise Exception(error_msg)
        
        try:
            # Get all available templates from database
            templates = get_templates(db, active_only=True, limit=100)
            
            if not templates:
                logger.warning("No templates found in database")
                raise Exception("No templates available for suggestion")

            return self._process_template_suggestion(audio_path, templates)
            
        except Exception as e:
            logger.error(f"Error in template suggestion: {e}")
            raise e
    
    def suggest_template(self, audio_path: str) -> Optional[Dict]:
        """
        Analyze audio and suggest the best matching template with retry logic.
        Only processes the first 60 seconds of audio for efficiency.
        Returns: {"suggested_template_id": "uuid", "suggested_template_name": "string", 
                  "confidence": "high/medium/low", "reason": "string"}
        """
        if not self.genai_client:
            error_msg = "Gemini client not initialized. Cannot generate suggestions."
            logger.error(error_msg)
            raise Exception(error_msg)
        
        sample_path = None
        last_error = None
        
        try:
            # Get all available templates from database
            db = next(get_db())
            templates = get_templates(db, active_only=True, limit=100)
            
            if not templates:
                logger.warning("No templates found in database")
                raise Exception("No templates available for suggestion")
            
            # Create a list of template names and descriptions for the prompt
            template_info = []
            for template in templates:
                info = f"- {template.title}"
                if template.description:
                    info += f": {template.description}"
                template_info.append(info)
            
            templates_text = "\n".join(template_info)
            
            for attempt in range(self.MAX_RETRIES):
                try:
                    logger.info(f"🔄 Attempt {attempt + 1}/{self.MAX_RETRIES}: Generating template suggestion for: {audio_path}")
                    
                    # Extract only first 60 seconds of audio for faster processing
                    if sample_path is None:  # Only extract once
                        sample_path = self._extract_audio_sample(audio_path, duration_seconds=60)
                    
                    if not os.path.exists(sample_path):
                        raise FileNotFoundError(f"Audio sample file not found: {sample_path}")
                    
                    # Upload audio file to Gemini
                    logger.info(f"📤 Uploading audio sample to Gemini...")
                    audio_file = genai.upload_file(sample_path)
                    logger.info(f"✅ Uploaded: {audio_file.name}")
                    
                    # Create prompt for template suggestion
                    prompt = f"""Listen to this audio recording and determine which template would be most appropriate for processing this meeting.

Available templates:
{templates_text}

Based on the content, tone, structure, and purpose of this audio:
1. Choose the MOST appropriate template from the list above
2. Assess your confidence level (high/medium/low)
3. Provide a brief reason for your choice (1-2 sentences)

Return your answer as a JSON object with this exact structure:
{{
  "template_name": "exact template name from the list",
  "confidence": "high or medium or low",
  "reason": "brief explanation"
}}

Return ONLY valid JSON, nothing else."""
                    
                    # Generate template suggestion with timeout
                    logger.info("🤖 Requesting template suggestion from AI...")
                    response = self.genai_client.generate_content(
                        [prompt, audio_file],
                        request_options={"timeout": 120}  # 2 minute timeout
                    )
                    
                    if not response or not response.text:
                        raise Exception("AI returned empty response for template suggestion")
                    
                    response_text = response.text.strip()
                    
                    # Extract JSON from response
                    if "```json" in response_text:
                        response_text = response_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in response_text:
                        response_text = response_text.split("```")[1].split("```")[0].strip()
                    
                    suggestion_data = json.loads(response_text)
                    
                    # Find the matching template by name
                    suggested_template = None
                    for template in templates:
                        if template.title.lower() == suggestion_data.get("template_name", "").lower():
                            suggested_template = template
                            break
                    
                    # If exact match not found, try partial match
                    if not suggested_template:
                        template_name_lower = suggestion_data.get("template_name", "").lower()
                        for template in templates:
                            if template_name_lower in template.title.lower() or template.title.lower() in template_name_lower:
                                suggested_template = template
                                break
                    
                    # Fallback to first template if no match found
                    if not suggested_template:
                        logger.warning(f"Could not find template '{suggestion_data.get('template_name')}', using first available template")
                        suggested_template = templates[0]
                    
                    result = {
                        "suggested_template_id": str(suggested_template.id),
                        "suggested_template_name": suggested_template.title,
                        "confidence": suggestion_data.get("confidence", "medium"),
                        "reason": suggestion_data.get("reason", "This template best matches the content and structure of your meeting.")
                    }
                    
                    logger.info(f"✅ Template suggestion successful: {result}")
                    
                    # Clean up sample file
                    if sample_path != audio_path and os.path.exists(sample_path):
                        try:
                            os.remove(sample_path)
                        except:
                            pass
                    
                    return result
                    
                except Exception as e:
                    last_error = e
                    logger.warning(f"⚠️ Attempt {attempt + 1} failed: {str(e)}")
                    
                    # If not last attempt, wait before retrying
                    if attempt < self.MAX_RETRIES - 1:
                        wait_time = self.RETRY_DELAY * (attempt + 1)  # Exponential backoff
                        logger.info(f"⏳ Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"❌ All {self.MAX_RETRIES} attempts failed for template suggestion")
            
            # If all retries failed, try fallback
            logger.warning("Attempting fallback: returning first available template")
            if templates:
                return {
                    "suggested_template_id": str(templates[0].id),
                    "suggested_template_name": templates[0].title,
                    "confidence": "low",
                    "reason": "Unable to analyze audio, using default template."
                }
            
        except Exception as e:
            logger.error(f"Error in template suggestion: {e}")
            last_error = e
        finally:
            # Clean up on failure
            if sample_path and sample_path != audio_path and os.path.exists(sample_path):
                try:
                    os.remove(sample_path)
                except:
                    pass
        
        # Raise the last error
        error_msg = f"Failed to generate template suggestion after {self.MAX_RETRIES} attempts: {str(last_error)}"
        logger.error(error_msg)
        raise Exception(error_msg)

# Create singleton instance
ai_suggestion_service = AISuggestionService()
