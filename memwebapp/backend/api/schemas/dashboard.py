from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from api.schemas.chart import ChartResponse

class DashboardBase(BaseModel):
    title: str
    description: Optional[str] = None

class DashboardCreate(DashboardBase):
    pass

class DashboardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class DashboardResponse(DashboardBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # We can include charts directly if needed, but usually fetched separately
    # Or just metadata.
    charts: List[ChartResponse] = []

    class Config:
        from_attributes = True

class DashboardListResponse(BaseModel):
    items: List[DashboardResponse]
    total: int
    page: int
    size: int
