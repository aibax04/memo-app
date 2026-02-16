"""
Service layer for Speaker Profile operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import uuid
import logging

from api.models.speaker_profile import SpeakerProfile
from api.models.meeting import MeetingRecord
from api.schemas.speaker_profile import SpeakerProfileCreate, SpeakerProfileUpdate

logger = logging.getLogger(__name__)

def create_speaker_profile(
    db: Session, 
    profile_data: SpeakerProfileCreate, 
    user_id: int
) -> SpeakerProfile:
    """Create a new speaker profile for a user"""
    try:
        # Check if email already exists for this user (if email is provided)
        if profile_data.email:
            existing = db.query(SpeakerProfile).filter(
                SpeakerProfile.user_id == user_id,
                SpeakerProfile.email == profile_data.email
            ).first()
            
            if existing:
                raise ValueError(f"A speaker profile with email {profile_data.email} already exists")
        
        # Create new profile
        profile = SpeakerProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            first_name=profile_data.first_name,
            middle_name=profile_data.middle_name,
            last_name=profile_data.last_name,
            email=profile_data.email,
            phone=profile_data.phone,
            company=profile_data.company,
            designation=profile_data.designation
        )
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        logger.info(f"✅ Created speaker profile {profile.id} for user {user_id}")
        return profile
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating speaker profile: {e}")
        raise

def get_speaker_profiles(db: Session, user_id: int) -> List[SpeakerProfile]:
    """Get all speaker profiles for a user"""
    try:
        profiles = db.query(SpeakerProfile).filter(
            SpeakerProfile.user_id == user_id
        ).order_by(SpeakerProfile.first_name, SpeakerProfile.last_name).all()
        
        logger.info(f"📋 Retrieved {len(profiles)} speaker profiles for user {user_id}")
        return profiles
        
    except Exception as e:
        logger.error(f"❌ Error retrieving speaker profiles: {e}")
        raise

def get_speaker_profile_by_id(
    db: Session, 
    profile_id: uuid.UUID, 
    user_id: int
) -> Optional[SpeakerProfile]:
    """Get a single speaker profile by ID"""
    try:
        profile = db.query(SpeakerProfile).filter(
            SpeakerProfile.id == profile_id,
            SpeakerProfile.user_id == user_id
        ).first()
        
        if profile:
            logger.info(f"✅ Retrieved speaker profile {profile_id}")
        else:
            logger.warning(f"⚠️  Speaker profile {profile_id} not found for user {user_id}")
        
        return profile
        
    except Exception as e:
        logger.error(f"❌ Error retrieving speaker profile: {e}")
        raise

def update_speaker_profile(
    db: Session,
    profile_id: uuid.UUID,
    profile_data: SpeakerProfileUpdate,
    user_id: int
) -> Optional[SpeakerProfile]:
    """Update an existing speaker profile"""
    try:
        profile = get_speaker_profile_by_id(db, profile_id, user_id)
        
        if not profile:
            return None
        
        # Check if email is being changed and if it conflicts
        if profile_data.email and profile_data.email != profile.email:
            existing = db.query(SpeakerProfile).filter(
                SpeakerProfile.user_id == user_id,
                SpeakerProfile.email == profile_data.email,
                SpeakerProfile.id != profile_id
            ).first()
            
            if existing:
                raise ValueError(f"A speaker profile with email {profile_data.email} already exists")
        
        # Update fields if provided
        update_data = profile_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        db.commit()
        db.refresh(profile)
        
        logger.info(f"✅ Updated speaker profile {profile_id}")
        return profile
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating speaker profile: {e}")
        raise

def delete_speaker_profile(
    db: Session,
    profile_id: uuid.UUID,
    user_id: int
) -> bool:
    """Delete a speaker profile"""
    try:
        profile = get_speaker_profile_by_id(db, profile_id, user_id)
        
        if not profile:
            return False
        
        db.delete(profile)
        db.commit()
        
        logger.info(f"✅ Deleted speaker profile {profile_id}")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting speaker profile: {e}")
        raise

def map_speaker_to_profile(
    db: Session,
    speaker_name: str,
    profile_id: uuid.UUID,
    user_id: int
) -> int:
    """
    Map a speaker name to a profile across all meetings.
    Updates all meeting transcriptions where the speaker name appears.
    Returns the number of meetings updated.
    """
    try:
        # Verify profile exists and belongs to user
        profile = get_speaker_profile_by_id(db, profile_id, user_id)
        
        if not profile:
            raise ValueError(f"Speaker profile {profile_id} not found")
        
        # Get the new speaker name from profile
        new_speaker_name = profile.full_name
        
        logger.info(f"🔄 Mapping speaker '{speaker_name}' to '{new_speaker_name}' for user {user_id}")
        
        # Get all meetings for this user
        meetings = db.query(MeetingRecord).filter(
            MeetingRecord.user_id == user_id
        ).all()
        
        logger.info(f"🔍 Found {len(meetings)} total meetings for user {user_id}")
        
        meetings_updated = 0
        
        for meeting in meetings:
            if not meeting.transcription:
                logger.debug(f"⚠️  Meeting {meeting.id} has no transcription, skipping")
                continue
            
            # Parse transcription
            transcription_segments = meeting.transcription
            updated = False
            segments_updated = 0
            
            # Update speaker names in transcription segments
            for segment in transcription_segments:
                if isinstance(segment, dict) and segment.get('speaker') == speaker_name:
                    old_speaker = segment['speaker']
                    segment['speaker'] = new_speaker_name
                    segments_updated += 1
                    updated = True
            
            if updated:
                # Mark the transcription as modified so SQLAlchemy knows to update it
                from sqlalchemy.orm.attributes import flag_modified
                meeting.transcription = transcription_segments
                flag_modified(meeting, 'transcription')
                meetings_updated += 1
                logger.info(f"✅ Updated meeting {meeting.id}: {segments_updated} segments changed from '{speaker_name}' to '{new_speaker_name}'")
        
        db.commit()
        
        logger.info(f"✅ Updated {meetings_updated} meetings with new speaker name '{new_speaker_name}'")
        return meetings_updated
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error mapping speaker to profile: {e}")
        raise

def search_speaker_profiles(
    db: Session,
    query: str,
    user_id: int
) -> List[SpeakerProfile]:
    """Search speaker profiles by name, email, or company"""
    try:
        search_term = f"%{query}%"
        
        profiles = db.query(SpeakerProfile).filter(
            SpeakerProfile.user_id == user_id,
            or_(
                SpeakerProfile.first_name.ilike(search_term),
                SpeakerProfile.last_name.ilike(search_term),
                SpeakerProfile.email.ilike(search_term),
                SpeakerProfile.company.ilike(search_term)
            )
        ).order_by(SpeakerProfile.first_name, SpeakerProfile.last_name).all()
        
        logger.info(f"🔍 Found {len(profiles)} speaker profiles matching '{query}'")
        return profiles
        
    except Exception as e:
        logger.error(f"❌ Error searching speaker profiles: {e}")
        raise

