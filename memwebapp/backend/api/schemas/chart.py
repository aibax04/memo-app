from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime

class ChartBase(BaseModel):
    title: str
    chart_type: str = "bar"
    config: Optional[Dict[str, Any]] = None

class ChartCreate(ChartBase):
    dashboard_id: int

class ChartUpdate(BaseModel):
    title: Optional[str] = None
    chart_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class ChartResponse(ChartBase):
    id: int
    dashboard_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChartListResponse(BaseModel):
    charts: List[ChartResponse]
