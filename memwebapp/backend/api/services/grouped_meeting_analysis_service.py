"""
Combined AI analysis across multiple meetings (Gemini).
"""
import json
import logging
import re
from typing import Any, Dict, List
from uuid import UUID

import google.generativeai as genai
from sqlalchemy.orm import Session

from api.models.meeting import MeetingRecord
from api.services.meeting_context_builder import build_meeting_context_string
from config.settings import settings

logger = logging.getLogger(__name__)

GROUPED_ANALYSIS_PROMPT = r"""You are a senior revenue and customer-intelligence analyst.
The user has selected MULTIPLE related meetings (summaries, key points, analytics, transcript excerpts).
Produce ONE combined analysis. Return ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{
  "executive_summary": "<2-4 short paragraphs in plain text, use \\n\\n between paragraphs>",

  "themes_across_meetings": [
    {"theme": "<string>", "evidence": "<1-2 sentences>", "meetings_referenced": ["<meeting title or 'Untitled'>"]}
  ],

  "timeline_and_progression": "<how the situation evolved across meetings, 1-3 paragraphs>",

  "consolidated_action_items": [
    {"task": "<string>", "owner_guess": "<string or unknown>", "priority": "<high | medium | low>", "related_meeting": "<title hint>"}
  ],

  "risks_and_gaps": ["<string>"],
  "opportunities": ["<string>"],
  "recommended_next_steps": ["<string>"],

  "per_meeting_highlights": [
    {"meeting_title": "<string>", "one_line": "<key takeaway>"}
  ]
}

Rules:
- Cross-reference meetings by title when possible.
- De-duplicate actions that appear in multiple meetings; merge wording.
- If transcripts are thin, rely on summaries and state uncertainty briefly in executive_summary.
- Fill every key; use empty arrays only if truly nothing applies.
- Do NOT invent specific numbers or quotes not present in the context.

Combined meeting context:
---
<<CONTEXT>>
---
"""


class GroupedMeetingAnalysisService:
    def __init__(self) -> None:
        self.model = None
        if settings.GEMINI_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_KEY)
                self.model = genai.GenerativeModel("gemini-flash-latest")
                logger.info("GroupedMeetingAnalysisService: Gemini initialized")
            except Exception as e:
                logger.error(f"GroupedMeetingAnalysisService init failed: {e}")
        else:
            logger.warning("GroupedMeetingAnalysisService: GEMINI_KEY missing")

    def _build_combined_context(self, meetings: List[MeetingRecord], max_per_meeting: int = 8000) -> str:
        chunks: List[str] = []
        total_budget = 28000
        used = 0
        for i, m in enumerate(meetings, start=1):
            block = build_meeting_context_string(m, max_transcript_segments=50)
            header = f"======== MEETING {i}: {m.title or 'Untitled'} (id={m.id}, date={m.created_at}) ========"
            piece = f"{header}\n\n{block}"
            if len(piece) > max_per_meeting:
                piece = piece[:max_per_meeting] + "\n\n[... truncated ...]"
            if used + len(piece) > total_budget:
                remaining = total_budget - used - 200
                if remaining > 500:
                    piece = piece[:remaining] + "\n\n[... truncated ...]"
                else:
                    break
            chunks.append(piece)
            used += len(piece)
        return "\n\n".join(chunks) if chunks else "No meeting content available."

    async def analyse(self, db: Session, user_id: int, meeting_ids: List[UUID]) -> Dict[str, Any]:
        if not self.model:
            raise RuntimeError("AI service not configured (GEMINI_KEY)")

        unique_ids = list({UUID(str(x)) for x in meeting_ids})
        meetings: List[MeetingRecord] = []
        for mid in unique_ids:
            row = (
                db.query(MeetingRecord)
                .filter(MeetingRecord.id == mid, MeetingRecord.user_id == user_id)
                .first()
            )
            if row:
                meetings.append(row)

        meetings.sort(key=lambda m: m.created_at or m.id)

        if len(meetings) < 2:
            raise ValueError("At least two valid meetings belonging to you are required.")

        combined = self._build_combined_context(meetings)
        prompt = GROUPED_ANALYSIS_PROMPT.replace("<<CONTEXT>>", combined)

        try:
            resp = self.model.generate_content(prompt)
            text = (resp.text or "").strip()
        except Exception as e:
            logger.error(f"GroupedMeetingAnalysisService generate_content error: {e}")
            raise RuntimeError(str(e)) from e

        fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text, re.IGNORECASE)
        if fence:
            text = fence.group(1).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"GroupedMeetingAnalysisService JSON parse error: {e}; raw={text[:800]}")
            raise RuntimeError("Could not parse AI response. Try again.") from e

        return data


grouped_meeting_analysis_service = GroupedMeetingAnalysisService()
