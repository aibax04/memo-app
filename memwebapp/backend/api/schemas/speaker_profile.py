"""
Pydantic schemas for Speaker Profile operations
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re

class SpeakerProfileCreate(BaseModel):
    """Schema for creating a new speaker profile"""
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=15)
    company: Optional[str] = Field(None, max_length=200)
    designation: Optional[str] = Field(None, max_length=100)
    
    @validator('email')
    def validate_email(cls, v):
        if v is not None and v.strip():
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, v.strip()):
                raise ValueError('Invalid email format')
        return v.strip() if v else None
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None and v.strip():
            # Remove any non-digit characters for validation
            digits_only = re.sub(r'[^0-9]', '', v.strip())
            if len(digits_only) > 10:
                raise ValueError('Phone number cannot exceed 10 digits')
        return v.strip() if v else None

class SpeakerProfileUpdate(BaseModel):
    """Schema for updating an existing speaker profile"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=15)
    company: Optional[str] = Field(None, max_length=200)
    designation: Optional[str] = Field(None, max_length=100)
    
    @validator('email')
    def validate_email(cls, v):
        if v is not None and v.strip():
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, v.strip()):
                raise ValueError('Invalid email format')
        return v.strip() if v else None
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None and v.strip():
            # Remove any non-digit characters for validation
            digits_only = re.sub(r'[^0-9]', '', v.strip())
            if len(digits_only) > 10:
                raise ValueError('Phone number cannot exceed 10 digits')
        return v.strip() if v else None

class SpeakerProfileResponse(BaseModel):
    """Schema for speaker profile response"""
    id: str
    user_id: int
    first_name: str
    middle_name: Optional[str]
    last_name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    designation: Optional[str]
    full_name: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SpeakerNameMappingRequest(BaseModel):
    """Schema for mapping a speaker name to a profile"""
    speaker_name: str = Field(..., description="Current speaker name in meetings (e.g., 'Speaker 1')")
    profile_id: Optional[str] = Field(None, description="Speaker profile ID to map to (if linking to existing)")
    create_new: bool = Field(False, description="Whether to create a new profile")
    profile_data: Optional[SpeakerProfileCreate] = Field(None, description="Profile data if creating new")

class SpeakerNameMappingResponse(BaseModel):
    """Response for speaker name mapping operation"""
    success: bool
    message: str
    profile: SpeakerProfileResponse
    meetings_updated: int

