"""
CRM Router - Mobile endpoints for speaker search and CRM features
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from database.connection import get_db
from api.models.user import User
from api.services.auth_service import get_current_user
from api.services.meeting_service import (
    search_meetings_by_speaker,
    get_unique_speakers,
    convert_meeting_to_response_format
)
from api.services.speaker_profile_service import (
    create_speaker_profile,
    get_speaker_profiles,
    get_speaker_profile_by_id,
    update_speaker_profile,
    delete_speaker_profile,
    map_speaker_to_profile,
    search_speaker_profiles
)
from api.schemas.meeting import Meeting, PaginatedMeetingsResponse
from api.schemas.speaker_profile import (
    SpeakerProfileCreate,
    SpeakerProfileUpdate,
    SpeakerProfileResponse,
    SpeakerNameMappingRequest,
    SpeakerNameMappingResponse
)
from pydantic import BaseModel
import logging

# Configure logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mobile/crm", tags=["CRM"])


class SpeakerProfileInfo(BaseModel):
    """Speaker profile information"""
    id: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None

class SpeakerInfo(BaseModel):
    """Speaker information with meeting count"""
    speaker_name: str
    meeting_count: int
    profile: Optional[SpeakerProfileInfo] = None


class SpeakersResponse(BaseModel):
    """Response for speakers list"""
    speakers: List[SpeakerInfo]
    total: int


@router.get("/speakers", response_model=SpeakersResponse)
async def get_all_speakers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all unique speakers across user's meetings
    Returns list of speakers with their meeting count
    """
    logger.info(f"📋 GET ALL SPEAKERS - User: {current_user.name} ({current_user.email})")
    
    try:
        speakers = get_unique_speakers(db=db, user_id=current_user.id)
        
        logger.info(f"✅ Found {len(speakers)} unique speakers for user {current_user.id}")
        
        return SpeakersResponse(
            speakers=speakers,
            total=len(speakers)
        )
    except Exception as e:
        logger.error(f"❌ Error retrieving speakers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving speakers: {str(e)}")


