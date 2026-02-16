from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = "User"

class UserResponse(BaseModel):

    id: int
    name: str
    email: str
    is_active: bool
    auth_provider: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
