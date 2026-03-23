"""Build compact text context from a meeting for AI (chat, email draft, etc.)."""
import json
import logging
from typing import Optional

from api.models.meeting import MeetingRecord

logger = logging.getLogger(__name__)


def build_meeting_context_string(meeting: MeetingRecord, max_transcript_segments: int = 80) -> str:
    """Assemble title, summary, analytics, and transcript snippet for LLM context."""
    parts: list[str] = []
    if meeting.title:
        parts.append(f"Meeting Title: {meeting.title}")
    if meeting.summary:
        parts.append(f"Summary: {meeting.summary}")
    if meeting.key_points:
        parts.append(f"Key Points: {meeting.key_points}")
    if meeting.action_items:
        parts.append(f"Action Items: {json.dumps(meeting.action_items, indent=2)}")

    if meeting.analytics_data:
        try:
            parts.append(f"Analytics & Performance Data:\n{json.dumps(meeting.analytics_data, indent=2)}")
        except Exception:
            parts.append(f"Analytics: {str(meeting.analytics_data)[:4000]}")

    if meeting.transcription:
        trans_text = ""
        if isinstance(meeting.transcription, list):
            segments = []
            for s in meeting.transcription[:max_transcript_segments]:
                if isinstance(s, dict):
                    speaker = s.get("speaker", "Unknown")
                    text = s.get("text", "")
                    segments.append(f"{speaker}: {text}")
                else:
                    segments.append(str(s))
            trans_text = "\n".join(segments)
        else:
            trans_text = str(meeting.transcription)[:12000]

        parts.append(f"Transcript:\n{trans_text}")

    return "\n\n".join(parts) if parts else "No meeting content available."
