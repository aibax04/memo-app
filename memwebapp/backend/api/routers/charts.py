from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database.connection import get_db
from api.models.user import User
from api.models.dashboard import Dashboard
from api.models.chart import Chart
from api.schemas.chart import ChartCreate, ChartUpdate, ChartResponse
from api.services.auth_service import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/charts", tags=["charts"])

@router.post("/", response_model=ChartResponse)
def create_chart(
    chart: ChartCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chart"""
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == chart.dashboard_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    new_chart = Chart(
        title=chart.title,
        chart_type=chart.chart_type,
        config=chart.config,
        dashboard_id=chart.dashboard_id
    )
    db.add(new_chart)
    db.commit()
    db.refresh(new_chart)
    
    return new_chart

@router.get("/{chart_id}", response_model=ChartResponse)
def get_chart(
    chart_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chart details"""
    # Join with Dashboard to verify user ownership
    chart = db.query(Chart).join(Dashboard).filter(
        Chart.id == chart_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
        
    return chart

@router.put("/{chart_id}", response_model=ChartResponse)
def update_chart(
    chart_id: int, 
    updates: ChartUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chart"""
    # Join with Dashboard to verify user ownership
    chart = db.query(Chart).join(Dashboard).filter(
        Chart.id == chart_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
        
    if updates.title is not None:
        chart.title = updates.title
    if updates.chart_type is not None:
        chart.chart_type = updates.chart_type
    if updates.config is not None:
        chart.config = updates.config
        
    db.commit()
    db.refresh(chart)
    return chart

@router.delete("/{chart_id}")
def delete_chart(
    chart_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chart"""
    # Join with Dashboard to verify user ownership
    chart = db.query(Chart).join(Dashboard).filter(
        Chart.id == chart_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
        
    db.delete(chart)
    db.commit()
    return {"message": "Chart deleted"}
