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
        "title": "Sprint Standup",
        "description": "Quick daily standup format. Captures what was done, what's planned, and any blockers for each team member.",
        "transcription_prompt": "Transcribe the standup meeting. Focus on capturing each person's update clearly and concisely.",
        "summary_prompt": "Summarise each participant's standup update in three categories: Yesterday's accomplishments, Today's plan, and Blockers. Format as a structured list per participant.",
        "key_points_prompt": ["Completed Yesterday", "Planned Today", "Blockers & Dependencies", "Sprint Risks"],
        "speaker_diarization": "Identify each team member by name. List their individual updates separately.",
    },
    {
        "title": "Client Review / QBR",
        "description": "Quarterly Business Review template. Tracks deliverables, satisfaction, upcoming renewals, and strategic priorities.",
        "transcription_prompt": "Transcribe the client review meeting with focus on performance discussions, feedback, and strategic planning topics.",
        "summary_prompt": "Provide a structured QBR summary including: account health assessment, key achievements reviewed, client feedback and satisfaction level, upcoming deliverables and timelines, renewal/expansion opportunities, and risk areas.",
        "key_points_prompt": ["Account Health", "Key Achievements", "Client Feedback", "Upcoming Deliverables", "Renewal Discussion", "Expansion Opportunities", "Risk Areas"],
        "speaker_diarization": "Identify the internal team members and the client-side participants. Note their titles when mentioned.",
    },
    {
        "title": "Product Brainstorm",
        "description": "Creative ideation and brainstorming session template. Captures ideas, votes, and feature priorities.",
        "transcription_prompt": "Transcribe the brainstorming session. Capture all ideas mentioned, even brief ones. Note any voting or prioritisation discussions.",
        "summary_prompt": "Summarise the brainstorming session listing: all ideas proposed (grouped by theme), top-voted or most-discussed ideas, feasibility concerns raised, and agreed next steps for each idea.",
        "key_points_prompt": ["Ideas Proposed", "Top Voted Ideas", "Feasibility Concerns", "User Impact", "Technical Complexity", "Next Steps"],
        "speaker_diarization": "Attribute each idea to the person who proposed it.",
    },
    {
        "title": "Interview Debrief",
        "description": "Post-interview evaluation template. Captures candidate assessment, strengths, concerns, and hiring recommendation.",
        "transcription_prompt": "Transcribe the interview debrief discussion. Pay special attention to assessments, scores, and specific examples mentioned.",
        "summary_prompt": "Provide a structured interview debrief summary with: candidate name, role applied for, overall assessment, technical/skill evaluation, cultural fit assessment, strengths highlighted, concerns raised, and the hiring recommendation.",
        "key_points_prompt": ["Overall Assessment", "Technical Skills", "Cultural Fit", "Strengths", "Concerns", "Hiring Recommendation", "Compensation Discussion"],
        "speaker_diarization": "Identify the interviewers and their specific feedback.",
    },
    {
        "title": "Project Kickoff",
        "description": "New project kickoff meeting template. Captures scope, milestones, roles, and success criteria.",
        "transcription_prompt": "Transcribe the project kickoff meeting with focus on scope definitions, role assignments, and milestone discussions.",
        "summary_prompt": "Summarise the project kickoff covering: project objectives and scope, team roles and responsibilities, key milestones and deadlines, success criteria, risks identified, and communication plan.",
        "key_points_prompt": ["Project Objectives", "Scope & Deliverables", "Team Roles", "Milestones & Timeline", "Success Criteria", "Identified Risks", "Communication Plan"],
        "speaker_diarization": "Identify the project manager, stakeholders, and team leads. Map each person to their assigned responsibilities.",
    },
    {
        "title": "One-on-One",
        "description": "Manager-report one-on-one template. Tracks goals, feedback, career development, and support needs.",
        "transcription_prompt": "Transcribe the one-on-one meeting. Capture both the manager's and the report's perspectives distinctly.",
        "summary_prompt": "Summarise the one-on-one meeting including: progress on current goals, feedback shared (both directions), career development topics discussed, blockers and support needed, and agreed action items.",
        "key_points_prompt": ["Goal Progress", "Feedback Given", "Feedback Received", "Career Development", "Blockers & Support Needed", "Action Items", "Wellbeing Check"],
        "speaker_diarization": "Identify the manager and the direct report. Clearly separate their contributions.",
    },
]


def seed_templates():
    """Seed default templates into the database if they don't already exist."""
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
