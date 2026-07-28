"""
Buyer / Consumer Intent Analysis Service
-----------------------------------------
Analyses a meeting transcript with Gemini to extract:
  • Meeting type classification (intro / follow-up / sales demo / tech demo / negotiation)
  • Buyer emotional arc   (interested → hesitant → convinced, etc.)
  • Purchase readiness score  (0-100)
  • Key buying signals & red flags
  • Question quality analysis  (focused vs irregular / off-topic)
  • Per-participant emotional breakdown
  • Follow-up recommendation
"""

import google.generativeai as genai
import json
import logging
import re
from typing import Dict, Any, Optional

from config.settings import settings
from api.services.meeting_context_builder import build_meeting_context_string

logger = logging.getLogger(__name__)

BUYER_INTENT_PROMPT = r"""You are an elite sales-intelligence analyst.
Analyse the meeting transcript / summary below and return ONLY valid JSON (no markdown code fences, no commentary) that conforms EXACTLY to this schema:

{
  "meeting_type": "<one of: introductory | follow_up | sales_demo | tech_demo | negotiation | general>",
  "meeting_type_confidence": <0-100>,

  "purchase_readiness": <0-100 overall score>,
  "purchase_readiness_label": "<one of: not_ready | exploring | interested | strongly_interested | ready_to_buy>",

  "emotional_arc": [
    {"phase": "<opening | discovery | presentation | objection | closing>", "emotion": "<string>", "intensity": <1-10>, "note": "<1 sentence>"}
  ],

  "buyer_signals": [
    {"type": "<positive | negative | neutral>", "signal": "<short description>", "quote": "<verbatim or near-verbatim snippet>", "weight": <1-10>}
  ],

  "question_analysis": {
    "total_questions": <int>,
    "focused_questions": <int>,
    "irregular_questions": <int>,
    "top_concerns": ["<string>"],
    "off_topic_flags": ["<string>"],
    "curiosity_score": <0-100>
  },

  "participant_emotions": [
    {"name": "<speaker name>", "role_guess": "<seller | buyer | technical | observer | unknown>",
     "dominant_emotion": "<string>", "engagement_level": <0-100>,
     "interest_trend": "<rising | stable | declining | mixed>",
     "key_moments": ["<1-sentence moment>"]}
  ],

  "tone_summary": "<2-3 sentence overall tone description>",

  "follow_up_recommendation": {
    "priority": "<high | medium | low>",
    "suggested_action": "<1-2 sentences>",
    "timing": "<string e.g. 'within 24 hours'>",
    "risk_level": "<low | medium | high>"
  },

  "deal_health": {
    "score": <0-100>,
    "label": "<cold | warming | warm | hot | closed>",
    "blockers": ["<string>"],
    "accelerators": ["<string>"]
  }
}

Rules:
- emotional_arc should have 2-6 entries following the conversation flow.
- buyer_signals: list the strongest 3-8 signals. Positive = buying cues, Negative = disinterest / objections.
- question_analysis.irregular_questions = questions clearly off-topic or diversionary (sign of disengagement).
- If the meeting does not appear to be a sales / pitch context, still fill out every field with your best assessment; set meeting_type to "general".
- Do NOT invent facts. If data is insufficient for a field, use sensible defaults (0, "unknown", empty arrays).

Meeting context:
---
<<CONTEXT>>
---
"""


class BuyerIntentService:
    def __init__(self):
        self.model = None
        if settings.GEMINI_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_KEY)
                self.model = genai.GenerativeModel("gemini-flash-latest")
                logger.info("BuyerIntentService: Gemini initialized")
            except Exception as e:
                logger.error(f"BuyerIntentService init failed: {e}")
        else:
            logger.warning("BuyerIntentService: GEMINI_KEY missing")

    async def analyse(self, meeting_context: str) -> Dict[str, Any]:
        if not self.model:
            raise RuntimeError("AI service not configured (GEMINI_KEY)")

        ctx = meeting_context[:18000] if len(meeting_context) > 18000 else meeting_context
        prompt = BUYER_INTENT_PROMPT.replace("<<CONTEXT>>", ctx)

        try:
            resp = self.model.generate_content(prompt)
            text = (resp.text or "").strip()
        except Exception as e:
            logger.error(f"BuyerIntentService generate_content error: {e}")
            raise RuntimeError(str(e)) from e

        fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text, re.IGNORECASE)
        if fence:
            text = fence.group(1).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"BuyerIntentService JSON parse error: {e}; raw={text[:600]}")
            raise RuntimeError("Could not parse AI response. Try again.") from e

        return data


buyer_intent_service = BuyerIntentService()