@router.get("/speakers/search", response_model=SpeakersResponse)
async def search_speakers(
    query: str = Query(..., min_length=1, description="Search query for speaker name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for speakers by name
    Returns speakers that match the search query
    """
    logger.info(f"🔍 SEARCH SPEAKERS - User: {current_user.name}, Query: '{query}'")
    
    try:
        # Get all speakers
        all_speakers = get_unique_speakers(db=db, user_id=current_user.id)
        
        # Filter speakers by search query (case-insensitive)
        query_lower = query.lower()
        matching_speakers = [
            speaker for speaker in all_speakers
            if query_lower in speaker['speaker_name'].lower()
        ]
        
        logger.info(f"✅ Found {len(matching_speakers)} speakers matching '{query}'")
        
        return SpeakersResponse(
            speakers=matching_speakers,
            total=len(matching_speakers)
        )
    except Exception as e:
        logger.error(f"❌ Error searching speakers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching speakers: {str(e)}")


@router.get("/speakers/{speaker_name}/meetings", response_model=PaginatedMeetingsResponse)
async def get_meetings_by_speaker(
    speaker_name: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(100, ge=1, le=1000, description="Number of meetings per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all meetings where a specific speaker participated
    Returns meetings in chronological order with full details
    """
    logger.info(f"📋 GET MEETINGS BY SPEAKER - User: {current_user.name}, Speaker: '{speaker_name}'")
    logger.info(f"📄 Pagination - Page: {page}, Limit: {limit}")
    
    try:
        # Calculate skip value
        skip = (page - 1) * limit
        
        # Search meetings by speaker
        meetings, total = search_meetings_by_speaker(
            db=db,
            user_id=current_user.id,
            speaker_name=speaker_name,
            skip=skip,
            limit=limit
        )
        
        # Convert meetings to response format
        meeting_data = [convert_meeting_to_response_format(meeting) for meeting in meetings]
        
        # Calculate total pages
        total_pages = (total + limit - 1) // limit
        
        logger.info(f"✅ Retrieved {len(meetings)} meetings out of {total} total for speaker '{speaker_name}'")
        logger.info(f"📊 Page {page} of {total_pages} total pages")
        
        return PaginatedMeetingsResponse(
            data=meeting_data,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"❌ Error retrieving meetings for speaker '{speaker_name}': {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving meetings for speaker: {str(e)}"
        )


# ==================== Speaker Profile Endpoints ====================

@router.post("/speaker-profiles", response_model=SpeakerProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_speaker_profile_endpoint(
    profile_data: SpeakerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new speaker profile
    """
    logger.info(f"📝 CREATE SPEAKER PROFILE - User: {current_user.name}")
    
    try:
        profile = create_speaker_profile(db=db, profile_data=profile_data, user_id=current_user.id)
        
        logger.info(f"✅ Created speaker profile {profile.id}")
        
        # Convert to response format
        return SpeakerProfileResponse(
            id=str(profile.id),
            user_id=profile.user_id,
            first_name=profile.first_name,
            middle_name=profile.middle_name,
            last_name=profile.last_name,
            email=profile.email,
            phone=profile.phone,
            company=profile.company,
            designation=profile.designation,
            full_name=profile.full_name,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        )
    except ValueError as e:
        logger.warning(f"⚠️  Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error creating speaker profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating speaker profile: {str(e)}")


@router.get("/speaker-profiles", response_model=List[SpeakerProfileResponse])
async def get_speaker_profiles_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all speaker profiles for the current user
    """
    logger.info(f"📋 GET SPEAKER PROFILES - User: {current_user.name}")
    
    try:
        profiles = get_speaker_profiles(db=db, user_id=current_user.id)
        
        logger.info(f"✅ Retrieved {len(profiles)} speaker profiles")
        
        return [
            SpeakerProfileResponse(
                id=str(profile.id),
                user_id=profile.user_id,
                first_name=profile.first_name,
                middle_name=profile.middle_name,
                last_name=profile.last_name,
                email=profile.email,
                phone=profile.phone,
                company=profile.company,
                designation=profile.designation,
                full_name=profile.full_name,
                created_at=profile.created_at,
                updated_at=profile.updated_at
            )
            for profile in profiles
        ]
    except Exception as e:
        logger.error(f"❌ Error retrieving speaker profiles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving speaker profiles: {str(e)}")


@router.get("/speaker-profiles/search", response_model=List[SpeakerProfileResponse])
async def search_speaker_profiles_endpoint(
    query: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search speaker profiles by name, email, or company
    """
    logger.info(f"🔍 SEARCH SPEAKER PROFILES - User: {current_user.name}, Query: '{query}'")
    
    try:
        profiles = search_speaker_profiles(db=db, query=query, user_id=current_user.id)
        
        logger.info(f"✅ Found {len(profiles)} matching profiles")
        
        return [
            SpeakerProfileResponse(
                id=str(profile.id),
                user_id=profile.user_id,
                first_name=profile.first_name,
                middle_name=profile.middle_name,
                last_name=profile.last_name,
                email=profile.email,
                phone=profile.phone,
                company=profile.company,
                designation=profile.designation,
                full_name=profile.full_name,
                created_at=profile.created_at,
                updated_at=profile.updated_at
            )
            for profile in profiles
        ]
    except Exception as e:
        logger.error(f"❌ Error searching speaker profiles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching speaker profiles: {str(e)}")


@router.get("/speaker-profiles/{profile_id}", response_model=SpeakerProfileResponse)
async def get_speaker_profile_endpoint(
    profile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single speaker profile by ID
    """
    logger.info(f"📋 GET SPEAKER PROFILE - User: {current_user.name}, ID: {profile_id}")
    
    try:
        profile_uuid = uuid.UUID(profile_id)
        profile = get_speaker_profile_by_id(db=db, profile_id=profile_uuid, user_id=current_user.id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Speaker profile not found")
        
        return SpeakerProfileResponse(
            id=str(profile.id),
            user_id=profile.user_id,
            first_name=profile.first_name,
            middle_name=profile.middle_name,
            last_name=profile.last_name,
            email=profile.email,
            phone=profile.phone,
            company=profile.company,
            designation=profile.designation,
            full_name=profile.full_name,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid profile ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving speaker profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving speaker profile: {str(e)}")


@router.put("/speaker-profiles/{profile_id}", response_model=SpeakerProfileResponse)
async def update_speaker_profile_endpoint(
    profile_id: str,
    profile_data: SpeakerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing speaker profile
    """
    logger.info(f"✏️  UPDATE SPEAKER PROFILE - User: {current_user.name}, ID: {profile_id}")
    
    try:
        profile_uuid = uuid.UUID(profile_id)
        profile = update_speaker_profile(
            db=db,
            profile_id=profile_uuid,
            profile_data=profile_data,
            user_id=current_user.id
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Speaker profile not found")
        
        logger.info(f"✅ Updated speaker profile {profile_id}")
        
        return SpeakerProfileResponse(
            id=str(profile.id),
            user_id=profile.user_id,
            first_name=profile.first_name,
            middle_name=profile.middle_name,
            last_name=profile.last_name,
            email=profile.email,
            phone=profile.phone,
            company=profile.company,
            designation=profile.designation,
            full_name=profile.full_name,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        )
    except ValueError as e:
        if "Invalid" in str(e) or "format" in str(e):
            raise HTTPException(status_code=400, detail="Invalid profile ID format")
        logger.warning(f"⚠️  Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating speaker profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating speaker profile: {str(e)}")


@router.delete("/speaker-profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_speaker_profile_endpoint(
    profile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a speaker profile
    """
    logger.info(f"🗑️  DELETE SPEAKER PROFILE - User: {current_user.name}, ID: {profile_id}")
    
    try:
        profile_uuid = uuid.UUID(profile_id)
        success = delete_speaker_profile(db=db, profile_id=profile_uuid, user_id=current_user.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Speaker profile not found")
        
        logger.info(f"✅ Deleted speaker profile {profile_id}")
        return None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid profile ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting speaker profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting speaker profile: {str(e)}")


@router.post("/speaker-profiles/map", response_model=SpeakerNameMappingResponse)
async def map_speaker_name_endpoint(
    mapping_request: SpeakerNameMappingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Map a speaker name to a profile (either existing or create new).
    This updates all historical meetings with the new speaker name.
    """
    logger.info(f"🔗 MAP SPEAKER NAME - User: {current_user.name}, Speaker: '{mapping_request.speaker_name}'")
    
    try:
        profile = None
        
        # Create new profile or use existing
        if mapping_request.create_new and mapping_request.profile_data:
            profile = create_speaker_profile(
                db=db,
                profile_data=mapping_request.profile_data,
                user_id=current_user.id
            )
            logger.info(f"✅ Created new profile {profile.id}")
        elif mapping_request.profile_id:
            profile_uuid = uuid.UUID(mapping_request.profile_id)
            profile = get_speaker_profile_by_id(db=db, profile_id=profile_uuid, user_id=current_user.id)
            
            if not profile:
                raise HTTPException(status_code=404, detail="Speaker profile not found")
        else:
            raise HTTPException(status_code=400, detail="Must provide either profile_id or create_new with profile_data")
        
        # Map speaker name to profile across all meetings
        meetings_updated = map_speaker_to_profile(
            db=db,
            speaker_name=mapping_request.speaker_name,
            profile_id=profile.id,
            user_id=current_user.id
        )
        
        logger.info(f"✅ Mapped speaker '{mapping_request.speaker_name}' to profile {profile.id}, updated {meetings_updated} meetings")
        
        return SpeakerNameMappingResponse(
            success=True,
            message=f"Successfully mapped speaker to profile. Updated {meetings_updated} meeting(s).",
            profile=SpeakerProfileResponse(
                id=str(profile.id),
                user_id=profile.user_id,
                first_name=profile.first_name,
                middle_name=profile.middle_name,
                last_name=profile.last_name,
                email=profile.email,
                phone=profile.phone,
                company=profile.company,
                designation=profile.designation,
                full_name=profile.full_name,
                created_at=profile.created_at,
                updated_at=profile.updated_at
            ),
            meetings_updated=meetings_updated
        )
    except ValueError as e:
        logger.warning(f"⚠️  Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error mapping speaker name: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error mapping speaker name: {str(e)}")

