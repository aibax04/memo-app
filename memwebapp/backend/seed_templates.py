"""
Seed default templates into the database.
Run this once to populate pre-built system templates.

Usage:
    python seed_templates.py
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal
from api.models.template import Template

DEFAULT_TEMPLATES = [
    {
        "title": "General Meeting",
        "description": "Standard meeting template suitable for any type of meeting. Captures key discussion points, decisions, and action items.",
        "transcription_prompt": "Transcribe the meeting accurately. Identify different speakers where possible. Use proper punctuation and paragraph breaks for readability.",
        "summary_prompt": "Provide a concise summary of the meeting covering: main topics discussed, key decisions made, and overall outcomes. Keep it professional and structured.",
        "key_points_prompt": ["Main Topics Discussed", "Key Decisions", "Action Items", "Follow-Up Required", "Participants & Roles"],
        "speaker_diarization": "Identify speakers by their roles or names if mentioned. Label unknown speakers as Speaker 1, Speaker 2, etc.",
    },
    {
        "title": "Sales Discovery Call",
        "description": "Optimised for sales discovery calls. Extracts budget, timeline, decision-makers, and pain points for CRM integration.",
        "transcription_prompt": "Transcribe the sales call with attention to customer pain points, questions, and objections. Capture exact quotes where possible.",
        "summary_prompt": "Summarise this sales discovery call focusing on: prospect's needs and pain points, budget indicators, timeline expectations, decision-making process, and competitive mentions. Structure the output for easy CRM entry.",
        "key_points_prompt": ["Customer Pain Points", "Budget Discussion", "Timeline & Urgency", "Decision Makers", "Next Steps", "Competitive Mentions", "Product Interest Areas"],
        "speaker_diarization": "Label the sales representative and the prospect/customer. If multiple people are on the customer side, identify their roles.",
    },
    {
        "title": "Technical Specification",
        "description": "Deep dive into technical requirements, architecture, and implementation details. Ideal for engineering and product syncs.",
        "transcription_prompt": "Transcribe the technical discussion with high precision for terminology, variable names, and architectural concepts. Maintain context for complex logic.",
        "summary_prompt": "Generate a technical briefing: identify the core problem being solved, list specific architectural decisions, detail security/performance considerations, and map out the implementation roadmap with technical dependencies.",
        "key_points_prompt": ["Problem Statement", "Architectural Decisions", "Technical Requirements", "Implementation Plan", "Performance & Security", "Dependencies & Risks", "API/Schema Changes"],
        "speaker_diarization": "Identify lead architects, developers, and product owners. Group technical feedback by domain expertise.",
    },
    {
        "title": "Executive Briefing",
        "description": "High-level strategic summary for leadership. Focuses on ROI, KPIs, and major milestones.",
        "transcription_prompt": "Transcribe the meeting with focus on strategic goals, financial impact, and major organizational decisions. Filter out low-level operational noise.",
        "summary_prompt": "Provide an executive-level summary: highlight the 3 most important strategic takeaways, quantify impacts where possible, list major approvals granted, and specify high-level next steps with assigned owners.",
        "key_points_prompt": ["Strategic Objectives", "KPI Impact", "Major Announcements", "Approvals & Decisons", "Resource Allocation", "CEO/Leadership Directives", "Next Major Milestone"],
        "speaker_diarization": "Identify executives and stakeholders by title. Focus on capturing directives and final decisions.",
    },
    {
        "title": "Customer Success Sync",
        "description": "Focus on account health, product adoption, and roadmap alignment. Designed for recurring client check-ins.",
        "transcription_prompt": "Transcribe the client sync. Capture 'Voice of the Customer' feedback, feature requests, and any frustration or delight indicators.",
        "summary_prompt": "Summarize account health: state current sentiment, list requested features with priority, document roadmap alignment discussions, and identify any churn risks or expansion opportunities.",
        "key_points_prompt": ["Account Health Score", "Customer Sentiment", "Top Feature Requests", "Roadmap Alignment", "Upcoming Renewals", "Expansion Opportunities", "Action Items for CS"],
        "speaker_diarization": "Label the CSM, Account Executive, and Client stakeholders. Identify the person raising each concern or request.",
    },
    {
        "title": "Acknowledge (Awareness & Compliance)",
        "description": "Specialized for meetings requiring clear acknowledgement of terms, safety briefings, or compliance steps.",
        "transcription_prompt": "Focus on capturing explicit 'YES' or 'I AGREE' statements. Transcribe compliance steps and safety instructions with verbatim accuracy.",
        "summary_prompt": "Generate a compliance report: list all items that were explicitly acknowledged, document any questions raised about terms, and note the time-stamps of formal agreements.",
        "key_points_prompt": ["Terms Acknowledged", "Compliance Status", "Safety Protocols Discussed", "Verbal Agreements", "Follow-up Documentation", "Audit Trail Points"],
        "speaker_diarization": "Clearly identify the presenter of terms and each individual respondent.",
    },
    {
        "title": "Simplii (Quick Summary)",
        "description": "Ultra-concise template for rapid review. Just the facts, no fluff.",
        "transcription_prompt": "Transcribe for brevity. Focus on the core message while discarding filler words and repetitive phrases.",
        "summary_prompt": "Provide a bulleted list of only the essential facts: Who, What, When, Where, and Why. Maximum 5 sentences total.",
        "key_points_prompt": ["Main Takeaway", "Key Deadline", "Primary Owner", "Immediate Next Step"],
        "speaker_diarization": "Group only by internal vs external speakers.",
    },
    {
        "title": "Product Brainstorm",
        "description": "Creative ideation and brainstorming session template. Captures ideas, votes, and feature priorities.",
        "transcription_prompt": "Transcribe the brainstorming session. Capture all ideas mentioned, even brief ones. Note any voting or prioritisation discussions.",
        "summary_prompt": "Summarise the brainstorming session listing: all ideas proposed (grouped by theme), top-voted or most-discussed ideas, feasibility concerns raised, and agreed next steps for each idea.",
        "key_points_prompt": ["Ideas Proposed", "Top Voted Ideas", "Feasibility Concerns", "User Impact", "Technical Complexity", "Next Steps"],
        "speaker_diarization": "Attribute each idea to the person who proposed it.",
    },
]

def seed_templates():
    """Seed default templates into the database if they don't already exist."""
    from database.connection import engine
    from database.base import Base
    import api.models.user
    import api.models.template
    import api.models.meeting
    import api.models.speaker_profile
    import api.models.chart
    import api.models.dashboard
    
    # Create tables if they don't exist
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_count = db.query(Template).filter(Template.created_by.is_(None)).count()
        if existing_count >= len(DEFAULT_TEMPLATES):
            print(f"Already have {existing_count} default templates. Skipping seed.")
            return

        added = 0
        for tmpl_data in DEFAULT_TEMPLATES:
            # Check if a template with this exact title already exists as a default
            exists = db.query(Template).filter(
                Template.title == tmpl_data["title"],
                Template.created_by.is_(None)
            ).first()

            if exists:
                print(f"  Skipping '{tmpl_data['title']}' — already exists")
                continue

            template = Template(
                title=tmpl_data["title"],
                description=tmpl_data["description"],
                transcription_prompt=tmpl_data["transcription_prompt"],
                summary_prompt=tmpl_data["summary_prompt"],
                key_points_prompt=tmpl_data["key_points_prompt"],
                speaker_diarization=tmpl_data["speaker_diarization"],
                created_by=None,  # NULL = system/default template
                is_active=True,
            )
            db.add(template)
            added += 1
            print(f"  + Added '{tmpl_data['title']}'")

        db.commit()
        print(f"\nDone! Added {added} default templates.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding templates: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_templates()
