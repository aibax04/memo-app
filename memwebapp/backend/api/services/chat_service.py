import google.generativeai as genai
import logging
import os
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

chat_service = ChatService()
