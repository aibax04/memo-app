import os
from pydub import AudioSegment
import re
from typing import Optional, List
import logging
import google.generativeai as genai
import time
import random
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.generativeai import types
from config.settings import settings
import json
from sqlalchemy.orm import Session
from database.connection import get_db
from api.services.template_service import get_template, get_template_by_title
import glob
import shutil

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True  # Override any existing configuration
)
logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self):
        """Initialize the audio processor with necessary models and configurations"""
        
        # Initialize Gemini client for transcription
        self.genai_client = None
        self.MODEL_ID = "gemini-2.0-flash"
        
        # Retry configuration
        self.max_retries = int(os.getenv("AUDIO_MAX_RETRIES", "3"))
        self.base_delay = float(os.getenv("AUDIO_BASE_DELAY", "2.0"))
        self.max_delay = float(os.getenv("AUDIO_MAX_DELAY", "60.0"))
        
        if settings.GEMINI_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_KEY)
                self.genai_client = genai.GenerativeModel(self.MODEL_ID)
                logger.info("Google Generative AI client initialized")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini client: {e}")
        else:
            logger.warning("GEMINI_KEY not found. Audio processing will not work.")
    
    def _get_transcription_prompt(self, template_id: str = None) -> str:
        """Get template-specific transcription prompt from database"""
        try:
            # Get database session
            db = next(get_db())
            template = None
            try:
            
            # Try to get template by UUID first, then by title for backward compatibility
            if template_id:
                try:
                    from uuid import UUID
                    uuid_template_id = UUID(template_id)
                    template = get_template(db, uuid_template_id)
                except ValueError:
                    # If not a valid UUID, treat as title
                    template = get_template_by_title(db, template_id)
            
            # If no template specified, use default
            if not template:
                template = get_template_by_title(db, "General Audio Recording")
            
            if template:
                # Build the prompt from template fields
                prompt = template.transcription_prompt if template.transcription_prompt else ""
                
                # Add speaker diarization instructions if available
                if template.speaker_diarization:
                    prompt += f"\n\n{template.speaker_diarization}"
                
                if prompt:
                    return prompt
            
            # Ultimate fallback if no template found
            return """**IMPORTANT: Transcribe this meeting audio in the original language spoken.**

**IMPORTANT: Transcribe this meeting audio.**

Transcribe this audio recording.
Ensure to caption all the words in the audio (Do not ignore any words).
Ensure proper punctuation of the sentences.
Break the sentence when the speaker changes or there's a pause.
If nothing is spoken at certain time intervals then ignore those time intervals.
Make sure to pass all the keys populated.

**SPEAKER DIARIZATION & RECOGNITION (CRITICAL):**
- This is a meeting recording. There are multiple speakers.
- You must distinguish between all speakers accurately.
- Use generic labels like "Speaker 1", "Speaker 2", etc., IF you cannot identify them.
- **IMPORTANT**: Listen carefully for when speakers introduce themselves (e.g., "Hi, I'm John", "My name is Sarah"). 
- If a speaker's name is identified, use that name (e.g., "John", "Sarah") for all their segments.
- Look for clues in how people address each other (e.g., "John, what do you think?").
- If roles are mentioned ("the manager", "the doctor"), use those as speaker labels if names are missing.
- Be consistent: once a speaker is identified as "John", do not switch back to "Speaker 1".

Please ignore conversion of nouns.
Ignore the background music but catch the words.

Return the output strictly as a JSON array of objects using the below format:
```json
[
  {
    "start": "HH:MM:SS.MS",
    "end": "HH:MM:SS.MS",
    "text": "Transcription text in the original language spoken",
    "speaker": "actual_name_or_role_or_Speaker 1"
  }
]
```
Only return the pure JSON array inside triple backticks and nothing else."""
        except Exception as e:
            logger.error(f"Error getting transcription prompt from database: {e}")
            # Fallback to hardcoded default
            return """**IMPORTANT: Transcribe this audio in the original language spoken.**

**IMPORTANT: Transcribe this mobile mic audio.**

Transcribe this audio recording.
Ensure to caption all the words in the audio (Do not ignore any words).
Ensure proper punctuation of the sentences.
Break the sentence when the speaker changes or there's a pause.
If nothing is spoken at certain time intervals then ignore those time intervals.
Make sure to pass all the keys populated.

**SPEAKER IDENTIFICATION:**
- Listen carefully for when speakers introduce themselves or mention their names
- If a speaker says "Hi, I'm John" or "My name is Sarah", use "John" or "Sarah" as the speaker name
- If speakers mention their roles like "I'm the manager" or "I'm the customer", use those roles
- If you can identify distinct voices but no names are mentioned, use "Speaker1", "Speaker2", etc.
- Pay attention to how speakers refer to each other in conversation
- Use the most specific identifier available (actual name > role > generic speaker)

Please ignore conversion of nouns.
Ignore the background music but catch the words.

Return the output strictly as a JSON array of objects using the below format:
```json
[
  {
    "start": "HH:MM:SS.MS",
    "end": "HH:MM:SS.MS",
    "text": "Transcription text in the original language spoken",
    "speaker": "actual_name_or_role_or_speaker1"
  }
]
```
Only return the pure JSON array inside triple backticks and nothing else."""
        finally:
            db.close()
    
    def _get_summary_prompt(self, template_id: str = None) -> str:
        """Get template-specific summary prompt from database"""
        try:
            # Get database session
            db = next(get_db())
            template = None
            
            # Try to get template by UUID first, then by title for backward compatibility
            if template_id:
                try:
                    from uuid import UUID
                    uuid_template_id = UUID(template_id)
                    template = get_template(db, uuid_template_id)
                except ValueError:
                    # If not a valid UUID, treat as title
                    template = get_template_by_title(db, template_id)
            
            if template and template.summary_prompt:
                return template.summary_prompt
            else:
                # Fallback to default template
                default_template = get_template_by_title(db, "General Audio Recording")
                if default_template and default_template.summary_prompt:
                    return default_template.summary_prompt
                else:
                    # Ultimate fallback
                    return "This is the transcription of an audio recording. Please generate a concise summary covering the main topics discussed, key decisions made, important points raised, action items or next steps, and overall outcomes. Write it as a flowing paragraph without headings or bullet points."
        except Exception as e:
            logger.error(f"Error getting summary prompt from database: {e}")
            # Fallback to hardcoded default
            return "This is the transcription of an audio recording. Please generate a concise summary covering the main topics discussed, key decisions made, important points raised, action items or next steps, and overall outcomes. Write it as a flowing paragraph without headings or bullet points."
    
    def _extract_speaker_names_from_transcription(self, transcription: List[dict]) -> dict:
        """
        Extract and map speaker names from transcription content.
        Analyzes the conversation to identify when speakers introduce themselves
        or are referred to by name.
        
        Args:
            transcription: List of transcription segments
            
        Returns:
            Dictionary mapping generic speaker IDs to actual names
        """
        speaker_mapping = {}
        name_patterns = [
            # English patterns
            r"hi,?\s*i'?m\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.|\s+speaking)",  # "Hi, I'm John"
            r"hello,?\s*i'?m\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.|\s+speaking)",  # "Hello, I'm John"
            r"my\s+name\s+is\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.|\s+speaking)",  # "My name is Sarah"
            r"i'?m\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.|\s+speaking)",  # "I'm John"
            r"this\s+is\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.|\s+speaking)",  # "This is John"
            r"([a-zA-Z]+)\s+here", # "John here"
            r"([a-zA-Z]+)\s+speaking", # "John speaking"
            r"speaking\s+is\s+([a-zA-Z]+)", # "Speaking is John"
            r"call\s+me\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "Call me John"
            # Hindi/Hinglish patterns
            r"mera\s+naam\s+([a-zA-Z]+)\s+hai",  # "Mera naam Suryanshu hai"
            r"mera\s+naam\s+hai\s+([a-zA-Z]+)",  # "Mera naam hai Suryanshu"
            r"main\s+([a-zA-Z]+)\s+hoon",  # "Main Suryanshu hoon"
            r"mai\s+([a-zA-Z]+)\s+hun",  # "Mai Suryanshu hun"
            r"naam\s+([a-zA-Z]+)\s+hai",  # "Naam Suryanshu hai"
        ]
        
        # Track speaker mentions and introductions
        speaker_introductions = {}
        speaker_references = {}
        
        for segment in transcription:
            if not isinstance(segment, dict) or 'text' not in segment or 'speaker' not in segment:
                continue
                
            text = segment['text'].lower()
            speaker = segment['speaker']
            
            logger.debug(f"🔍 Checking segment: speaker={speaker}, text={text}")
            
            # Look for name introductions
            for pattern in name_patterns:
                matches = re.findall(pattern, text)
                for name in matches:
                    if name and len(name) > 1:  # Valid name
                        speaker_introductions[speaker] = name.capitalize()
                        logger.info(f"✅ Found name: {speaker} -> {name.capitalize()} from text: {text}")
                        break
            
            # Look for references to other speakers by name
            # Pattern: "John said" or "as Sarah mentioned"
            reference_patterns = [
                r"([a-zA-Z]+)\s+said",
                r"([a-zA-Z]+)\s+mentioned",
                r"([a-zA-Z]+)\s+asked",
                r"([a-zA-Z]+)\s+replied",
                r"as\s+([a-zA-Z]+)\s+said",
                r"according\s+to\s+([a-zA-Z]+)",
            ]
            
            for pattern in reference_patterns:
                matches = re.findall(pattern, text)
                for name in matches:
                    if name and len(name) > 1:  # Valid name
                        speaker_references[name.capitalize()] = speaker
        
        # Build final mapping
        # First, use direct introductions
        for speaker, name in speaker_introductions.items():
            speaker_mapping[speaker] = name
        
        # Then, try to map referenced names to other speakers
        for name, referenced_speaker in speaker_references.items():
            if referenced_speaker not in speaker_mapping:
                speaker_mapping[referenced_speaker] = name
        
        return speaker_mapping
    
    def _apply_speaker_name_mapping(self, transcription: List[dict], speaker_mapping: dict) -> List[dict]:
        """
        Apply speaker name mapping to transcription segments.
        
        Args:
            transcription: List of transcription segments
            speaker_mapping: Dictionary mapping generic speaker IDs to actual names
            
        Returns:
            Updated transcription with actual speaker names
        """
        if not speaker_mapping:
            return transcription
        
        updated_transcription = []
        for segment in transcription:
            if not isinstance(segment, dict):
                updated_transcription.append(segment)
                continue
                
            updated_segment = segment.copy()
            speaker = segment.get('speaker', '')
            
            # Apply mapping if available
            if speaker in speaker_mapping:
                updated_segment['speaker'] = speaker_mapping[speaker]
            
            updated_transcription.append(updated_segment)
        
        return updated_transcription

    def _get_key_points_prompt(self, template_id: str = None) -> List[str]:
        """Get template-specific key points prompt from database"""
        try:
            # Get database session
            db = next(get_db())
            template = None
            
            # Try to get template by UUID first, then by title for backward compatibility
            if template_id:
                try:
                    from uuid import UUID
                    uuid_template_id = UUID(template_id)
                    template = get_template(db, uuid_template_id)
                except ValueError:
                    # If not a valid UUID, treat as title
                    template = get_template_by_title(db, template_id)
            
            if template and template.key_points_prompt:
                return template.key_points_prompt
            else:
                # Fallback to default template
                default_template = get_template_by_title(db, "General Audio Recording")
                if default_template and default_template.key_points_prompt:
                    return default_template.key_points_prompt
                else:
                    # Ultimate fallback
                    return [
                        "Main topics discussed",
                        "Key decisions made", 
                        "Important points raised",
                        "Action items or next steps",
                        "Critical insights",
                        "Overall outcomes"
                    ]
        except Exception as e:
            logger.error(f"Error getting key points prompt from database: {e}")
            # Fallback to hardcoded default
            return [
                "Main topics discussed",
                "Key decisions made",
                "Important points raised", 
                "Action items or next steps",
                "Critical insights",
                "Overall outcomes"
            ]
    
    def split_audio(self, audio_path, output_dir=None):
        """
        Splits the audio file into chunks and saves them locally.
        Handles both WAV and MP3 formats.
        
        Args:
            audio_path: Path to the local audio file
            output_dir: Directory to save the chunks (default: same directory as input file)
        
        Returns:
            A dictionary mapping chunk numbers to local file paths
        """
        def _split_audio_internal():
            logger.info(f"Splitting audio file: {audio_path}")
            
            # Validate input file exists
            if not os.path.exists(audio_path):
                logger.error(f"Audio file not found: {audio_path}")
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
                    
            AUDIO_OFFSET_CHUNK = int(os.getenv("AUDIO_OFFSET_CHUNK", 300))
            logger.info(f"Using chunk offset: {AUDIO_OFFSET_CHUNK} seconds")
            
            # Convert seconds to milliseconds for pydub
            chunk_duration_ms = AUDIO_OFFSET_CHUNK * 1000
            
            # Determine file format
            file_name = os.path.basename(audio_path)
            file_extension = file_name.split(".")[-1].lower()
            supported_formats = ["wav", "mp3", "m4a", "aac", "flac", "ogg", "wma", "opus", "webm"]
            if file_extension not in supported_formats:
                logger.error(f"Unsupported audio format: {file_extension}")
                raise ValueError(f"Unsupported audio format: {file_extension}. Supported formats: {', '.join(supported_formats)}")
            
            # Set output directory - use nonlocal to access the outer scope variable
            nonlocal output_dir
            if output_dir is None:
                output_dir = os.path.dirname(audio_path)
            else:
                os.makedirs(output_dir, exist_ok=True)
            
            logger.info(f"Loading audio file: {audio_path}")
            # Load the audio file with better error handling
            try:
                audio = AudioSegment.from_file(audio_path, format=file_extension)
                if len(audio) == 0:
                    raise ValueError("Audio file appears to be empty or corrupted")
                logger.info(f"Successfully loaded audio file. Duration: {len(audio)/1000:.2f} seconds")
            except Exception as e:
                logger.error(f"Failed to load audio file {audio_path}: {e}")
                # Try loading without specifying format (let pydub auto-detect)
                try:
                    logger.info("Attempting to load with auto-detection...")
                    audio = AudioSegment.from_file(audio_path)
                    if len(audio) == 0:
                        raise ValueError("Audio file appears to be empty or corrupted")
                    logger.info(f"Successfully loaded audio file with auto-detection. Duration: {len(audio)/1000:.2f} seconds")
                except Exception as e2:
                    logger.error(f"Failed to load audio file even with auto-detection: {e2}")
                    raise ValueError(f"Unable to process audio file. It may be corrupted or in an unsupported format. Original error: {e}, Auto-detection error: {e2}")
            
            chunks = []
            total_chunks = len(audio) // chunk_duration_ms + (1 if len(audio) % chunk_duration_ms else 0)
            logger.info(f"Creating {total_chunks} chunks")
            
            for i, start_time in enumerate(range(0, len(audio), chunk_duration_ms)):
                logger.debug(f"Processing chunk {i+1}/{total_chunks}")
                # Convert 10 seconds to milliseconds for overlap
                overlap_ms = 0 * 1000
                chunk = audio[max(0, start_time - overlap_ms):start_time + chunk_duration_ms]
                
                # Save the chunk in WAV format
                base_name = os.path.splitext(file_name)[0]
                chunk_file_name = f"{base_name}_chunk{i}.wav"
                chunk_path = os.path.join(output_dir, chunk_file_name)
                chunk.export(chunk_path, format="wav")
                
                chunks.append((i, chunk_path))
            
            logger.info(f"Successfully created {len(chunks)} chunks")
            return dict(chunks)
        
        try:
            # Use retry logic for audio splitting
            return self.retry_with_backoff(
                _split_audio_internal,
                max_retries=2,
                base_delay=1.0,
                max_delay=10.0
            )
        except Exception as e:
            logger.error(f"Error splitting audio after retries: {e}")
            raise Exception(f"Failed to split audio file after retries: {str(e)}")
    
    def safe_extract_content(self, content):
        """Safely extract content from JSON response."""
        json_match = re.search(r'```json\s*(.*?)```', content, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON block found in content.")
        json_str = json_match.group(1).strip()
        if not (json_str.startswith('[') and json_str.endswith(']')):
            json_str = f"[{json_str}]"
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
        json_data = json.loads(json_str)
        return json_data[0]

    def safe_extract_json(self, content):
        """Safely extract JSON from content with validation."""
        def _extract_and_parse():
            # First try to find JSON in code blocks
            json_match = re.search(r'```json\s*(.*?)```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
            else:
                # Try to find JSON array pattern without code blocks
                json_match = re.search(r'\[\s*\{.*?\}\s*\]', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0).strip()
                else:
                    raise ValueError("No JSON block found in content.")
            
            # Clean up the JSON string
            json_str = json_str.strip()
            if not (json_str.startswith('[') and json_str.endswith(']')):
                json_str = f"[{json_str}]"
            
            # Remove only problematic control characters, preserve Unicode
            # Remove NULL bytes and other JSON-breaking characters, but keep valid text
            json_str = json_str.replace('\x00', '')  # Remove NULL bytes
            # Keep \n (0x0a), \t (0x09), \r (0x0d) - remove other control characters
            json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
            
            # Fix common JSON issues
            json_str = re.sub(r',\s*([\]}])', r'\1', json_str)  # Remove trailing commas
            json_str = re.sub(r'([,{]\s*)([}\]])', r'\1', json_str)  # Remove empty elements
            json_str = re.sub(r'}\s*{', '},{', json_str)  # Fix missing commas between objects
            
            # Try to parse the JSON
            try:
                json_data = json.loads(json_str)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parsing failed, attempting to fix: {e}")
                # Try to fix common JSON issues
                json_str = self._fix_json_string(json_str)
                json_data = json.loads(json_str)
            
            return json_data
        
        try:
            # Use retry logic for JSON extraction and parsing
            json_data = self.retry_with_backoff(
                _extract_and_parse,
                max_retries=self.max_retries,
                base_delay=1.0,
                max_delay=10.0
            )
            
            # Validate and clean the data
            if not isinstance(json_data, list):
                json_data = [json_data]
            
            cleaned_data = []
            for item in json_data:
                if not isinstance(item, dict):
                    logger.warning(f"Skipping non-dict item: {item}")
                    continue
                    
                # Check required fields
                if not all(k in item for k in ["start", "end"]):
                    logger.warning(f"Skipping item missing required fields: {item}")
                    continue
                
                # Normalize text field - preserve Unicode
                if "Text" in item and "text" not in item:
                    item["text"] = item["Text"]
                elif "text" not in item:
                    logger.warning(f"Skipping item without text field: {item}")
                    continue
                
                # Clean text field - remove only problematic characters, preserve content
                if "text" in item and item["text"]:
                    text = str(item["text"])
                    # Remove NULL bytes and control characters, but preserve Unicode text
                    text = text.replace('\x00', '')  # Remove NULL bytes
                    # Only remove actual control characters, not Unicode characters
                    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
                    cleaned_text = text.strip()
                    # Only update if we actually cleaned something and result is not empty
                    if cleaned_text or not text.strip():
                        item["text"] = cleaned_text if cleaned_text else item["text"]
                
                # Ensure speaker field exists
                if "speaker" not in item:
                    item["speaker"] = "speaker1"
                
                # Clean speaker field too
                if "speaker" in item and item["speaker"]:
                    speaker = str(item["speaker"])
                    speaker = speaker.replace('\x00', '')
                    speaker = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', speaker)
                    item["speaker"] = speaker.strip() if speaker.strip() else item["speaker"]
                
                cleaned_data.append(item)
            
            if not cleaned_data:
                raise ValueError("No valid segments found in JSON response")
                
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Error parsing JSON from content: {e}")
            logger.error(f"Content was: {content[:500]}...")
            raise ValueError(f"Failed to parse JSON: {str(e)}")
    
    def _fix_json_string(self, json_str):
        """Attempt to fix common JSON formatting issues while preserving Unicode."""
        try:
            # Remove any non-JSON content before the first [
            start_idx = json_str.find('[')
            if start_idx > 0:
                json_str = json_str[start_idx:]
            
            # Remove any non-JSON content after the last ]
            end_idx = json_str.rfind(']')
            if end_idx > 0:
                json_str = json_str[:end_idx + 1]
            
            # Use UTF-8 encoding and preserve Unicode characters
            # Only remove actual control characters that break JSON, not all non-ASCII
            # Remove NULL, CR without LF, and other truly problematic characters
            json_str = json_str.replace('\x00', '')  # Remove NULL bytes
            # Keep \n \t \r (0x09, 0x0a, 0x0d) - remove other control characters
            json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
            
            # Preserve Unicode characters - don't filter by string.printable
            # Fix common JSON issues while preserving text content
            json_str = re.sub(r'([,{]\s*)([}\]])', r'\1', json_str)  # Remove empty elements
            json_str = re.sub(r'}\s*{', '},{', json_str)  # Fix missing commas
            json_str = re.sub(r',\s*([\]}])', r'\1', json_str)  # Remove trailing commas
            
            return json_str
        except Exception as e:
            logger.error(f"Error fixing JSON string: {e}")
            return json_str

    def retry_with_backoff(self, func, max_retries=5, base_delay=15.0, max_delay=300.0, *args, **kwargs):
        """Retry a function with exponential backoff."""
        last_exception = None
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt == max_retries - 1:
                    logger.error(f"Function {func.__name__} failed after {max_retries} attempts. Last error: {e}")
                    raise
                
                delay = min(max_delay, base_delay * (2 ** attempt))
                jitter = random.uniform(0, delay * 0.1)
                total_delay = delay + jitter
                logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {total_delay:.2f} seconds...")
                time.sleep(total_delay)
        
        # This should never be reached, but just in case
        raise last_exception

    def timestamp_to_seconds(self, timestamp: str) -> float:
        """Convert a timestamp string like 'MM:SS.mmm' or 'HH:MM:SS.MS' to seconds."""
        if isinstance(timestamp, (int, float)):
            return float(timestamp)
        
        if ":" in timestamp:
            parts = timestamp.split(":")
            if len(parts) == 3:  # HH:MM:SS.MS format
                hours, minutes, seconds = parts
                return float(hours) * 3600 + float(minutes) * 60 + float(seconds)
            elif len(parts) == 2:  # MM:SS.MS format
                minutes, seconds = parts
                return float(minutes) * 60 + float(seconds)
            else:
                raise ValueError(f"Invalid timestamp format: {timestamp}")
        else:
            # Assume it's already in seconds
            return float(timestamp)

    def seconds_to_timestamp(self, seconds: float) -> str:
        """Convert seconds to timestamp string like 'MM:SS.mmm'."""
        minutes = int(seconds // 60)
        secs = seconds % 60
        return f"{minutes:02d}:{secs:06.3f}"

    def merge_json_with_offset(self, data, time_offset):
        """Merge multiple JSON arrays with time offset."""
        merged_array = []
        sorted_data = sorted(data.items(), key=lambda x: x[0])

        for i, json_array in sorted_data:
            offset_seconds = i * time_offset
            for entry in json_array:
                try:
                    new_entry = entry.copy()
                    # Convert timestamps to seconds and add offset
                    start_seconds = self.timestamp_to_seconds(entry['start'])
                    end_seconds = self.timestamp_to_seconds(entry['end'])
                    
                    new_entry['start'] = start_seconds + offset_seconds
                    new_entry['end'] = end_seconds + offset_seconds
                    merged_array.append(new_entry)
                except Exception as e:
                    logger.warning(f"Error processing entry {entry}: {e}")
                    continue

        return merged_array
    
    def call_model(self, audio_data, prompt):
        """
        Call the Gemini model to generate content.
        
        Args:
            audio_file: The audio file to process
            prompt: The prompt to use for generation
            safety_settings: Safety settings for the model
            
        Returns:
            The model's response
        """
        def _make_api_call():
            # Create content using the simplified API format
            from google.generativeai.types import HarmCategory, HarmBlockThreshold
            
            safety_settings = [
                {
                    "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
            ]
            
            # Validate audio data before sending
            if not audio_data or len(audio_data) == 0:
                raise ValueError("Audio data is empty")
            
            # Check if audio data looks valid (MP3 files start with specific headers)
            # MP3 files typically start with ID3 tag (0x49 0x44 0x33) or sync word (0xFF 0xFB or 0xFF 0xF3)
            is_valid_mp3 = (
                audio_data[:3] == b'ID3' or  # ID3 tag
                audio_data[:2] == b'\xFF\xFB' or  # MP3 sync word (MPEG-1 Layer 3)
                audio_data[:2] == b'\xFF\xF3' or  # MP3 sync word (MPEG-1 Layer 3)
                audio_data[:2] == b'\xFF\xF2'     # MP3 sync word (MPEG-1 Layer 3)
            )
            
            if not is_valid_mp3:
                logger.warning(f"⚠️ Audio data may not be valid MP3 format (first bytes: {audio_data[:10].hex()})")
                logger.warning("⚠️ Continuing anyway - Gemini may still be able to process it")
            
            # Upload the audio file and get the content
            import io
            audio_file = {
                "mime_type": "audio/mpeg",
                "data": audio_data
            }
            
            logger.info(f"📤 Sending audio to Gemini: {len(audio_data)} bytes, mime_type=audio/mpeg")
            response = self.genai_client.generate_content(
                contents=[audio_file, prompt],
                safety_settings=safety_settings,
            )
            
            if not response or not response.text:
                logger.error("❌ Gemini returned empty response")
                raise ValueError("Empty response from Gemini API")
            
            logger.info(f"✅ Received response from Gemini: {len(response.text)} characters")
            return response.text
        
        try:
            # Use retry logic for API calls
            return self.retry_with_backoff(
                _make_api_call, 
                max_retries=self.max_retries, 
                base_delay=self.base_delay, 
                max_delay=self.max_delay
            )
        except Exception as e:
            logger.error(f"Error in call_model after retries: {e}")
            raise Exception(f"Failed to call Gemini model after retries: {str(e)}")

    def transcribe_chunk(self, idx, chunk_path, template_id=None):
        """Transcribe a single audio chunk."""
        logger.info(f"Transcribing chunk {idx}: {chunk_path} with template {template_id}")
        
        def _transcribe_chunk_internal():
            prompt = self._get_transcription_prompt(template_id)
            logger.info(f"📝 Transcription prompt (first 500 chars): {prompt[:500]}...")

            # Read audio file and validate
            if not os.path.exists(chunk_path):
                raise FileNotFoundError(f"Audio chunk file not found: {chunk_path}")
            
            file_size = os.path.getsize(chunk_path)
            logger.info(f"📊 Audio chunk file size: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
            
            if file_size == 0:
                raise ValueError(f"Audio chunk file is empty: {chunk_path}")
            
            with open(chunk_path, "rb") as af:
                audio_file = af.read()
            
            if len(audio_file) != file_size:
                raise ValueError(f"Audio file read incomplete: expected {file_size} bytes, got {len(audio_file)} bytes")
            
            logger.info(f"✅ Audio file read successfully: {len(audio_file)} bytes")
            self.audio_file = audio_file
            logger.debug(f"Calling Gemini model for chunk {idx}")
            
            response = self.call_model(
                audio_data=audio_file,
                prompt=prompt
            )
            content = response
            logger.debug(f"Received response for chunk {idx} with content length: {len(content) if content else 0}")
            
            # Log raw response preview for debugging
            if content:
                preview = content[:500] if len(content) > 500 else content
                logger.info(f"📥 Raw transcription response preview (first 500 chars): {preview}")
            
            json_data = self.safe_extract_json(content)
            logger.info(f"Successfully transcribed chunk {idx} with {len(json_data)} segments")
            
            # Log transcription quality for debugging iOS issues
            if json_data:
                empty_or_invalid_count = 0
                for seg_idx, segment in enumerate(json_data[:5]):  # Log first 5 segments
                    if isinstance(segment, dict) and 'text' in segment:
                        text = segment.get('text', '')
                        text_length = len(text) if text else 0
                        text_stripped = text.strip() if text else ''
                        
                        # Check for problematic patterns
                        is_empty = text_length == 0 or text_stripped == ''
                        is_only_punctuation = text_stripped and all(c in '?.,!;: ' for c in text_stripped)
                        has_special_chars = bool(text and not text.strip().isprintable()) if text else False
                        
                        if is_empty or is_only_punctuation:
                            empty_or_invalid_count += 1
                        
                        logger.info(f"📝 Chunk {idx}, Segment {seg_idx}: text_length={text_length}, is_empty={is_empty}, is_only_punct={is_only_punctuation}, preview='{text[:100] if text else 'empty'}'")
                
                if empty_or_invalid_count > 0:
                    logger.warning(f"⚠️ Chunk {idx} has {empty_or_invalid_count} empty or invalid segments out of {len(json_data[:5])} checked")
            else:
                logger.warning(f"⚠️ Chunk {idx} returned empty transcription data")
            
            return json_data
        
        try:
            # Use retry logic for chunk transcription
            json_data = self.retry_with_backoff(
                _transcribe_chunk_internal,
                max_retries=self.max_retries,
                base_delay=self.base_delay,
                max_delay=self.max_delay
            )
            return idx, json_data
        except Exception as e:
            logger.error(f"Error processing chunk {idx} after retries: {str(e)}")
            # Return empty data for failed chunk instead of raising
            return idx, []

    def stitch_audio_chunks(self, meeting_id: str) -> Optional[str]:
        """
        Stitch audio chunks (mic and tab) into a single file.
        Simplified logic using os.listdir and strict absolute paths.
        """
        # Ensure we use the absolute path for the directory
        base_dir = os.path.abspath("temp_audio")
        meeting_dir = os.path.join(base_dir, str(meeting_id))
        
        logger.info(f"STITCH-V2: Starting for {meeting_id}")
        logger.info(f"STITCH-V2: Directory -> {meeting_dir}")
        
        if not os.path.exists(meeting_dir):
            logger.warning(f"STITCH-V2: ⚠️ Directory not found: {meeting_dir}")
            return None
            
        mic_files = []
        tab_files = []
        
        try:
            # 1. List all files
            all_files = sorted(os.listdir(meeting_dir))
            logger.info(f"STITCH-V2: Found {len(all_files)} total files")
            
            # 2. Filter and categorize
            for filename in all_files:
                if not filename.endswith(".webm"):
                    continue
                    
                full_path = os.path.join(meeting_dir, filename)
                
                if filename.startswith("mic_"):
                    mic_files.append(full_path)
                elif filename.startswith("tab_"):
                    tab_files.append(full_path)
            
            logger.info(f"STITCH-V2: Mic chunks: {len(mic_files)}, Tab chunks: {len(tab_files)}")
            
            if not mic_files and not tab_files:
                logger.warning(f"STITCH-V2: ⚠️ No audio chunks identified (mic_*.webm or tab_*.webm)")
                logger.warning(f"STITCH-V2: Directory contents: {all_files}")
                return None
                
        except Exception as e:
            logger.error(f"STITCH-V2: ❌ Error scanning directory: {e}", exc_info=True)
            return None
            
        # 3. Sort by timestamp (in filename)
        # Filename format: type_TIMESTAMP.webm
        def extract_ts(path):
            try:
                fname = os.path.basename(path)
                # Remove extension and prefix
                core = fname.replace(".webm", "").replace("mic_", "").replace("tab_", "")
                return float(core)
            except:
                return 0.0
                
        mic_files.sort(key=extract_ts)
        tab_files.sort(key=extract_ts)
        
        full_mic = AudioSegment.empty()
        full_tab = AudioSegment.empty()
        
        # Concatenate Mic Chunks
        for f in mic_files:
            try:
                # Load with pydub
                chunk = AudioSegment.from_file(f, format="webm")
                full_mic += chunk
            except Exception as e:
                logger.error(f"Error loading mic chunk {f}: {e}")
                
        # Concatenate Tab Chunks
        for f in tab_files:
            try:
                chunk = AudioSegment.from_file(f, format="webm")
                full_tab += chunk
            except Exception as e:
                logger.error(f"Error loading tab chunk {f}: {e}")
                
        final_audio = None
        
        # Mix Audio
        if len(full_mic) > 0 and len(full_tab) > 0:
            logger.info("Mixing mic and tab audio...")
            final_audio = full_mic.overlay(full_tab)
            
        elif len(full_mic) > 0:
            logger.info("Using only mic audio")
            final_audio = full_mic
        elif len(full_tab) > 0:
            logger.info("Using only tab audio")
            final_audio = full_tab
            
        if not final_audio:
            logger.error("Failed to produce final audio")
            return None
            
        # Export final file to temp_audio/meeting_ID.webm
        output_filename = f"meeting_{meeting_id}.webm"
        output_path = os.path.join("temp_audio", output_filename)
        
        # Ensure output dir exists (it is temp_audio root usually)
        os.makedirs("temp_audio", exist_ok=True)

        final_audio.export(output_path, format="webm")
        logger.info(f"STITCH-V2: Stitched audio saved to: {output_path}")
        
        # Cleanup chunks directory
        try:
            shutil.rmtree(meeting_dir)
            logger.info(f"STITCH-V2: Cleaned up temp chunk directory: {meeting_dir}")
        except Exception as e:
            logger.warning(f"STITCH-V2: Failed to cleanup temp dir {meeting_dir}: {e}")
            
        return output_path

    def stitch_audio_chunks_v3(self, meeting_id: str) -> Optional[str]:
        """
        Process the single appended recording files (mic_recording.webm, tab_recording.webm).
        Converts to WAV as requested.
        """
        base_dir = os.path.abspath("temp_audio")
        meeting_dir = os.path.join(base_dir, str(meeting_id))
        
        logger.info(f"PROCESS-STREAM: Starting for {meeting_id}")
        
        if not os.path.exists(meeting_dir):
            logger.warning(f"PROCESS-STREAM: ⚠️ Directory not found: {meeting_dir}")
            return None
            
        mic_path = os.path.join(meeting_dir, "mic_recording.webm")
        tab_path = os.path.join(meeting_dir, "tab_recording.webm")
        
        has_mic = os.path.exists(mic_path)
        has_tab = os.path.exists(tab_path)
        
        if not has_mic and not has_tab:
            logger.warning("PROCESS-STREAM: No recording files found (mic_recording.webm or tab_recording.webm)")
            return None

        # DIAGNOSTIC: Check file headers
        for p, name in [(mic_path, "Mic"), (tab_path, "Tab")]:
            if os.path.exists(p):
                try:
                    with open(p, "rb") as f:
                        h = f.read(4)
                        if h != b'\x1A\x45\xDF\xA3':
                            logger.error(f"PROCESS-STREAM: ⚠️ {name} file missing EBML header! Start bytes: {h.hex() if len(h)>0 else 'EMPTY'}. This usually means the recording started mid-stream.")
                        else:
                            logger.info(f"PROCESS-STREAM: {name} file has valid EBML header.")
                except Exception as e:
                    logger.error(f"PROCESS-STREAM: Could not read {name} header: {e}")

        full_mic = AudioSegment.empty()
        full_tab = AudioSegment.empty()
        
        # Try mixing with pydub (requires ffmpeg)
        try:
            if has_mic:
                logger.info(f"PROCESS-STREAM: Loading Mic stream: {mic_path}")
                full_mic = AudioSegment.from_file(mic_path, format="webm")
                
            if has_tab:
                logger.info(f"PROCESS-STREAM: Loading Tab stream: {tab_path}")
                full_tab = AudioSegment.from_file(tab_path, format="webm")
                
            final_audio = None
            # Mix Audio
            if len(full_mic) > 0 and len(full_tab) > 0:
                logger.info(f"PROCESS-STREAM: Mixing mic ({len(full_mic)}ms) and tab ({len(full_tab)}ms)")
                final_audio = full_mic.overlay(full_tab)
            elif len(full_mic) > 0:
                logger.info("PROCESS-STREAM: Using only mic audio")
                final_audio = full_mic
            elif len(full_tab) > 0:
                logger.info("PROCESS-STREAM: Using only tab audio")
                final_audio = full_tab
                
            if not final_audio:
                raise Exception("Failed to produce final audio (empty segments)")
                
            # Export as WAV
            output_filename = f"meeting_{meeting_id}.wav"
            output_path = os.path.join("temp_audio", output_filename)
            os.makedirs("temp_audio", exist_ok=True)
            
            final_audio.export(output_path, format="wav")
            logger.info(f"PROCESS-STREAM: Final audio saved to: {output_path}")
            
            # Cleanup only on success
            try:
                shutil.rmtree(meeting_dir)
                logger.info(f"PROCESS-STREAM: Cleaned up temp chunk directory: {meeting_dir}")
            except Exception as e:
                logger.warning(f"PROCESS-STREAM: Failed to cleanup temp dir {meeting_dir}: {e}")
                
            return output_path
            
        except Exception as e:
            logger.error(f"PROCESS-STREAM: ❌ CRITICAL: Audio mixing failed! {e}")
            logger.error("PROCESS-STREAM: ❌ This usually means 'ffmpeg' is not installed or not in the PATH.")
            logger.error("PROCESS-STREAM: ❌ WITHOUT FFMPEG, REMOTE PARTICIPANT AUDIO (tab_recording.webm) WILL BE LOST.")
            logger.error("PROCESS-STREAM: ❌ Please install ffmpeg: 'brew install ffmpeg' (Mac) or 'sudo apt install ffmpeg' (Linux)")
            logger.info("PROCESS-STREAM: ⚠️ Falling back to raw mic recording (Local audio only)")

        # Fallback: Use raw mic recording
        if has_mic:
            output_filename = f"meeting_{meeting_id}.webm"
            output_path = os.path.join("temp_audio", output_filename)
            os.makedirs("temp_audio", exist_ok=True)
            try:
                shutil.copy2(mic_path, output_path)
                logger.info(f"PROCESS-STREAM: Copied raw mic audio to: {output_path}")
                # Cleanup after successful fallback copy
                try:
                    shutil.rmtree(meeting_dir)
                    logger.info(f"PROCESS-STREAM: Cleaned up temp chunk directory after fallback: {meeting_dir}")
                except Exception as e:
                    logger.warning(f"PROCESS-STREAM: Failed to cleanup temp dir {meeting_dir} after fallback: {e}")
                return output_path
            except Exception as e:
                logger.error(f"PROCESS-STREAM: Failed to copy raw audio: {e}")
                return None
                
        logger.error("PROCESS-STREAM: No audio could be processed")
        return None

    def transcribe_chunks(self, audio_uri, template_id=None):
        """Transcribe multiple audio chunks in parallel."""
        logger.info(f"Starting parallel transcription of chunks from: {audio_uri} with template {template_id}")
        
        chunks_dict = self.split_audio(audio_uri)
        results = {}

        with ThreadPoolExecutor(max_workers=5) as executor:
            logger.info(f"Submitting {len(chunks_dict)} chunks for transcription")
            future_to_idx = {
                executor.submit(self.transcribe_chunk, idx, chunk_uri, template_id): idx
                for idx, chunk_uri in chunks_dict.items()
            }

            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    idx, json_data = future.result()
                    results[idx] = json_data
                    if json_data:  # Only log if we got actual data
                        logger.info(f"Completed transcription of chunk {idx} with {len(json_data)} segments")
                    else:
                        logger.warning(f"Chunk {idx} returned empty data")
                except Exception as e:
                    logger.error(f"Error processing chunk {idx}: {str(e)}")
                    # Don't raise immediately, continue with other chunks
                    # Only raise if this was the only chunk or all chunks failed
                    if len(chunks_dict) == 1:
                        raise
                    else:
                        logger.warning(f"Skipping failed chunk {idx}, continuing with others")
                        results[idx] = []  # Add empty result for failed chunk
                        continue

        if not results:
            raise Exception("All chunks failed to process. No transcription data available.")
        
        # Filter out empty results before merging
        valid_results = {k: v for k, v in results.items() if v}
        logger.info(f"Merging transcription results with time offsets from {len(valid_results)} valid chunks (out of {len(results)} total)")
        
        if not valid_results:
            logger.warning("No valid chunks to merge, returning empty transcription")
            return []
        
        try:
            final_json = self.merge_json_with_offset(valid_results, 300)  # Using 300 seconds as default offset
            logger.info(f"Successfully merged {len(final_json)} segments")
        except Exception as e:
            logger.error(f"Error merging transcription results: {e}")
            # Fallback: return all segments without time offset
            final_json = []
            for chunk_data in valid_results.values():
                final_json.extend(chunk_data)
            logger.warning(f"Using fallback merge with {len(final_json)} segments")

        # Remove all chunk files
        for chunk_path in chunks_dict.values():
            try:
                if os.path.exists(chunk_path):
                    os.remove(chunk_path)
                    logger.debug(f"Removed chunk file: {chunk_path}")
            except Exception as e:
                logger.error(f"Error removing chunk file {chunk_path}: {str(e)}")
        return final_json

    def transcribe_with_gemini(self, audio_path, duration, template_id=None):
        """Transcribe audio using Gemini model."""
        logger.info(f"Duration   :  {duration}, 300 with template {template_id}")
        
        if duration <= 300:  # Using 300 seconds as default offset
            idx, transcription = self.transcribe_chunk(0, audio_path, template_id)
            return transcription
        else:
            logger.info(f"audio path in transcribe_with_gemini is is {audio_path}")
            transcription = self.transcribe_chunks(audio_path, template_id)
            return transcription

    def get_segments(self, audio_path, template_id=None):
        """Get all segments from audio file."""
        try:
            all_segments = []
            try:
                audio = AudioSegment.from_file(audio_path)
                audio_length = len(audio) / 1000.0
            except Exception as e:
                logger.warning(f"Could not determine audio duration (likely missing ffmpeg): {e}")
                logger.info("Defaulting to single-chunk processing (Gemini handles raw files well)")
                audio_length = 1.0  # Force single chunk path
                
            all_segments = self.transcribe_with_gemini(audio_path, audio_length, template_id)
            return all_segments
        except Exception as e:
            logger.error(f"Error getting segments: {e}")
            raise Exception(f"Failed to get audio segments: {str(e)}")
    
    def validate_audio_file(self, audio_path):
        """Validate audio file before processing."""
        try:
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            # Check file size
            file_size = os.path.getsize(audio_path)
            if file_size == 0:
                raise ValueError("Audio file is empty")
            
            # Check file extension
            file_name = os.path.basename(audio_path)
            file_extension = file_name.split(".")[-1].lower()
            supported_formats = ["wav", "mp3", "m4a", "aac", "flac", "ogg", "wma", "webm", "opus"]
            if file_extension not in supported_formats:
                raise ValueError(f"Unsupported audio format: {file_extension}. Supported formats: {', '.join(supported_formats)}")
            
            # Try to load the audio file
            try:
                # If we have ffmpeg, this validates format. If not, it fails for non-wav.
                audio = AudioSegment.from_file(audio_path, format=file_extension)
                if len(audio) == 0:
                    raise ValueError("Audio file appears to be empty")
                logger.info(f"Audio file validation successful. Duration: {len(audio)/1000:.2f} seconds")
            except Exception as e:
                # If loading fails (e.g. no ffmpeg), but file exists and has size, assume valid for Gemini
                logger.warning(f"Audio validation warning (likely missing ffmpeg): {e}")
                logger.info("Proceeding with raw file since it exists and has content.")
                return True
            
            return True
            
        except Exception as e:
            logger.error(f"Audio file validation failed: {e}")
            # If strictly required, raise. But here we try to be permissive for raw files.
            # If file doesn't exist or is empty, we already raised above.
            # So this catches strictly validation/format errors.
            raise ValueError(f"Invalid audio file: {e}")
    
    def convert_to_boolean(self, value):
        """Convert string boolean values to proper boolean values."""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            value = value.lower()
            if value in ['yes', 'true', '1', 'y']:
                return True
            elif value in ['no', 'false', '0', 'n']:
                return False
        return None
    
    def get_transcription(self, audio_path, template_id=None):
        """Get transcription for mobile mic audio file."""
        if not self.genai_client:
            raise Exception("Gemini client not initialized. Please check GEMINI_KEY.")

        def _get_transcription_internal():
            # Validate audio file first
            self.validate_audio_file(audio_path)
            
            all_segments = self.get_segments(audio_path, template_id)
            logger.info(f"Retrieved {len(all_segments)} segments from audio with template {template_id}")
            
            transcriptions = []

            for segment in all_segments:
                try:
                    if not isinstance(segment, dict) or "start" not in segment or "end" not in segment:
                        logger.warning(f"Skipping invalid segment: {segment}")
                        continue
                        
                    start_time = segment["start"]
                    end_time = segment["end"]
                    
                    # Convert HH:MM:SS.MS to seconds
                    if isinstance(start_time, str):
                        if ":" in start_time:
                            start_parts = start_time.split(":")
                            if len(start_parts) == 3:  # HH:MM:SS.MS format
                                start_seconds = float(start_parts[0]) * 3600 + float(start_parts[1]) * 60 + float(start_parts[2])
                            else:  # MM:SS.MS format
                                start_seconds = float(start_parts[0]) * 60 + float(start_parts[1])
                        else:
                            start_seconds = float(start_time)
                    else:
                        start_seconds = float(start_time)
                        
                    if isinstance(end_time, str):
                        if ":" in end_time:
                            end_parts = end_time.split(":")
                            if len(end_parts) == 3:  # HH:MM:SS.MS format
                                end_seconds = float(end_parts[0]) * 3600 + float(end_parts[1]) * 60 + float(end_parts[2])
                            else:  # MM:SS.MS format
                                end_seconds = float(end_parts[0]) * 60 + float(end_parts[1])
                        else:
                            end_seconds = float(end_time)
                    else:
                        end_seconds = float(end_time)

                    segment["start"] = start_seconds
                    segment["end"] = end_seconds

                    transcriptions.append(segment)
                except Exception as e:
                    logger.error(f"Error processing segment {segment}: {e}")
                    continue
            
            # Extract speaker names from conversation content
            logger.info("🔍 Analyzing conversation for speaker name extraction...")
            speaker_mapping = self._extract_speaker_names_from_transcription(transcriptions)
            
            if speaker_mapping:
                logger.info(f"✅ Found speaker names: {speaker_mapping}")
                # Apply speaker name mapping
                transcriptions = self._apply_speaker_name_mapping(transcriptions, speaker_mapping)
                logger.info("✅ Applied speaker name mapping to transcription")
            else:
                logger.info("ℹ️  No speaker names detected, using generic speaker labels")
                    
            return transcriptions

        try:
            # Use retry logic for the entire transcription process
            return self.retry_with_backoff(
                _get_transcription_internal,
                max_retries=self.max_retries,
                base_delay=self.base_delay,
                max_delay=self.max_delay
            )
        except Exception as e:
            logger.error(f"Error getting transcription after retries: {e}")
            raise Exception(f"Failed to get audio transcription after retries: {str(e)}")
    
    def generate_summary(self, transcription, template_id=None):
        """Generate a summary of the transcription."""
        if not self.genai_client:
            raise Exception("Gemini client not initialized. Please check GEMINI_KEY.")
        
        def _generate_summary_internal():
            # Format transcription data for the prompt
            if isinstance(transcription, list):
                formatted_text = ""
                for segment in transcription:
                    if isinstance(segment, dict) and "text" in segment:
                        formatted_text += f"Speaker {segment.get('speaker', 'Unknown')}: {segment['text']}\n"
                    else:
                        formatted_text += f"{segment}\n"
            else:
                formatted_text = str(transcription)
            
            logger.info(f"ℹ️  Using predefined template {template_id} for summary generation")
            prompt = self._get_summary_prompt(template_id) + f"""
            
            Transcription:
            {formatted_text}
            """
            
            from google.generativeai.types import HarmCategory, HarmBlockThreshold
            
            safety_settings = [
                {
                    "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    "threshold": HarmBlockThreshold.BLOCK_NONE,
                },
            ]
            
            response = self.genai_client.generate_content(
                contents=prompt,
                safety_settings=safety_settings,
            )
            return response.text
        
        try:
            # Use retry logic for summary generation
            return self.retry_with_backoff(
                _generate_summary_internal,
                max_retries=self.max_retries,
                base_delay=self.base_delay,
                max_delay=self.max_delay
            )
        except Exception as e:
            logger.error(f"Error generating summary after retries: {e}")
            return f"Error generating summary: {str(e)}"
    
    def extract_key_points(self, transcription, template_id=None, custom_template_points=None):
        """Extract key points from the transcription."""
        if not self.genai_client:
            raise Exception("Gemini client not initialized. Please check GEMINI_KEY.")
        
        def _extract_key_points_internal():
            # Format transcription data for the prompt
            if isinstance(transcription, list):
                formatted_text = ""
                for segment in transcription:
                    if isinstance(segment, dict) and "text" in segment:
                        formatted_text += f"Speaker {segment.get('speaker', 'Unknown')}: {segment['text']}\n"
                    else:
                        formatted_text += f"{segment}\n"
            else:
                formatted_text = str(transcription)
            
            # Handle custom template
            logger.info(f"🎯 extract_key_points - template_id: '{template_id}', custom_template_points: '{custom_template_points}'")
            logger.info(f"🔧 bool(custom_template_points): {bool(custom_template_points)}")
            
            if custom_template_points:
                logger.info("✅ Using custom template for key points extraction")
                # Parse custom template points and create structured headings
                custom_points = custom_template_points.strip().split('\n')
                custom_points = [point.strip() for point in custom_points if point.strip()]
                
                # Create structured prompt with custom headings for key points
                structure_guide = "\n".join([f"**{point}:**" for point in custom_points])
                
                prompt = f"""This is the transcription of a custom audio recording. Please extract the key points following the exact structure provided by the user.

The key points should be organized under these specific headings:
{structure_guide}

For each heading, extract the most important and actionable points from the transcription. Focus on specific details, decisions, or important information rather than general summaries.

Transcription:
{formatted_text}
"""
            else:
                logger.info(f"ℹ️  Using predefined template {template_id} for key points extraction")
                key_points_list = self._get_key_points_prompt(template_id)
                key_points_text = "\n".join([f"- {point}" for point in key_points_list])
                prompt = f"""This is the transcription of an audio recording, please extract the key points including:

{key_points_text}

Transcription:
{formatted_text}
"""
            
            response = self.genai_client.generate_content(
                contents=prompt,
            )
            return response.text
        
        try:
            # Use retry logic for key points extraction
            return self.retry_with_backoff(
                _extract_key_points_internal,
                max_retries=self.max_retries,
                base_delay=self.base_delay,
                max_delay=self.max_delay
            )
        except Exception as e:
            logger.error(f"Error extracting key points after retries: {e}")
            return f"Error extracting key points: {str(e)}"
    
    def extract_action_items(self, transcription, template_id=None):
        """Extract action items from the transcription."""
        logger.info("=" * 80)
        logger.info("🎯 [Action Items] ===== STARTING ACTION ITEMS EXTRACTION =====")
        logger.info(f"🎯 [Action Items] Template ID: {template_id}")
        logger.info("=" * 80)
        
        if not self.genai_client:
            logger.error("❌ [Action Items] Gemini client not initialized")
            raise Exception("Gemini client not initialized. Please check GEMINI_KEY.")
        
        def _extract_action_items_internal():
            logger.info("🔄 [Action Items] Formatting transcription for extraction...")
            
            # Format transcription data for the prompt
            if isinstance(transcription, list):
                logger.info(f"📝 [Action Items] Transcription is a list with {len(transcription)} segments")
                formatted_text = ""
                for segment in transcription:
                    if isinstance(segment, dict) and "text" in segment:
                        formatted_text += f"Speaker {segment.get('speaker', 'Unknown')}: {segment['text']}\n"
                    else:
                        formatted_text += f"{segment}\n"
            else:
                logger.info("📝 [Action Items] Transcription is not a list, converting to string")
                formatted_text = str(transcription)
            
            logger.info(f"📝 [Action Items] Formatted transcription length: {len(formatted_text)} characters")
            logger.info(f"📝 [Action Items] Transcription preview (first 200 chars): {formatted_text[:200]}...")
            
            prompt = f"""This is the transcription of an audio recording. Please extract all action items mentioned in the meeting.

For each action item, identify:
1. The description of what needs to be done
2. The owner/person responsible (if mentioned)
3. The priority (high, medium, or low - based on urgency and importance)
4. The due date or deadline (if mentioned)
5. The status (pending, in_progress, or completed - if mentioned)

Return the response as a JSON array of action items. Each action item should have this structure:
{{
  "description": "What needs to be done",
  "owner": "Person responsible (or null if not mentioned)",
  "priority": "high|medium|low (default to medium if not clear)",
  "due_date": "Due date if mentioned (or null)",
  "status": "pending|in_progress|completed (default to pending)"
}}

If no action items are found, return an empty array: []

Transcription:
{formatted_text}

Return only valid JSON, no additional text or explanations."""

            logger.info("📤 [Action Items] Sending request to Gemini for action items extraction...")
            logger.info(f"📤 [Action Items] Prompt length: {len(prompt)} characters")
            
            response = self.genai_client.generate_content(
                contents=prompt,
            )
            
            if not response or not response.text:
                logger.error("❌ [Action Items] No response received from Gemini")
                return []
            
            response_text = response.text.strip()
            logger.info(f"📥 [Action Items] Received response from Gemini (length: {len(response_text)} characters)")
            logger.info(f"📥 [Action Items] Response preview (first 500 chars): {response_text[:500]}...")
            
            # Parse JSON from response
            try:
                # Try to extract JSON from the response
                import json
                import re
                
                logger.info("🔍 [Action Items] Parsing JSON from response...")
                
                # Remove markdown code blocks if present
                original_response = response_text
                response_text = re.sub(r'```json\s*', '', response_text)
                response_text = re.sub(r'```\s*', '', response_text)
                response_text = response_text.strip()
                
                if original_response != response_text:
                    logger.info("🔍 [Action Items] Removed markdown code blocks from response")
                
                # Find JSON array in the response
                start_idx = response_text.find('[')
                end_idx = response_text.rfind(']') + 1
                
                logger.info(f"🔍 [Action Items] JSON array found at indices: start={start_idx}, end={end_idx}")
                
                if start_idx != -1 and end_idx > 0:
                    json_text = response_text[start_idx:end_idx]
                    logger.info(f"🔍 [Action Items] Extracted JSON text (length: {len(json_text)} characters)")
                    logger.info(f"🔍 [Action Items] JSON preview: {json_text[:300]}...")
                    
                    action_items = json.loads(json_text)
                    logger.info(f"✅ [Action Items] Successfully parsed JSON, found {len(action_items)} raw items")
                    
                    # Validate and clean action items
                    cleaned_items = []
                    for idx, item in enumerate(action_items):
                        logger.info(f"🔍 [Action Items] Processing item {idx + 1}/{len(action_items)}: {item}")
                        
                        if isinstance(item, dict) and "description" in item:
                            cleaned_item = {
                                "description": item.get("description", "").strip(),
                                "owner": item.get("owner") if item.get("owner") and item.get("owner").strip().lower() not in ["null", "none", ""] else None,
                                "priority": item.get("priority", "medium").lower() if item.get("priority") else "medium",
                                "due_date": item.get("due_date") if item.get("due_date") and item.get("due_date").strip().lower() not in ["null", "none", ""] else None,
                                "status": item.get("status", "pending").lower() if item.get("status") else "pending"
                            }
                            # Validate priority
                            if cleaned_item["priority"] not in ["high", "medium", "low"]:
                                logger.warning(f"⚠️ [Action Items] Invalid priority '{cleaned_item['priority']}', defaulting to 'medium'")
                                cleaned_item["priority"] = "medium"
                            # Validate status
                            if cleaned_item["status"] not in ["pending", "in_progress", "completed"]:
                                logger.warning(f"⚠️ [Action Items] Invalid status '{cleaned_item['status']}', defaulting to 'pending'")
                                cleaned_item["status"] = "pending"
                            
                            logger.info(f"✅ [Action Items] Validated item {idx + 1}: description='{cleaned_item['description'][:50]}...', owner={cleaned_item['owner']}, priority={cleaned_item['priority']}")
                            cleaned_items.append(cleaned_item)
                        else:
                            logger.warning(f"⚠️ [Action Items] Skipping invalid item {idx + 1}: missing 'description' field or not a dict")
                    
                    logger.info(f"✅ [Action Items] Successfully extracted and validated {len(cleaned_items)} action items from transcription")
                    if len(cleaned_items) == 0:
                        logger.warning("⚠️ [Action Items] No valid action items found in transcription")
                    return cleaned_items
                else:
                    logger.warning("⚠️ [Action Items] No JSON array found in response (no '[' or ']' found)")
                    logger.warning(f"⚠️ [Action Items] Full response text: {response_text}")
                    return []
                    
            except json.JSONDecodeError as e:
                logger.error(f"❌ [Action Items] Failed to parse JSON from action items response: {e}")
                logger.error(f"❌ [Action Items] Response text (first 500 chars): {response_text[:500]}")
                logger.error(f"❌ [Action Items] Full response text: {response_text}")
                return []
            except Exception as e:
                logger.error(f"❌ [Action Items] Error parsing action items: {e}")
                import traceback
                logger.error(f"❌ [Action Items] Traceback: {traceback.format_exc()}")
                return []
        
        try:
            # Use retry logic for action items extraction
            logger.info(f"🔄 [Action Items] Starting extraction with retry logic (max_retries={self.max_retries})")
            result = self.retry_with_backoff(
                _extract_action_items_internal,
                max_retries=self.max_retries,
                base_delay=self.base_delay,
                max_delay=self.max_delay
            )
            logger.info(f"✅ [Action Items] Extraction completed. Returning {len(result)} action items")
            return result
        except Exception as e:
            logger.error(f"❌ [Action Items] Error extracting action items after retries: {e}")
            import traceback
            logger.error(f"❌ [Action Items] Traceback: {traceback.format_exc()}")
            return []
    
    def merge_audio_files(self, primary_audio_path: str, secondary_audio_path: str, output_path: str) -> str:
        """
        Merge two audio files by overlaying the secondary audio on top of the primary audio.
        
        Args:
            primary_audio_path: Path to the primary audio file
            secondary_audio_path: Path to the secondary audio file to overlay
            output_path: Path where the merged audio will be saved
            
        Returns:
            Path to the merged audio file
        """
        try:
            logger.info(f"🎵 Starting audio merge: {primary_audio_path} + {secondary_audio_path}")
            
            # Load both audio files
            primary_audio = AudioSegment.from_file(primary_audio_path)
            secondary_audio = AudioSegment.from_file(secondary_audio_path)
            
            logger.info(f"📊 Primary audio: {len(primary_audio)}ms, {primary_audio.frame_rate}Hz")
            logger.info(f"📊 Secondary audio: {len(secondary_audio)}ms, {secondary_audio.frame_rate}Hz")
            
            # Ensure both audio files have the same sample rate
            if primary_audio.frame_rate != secondary_audio.frame_rate:
                logger.info(f"🔄 Converting secondary audio from {secondary_audio.frame_rate}Hz to {primary_audio.frame_rate}Hz")
                secondary_audio = secondary_audio.set_frame_rate(primary_audio.frame_rate)
            
            # Ensure both audio files have the same number of channels
            if primary_audio.channels != secondary_audio.channels:
                logger.info(f"🔄 Converting secondary audio from {secondary_audio.channels} channels to {primary_audio.channels} channels")
                if primary_audio.channels == 1:
                    secondary_audio = secondary_audio.set_channels(1)
                else:
                    secondary_audio = secondary_audio.set_channels(2)
            
            # If secondary audio is longer than primary, extend primary audio with silence
            if len(secondary_audio) > len(primary_audio):
                silence_duration = len(secondary_audio) - len(primary_audio)
                silence = AudioSegment.silent(duration=silence_duration, frame_rate=primary_audio.frame_rate)
                primary_audio = primary_audio + silence
                logger.info(f"🔇 Extended primary audio with {silence_duration}ms of silence")
            
            # Overlay secondary audio on primary audio
            # This will mix the audio files together
            merged_audio = primary_audio.overlay(secondary_audio)
            
            # Export the merged audio
            merged_audio.export(output_path, format="wav")
            
            logger.info(f"✅ Audio merge completed successfully: {output_path}")
            logger.info(f"📊 Merged audio: {len(merged_audio)}ms, {merged_audio.frame_rate}Hz, {merged_audio.channels} channels")
            
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Error merging audio files: {str(e)}")
            raise Exception(f"Failed to merge audio files: {str(e)}")
    
    def validate_secondary_audio_file(self, audio_path: str) -> bool:
        """
        Validate secondary audio file for merging.
        
        Args:
            audio_path: Path to the audio file to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Check if file exists
            if not os.path.exists(audio_path):
                logger.error(f"❌ Secondary audio file not found: {audio_path}")
                return False
            
            # Check file size (minimum 1KB)
            file_size = os.path.getsize(audio_path)
            if file_size < 1024:
                logger.error(f"❌ Secondary audio file too small: {file_size} bytes")
                return False
            
            # Try to load the audio file
            audio = AudioSegment.from_file(audio_path)
            
            # Check duration (minimum 1 second, maximum 10 hours)
            duration_ms = len(audio)
            if duration_ms < 1000:
                logger.error(f"❌ Secondary audio too short: {duration_ms}ms")
                return False
            if duration_ms > 36000000:  # 10 hours
                logger.error(f"❌ Secondary audio too long: {duration_ms}ms")
                return False
            
            logger.info(f"✅ Secondary audio file validation successful: {duration_ms}ms, {audio.frame_rate}Hz")
            return True
            
        except Exception as e:
            logger.error(f"❌ Secondary audio file validation failed: {str(e)}")
            return False
    
    def normalize_audio_for_transcription(self, audio_path: str) -> Optional[str]:
        """
        Normalize audio file for better transcription quality.
        This includes:
        - Normalizing volume levels
        - Converting to mono if needed
        - Ensuring proper sample rate
        - Boosting quiet audio
        
        Args:
            audio_path: Path to the audio file to normalize
            
        Returns:
            Path to normalized audio file (same path if no changes needed, or new temp file)
        """
        try:
            logger.info(f"🔧 Normalizing audio for transcription: {audio_path}")
            
            # Load audio file
            audio = AudioSegment.from_file(audio_path)
            original_duration = len(audio)
            original_frame_rate = audio.frame_rate
            original_channels = audio.channels
            
            logger.info(f"📊 Original audio: {original_duration}ms, {original_frame_rate}Hz, {original_channels} channels")
            
            # Convert to mono if stereo (better for speech recognition)
            if audio.channels == 2:
                logger.info("🔄 Converting stereo to mono for better transcription")
                audio = audio.set_channels(1)
            
            # Normalize to 16kHz sample rate (optimal for speech recognition)
            target_sample_rate = 16000
            if audio.frame_rate != target_sample_rate:
                logger.info(f"🔄 Resampling from {audio.frame_rate}Hz to {target_sample_rate}Hz")
                audio = audio.set_frame_rate(target_sample_rate)
            
            # Normalize volume - boost quiet audio
            # Calculate max possible volume boost without clipping
            max_possible_volume = audio.max_possible_amplitude
            current_max_volume = audio.max
            volume_boost_db = 0
            
            if current_max_volume < max_possible_volume * 0.3:  # If audio is too quiet
                # Calculate safe boost (leave 10% headroom)
                target_max = max_possible_volume * 0.9
                volume_boost_db = 20 * math.log10(target_max / current_max_volume) if current_max_volume > 0 else 0
                # Limit boost to 12dB to avoid distortion
                volume_boost_db = min(volume_boost_db, 12.0)
                
                if volume_boost_db > 1.0:  # Only boost if significant
                    logger.info(f"🔊 Boosting audio volume by {volume_boost_db:.1f}dB")
                    audio = audio + volume_boost_db
            
            # Apply light noise reduction (normalize)
            try:
                # Normalize the audio to use full dynamic range
                audio = audio.normalize()
                logger.info("✅ Audio normalized to full dynamic range")
            except Exception as e:
                logger.warning(f"⚠️ Audio normalization failed (continuing anyway): {e}")
            
            # Only create new file if changes were made
            needs_new_file = (
                audio.channels != original_channels or
                audio.frame_rate != original_frame_rate or
                volume_boost_db > 1.0
            )
            
            if needs_new_file:
                # Create temporary file for normalized audio
                import tempfile
                temp_fd, normalized_path = tempfile.mkstemp(suffix='.mp3')
                os.close(temp_fd)
                
                # Export as MP3 with good quality
                audio.export(
                    normalized_path,
                    format="mp3",
                    bitrate="192k",
                    parameters=["-q:a", "2"]
                )
                
                logger.info(f"✅ Audio normalized and saved to: {normalized_path}")
                logger.info(f"📊 Normalized audio: {len(audio)}ms, {audio.frame_rate}Hz, {audio.channels} channels")
                return normalized_path
            else:
                logger.info("✅ Audio already in optimal format, no normalization needed")
                return audio_path
                
        except Exception as e:
            logger.error(f"❌ Error normalizing audio: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            # Return original path if normalization fails
            return audio_path
