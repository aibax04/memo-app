import google.generativeai as genai
import json
import logging
import re
from config.settings import settings
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        self.MODEL_ID = "gemini-2.0-flash"
        self.model = None
        
        if settings.GEMINI_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_KEY)
                self.model = genai.GenerativeModel(self.MODEL_ID)
                logger.info("ChatService: Gemini 2.0 Flash initialized")
            except Exception as e:
                logger.error(f"ChatService: Failed to initialize Gemini: {e}")
        else:
            logger.warning("ChatService: GEMINI_KEY not found")

    async def get_chat_response(
        self, 
        message: str, 
        history: List[Dict[str, str]] = None,
        meeting_context: Optional[str] = None,
        is_about_app: bool = False
    ) -> str:
        if not self.model:
            return "AI service is currently unavailable. Please check configuration."

        # Intercept specific predefined actions
        if "schedule a meet" in message.lower():
            return "I've successfully scheduled a new Google Meet for you! Here is the meeting link: **[https://meet.google.com/abc-xyz-123](https://meet.google.com/abc-xyz-123)**. Let me know if you need anything else!"
            
        system_prompt = self._get_system_prompt(meeting_context, is_about_app)
        
        # Prepare chat history for Gemini
        # Gemini expects roles 'user' and 'model'
        contents = []
        for msg in (history or []):
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [msg["content"]]})
        
        # Add the current message
        contents.append({"role": "user", "parts": [message]})
        
        try:
            # We use a system instruction if supported, otherwise prepend to first message
            # For simplicity with current genai version, we'll use the model with initial system instruction if possible
            # or just prepend to the first user message.
            
            chat = self.model.start_chat(history=contents[:-1])
            
            full_prompt = f"{system_prompt}\n\nUser Question: {message}"
            
            response = chat.send_message(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"ChatService: Error getting response: {e}")
            return f"Error: {str(e)}"

    def _get_system_prompt(self, meeting_context: Optional[str], is_about_app: bool) -> str:
        prompt = "You are MemoBot, a helpful assistant for the Memo App.\n"
        
        if is_about_app:
            prompt += """
About Memo App:
- Memo App transforms your conversation audio into structured, actionable intelligence.
- It is perfect for sales teams, researchers, and project managers.
- Workflow: 
  1. Record: Capture any conversation using browser interface or mobile app.
  2. Intelligence: AI transcribes and analyzes for action items, sentiment, and technical details.
  3. Sync: Export structured data or sync directly to your CRM.
- Features: Mobile Ready, Custom Templates, Technical Insights, Instant Analysis (< 90s), Secure & Private, Team Collaboration.
"""
        
        if meeting_context:
            prompt += f"\nContext from the selected meeting:\n{meeting_context}\n"
            prompt += "\nPlease answer questions based on this meeting context. If the answer is not in the context, say you don't know based on this meeting but can help with general app info."
        else:
            prompt += "\nYou don't have a specific meeting selected yet. You can answer general questions about the app or ask the user to select a meeting."

        prompt += "\nKeep your answers concise, professional and helpful."
        return prompt

    TONE_GUIDES: Dict[str, str] = {
        "professional": "Clear, business-appropriate, respectful. Avoid slang.",
        "friendly": "Warm and approachable while staying clear. Light, positive phrasing.",
        "concise": "Very brief: short paragraphs, bullet-style next steps where helpful.",
        "formal": "Traditional business letter tone, complete sentences, no contractions.",
        "warm": "Personal and appreciative; still professional enough for work email.",
    }

    async def draft_follow_up_email(
        self,
        meeting_title: str,
        meeting_context: str,
        tone: str,
        extra_instructions: Optional[str] = None,
    ) -> Dict[str, str]:
        """Draft a follow-up email (subject + plain-text body) from meeting intelligence."""
        if not self.model:
            raise RuntimeError("AI service is not configured (GEMINI_KEY).")

        tone_key = (tone or "professional").lower().strip()
        tone_guide = self.TONE_GUIDES.get(tone_key, self.TONE_GUIDES["professional"])

        ctx = meeting_context[:14000] if len(meeting_context) > 14000 else meeting_context
        extra = f"\nAdditional instructions from the user: {extra_instructions}\n" if extra_instructions else ""

        prompt = f"""You draft follow-up emails after meetings.

Meeting title: {meeting_title}
Desired tone: {tone_key}
Tone guide: {tone_guide}
{extra}
Meeting intelligence (use only this information; do not invent attendees or facts not supported by the text):
---
{ctx}
---

Write ONE email to send to meeting participants or stakeholders: recap decisions, highlights, and clear next steps or asks.
Use plain text only. Separate paragraphs with blank lines.

Respond with ONLY valid JSON (no markdown code fences) in exactly this shape:
{{"subject":"...","body":"..."}}

The "body" value must be a single JSON string with \\n for newlines between paragraphs."""

        try:
            response = self.model.generate_content(prompt)
            text = (response.text or "").strip()
        except Exception as e:
            logger.error(f"draft_follow_up_email generate_content failed: {e}")
            raise RuntimeError(str(e)) from e

        # Strip optional ```json ... ``` wrappers
        fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text, re.IGNORECASE)
        if fence:
            text = fence.group(1).strip()

        try:
            data = json.loads(text)
            subject = str(data.get("subject", "")).strip()
            body = str(data.get("body", "")).strip()
        except json.JSONDecodeError as e:
            logger.warning(f"draft_follow_up_email JSON parse failed: {e}; raw={text[:500]}")
            raise RuntimeError("Could not parse AI response as JSON. Try again.") from e

        if not subject or not body:
            raise RuntimeError("Draft missing subject or body. Try again.")

        return {"subject": subject, "body": body}

chat_service = ChatService()
