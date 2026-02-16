from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database.connection import get_db
from api.models.user import User
from api.models.dashboard import Dashboard
from api.models.chart import Chart
from api.schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardResponse, DashboardListResponse
from api.schemas.chart import ChartResponse
from api.services.auth_service import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboards", tags=["dashboards"])
filters_router = APIRouter(tags=["filters"])

@filters_router.get("/filters")
def get_filters(
    current_user: User = Depends(get_current_user)
):
    """Get available data filters for the sidebar.
    Returns an empty list for now — will be populated when data sources are configured."""
    return []

@router.post("/", response_model=DashboardResponse)
def create_dashboard(
    dashboard: DashboardCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new dashboard"""
    new_dashboard = Dashboard(
        title=dashboard.title,
        description=dashboard.description,
        user_id=current_user.id
    )
    db.add(new_dashboard)
    db.commit()
    db.refresh(new_dashboard)
    logger.info(f"✅ Dashboard created: {new_dashboard.title} (ID: {new_dashboard.id})")
    
    # Return response, charts defaults to empty list
    return new_dashboard

@router.get("/", response_model=List[DashboardResponse])
def get_dashboards(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List dashboards for the current user"""
    dashboards = db.query(Dashboard).filter(Dashboard.user_id == current_user.id).offset(skip).limit(limit).all()
    # Map charts to empty list if needed, or let Pydantic handle it via ORM
    return dashboards

@router.get("/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(
    dashboard_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific dashboard details"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    return dashboard

@router.put("/{dashboard_id}", response_model=DashboardResponse)
def update_dashboard(
    dashboard_id: int, 
    updates: DashboardUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a dashboard"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if updates.title is not None:
        dashboard.title = updates.title
    if updates.description is not None:
        dashboard.description = updates.description
        
    db.commit()
    db.refresh(dashboard)
    return dashboard

@router.patch("/{dashboard_id}")
def patch_dashboard(
    dashboard_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Partially update a dashboard (e.g. apply filters)"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    if "title" in updates:
        dashboard.title = updates["title"]
    if "description" in updates:
        dashboard.description = updates["description"]
    
    db.commit()
    db.refresh(dashboard)
    
    # Return with status so the frontend can poll if needed
    return {
        "id": dashboard.id,
        "title": dashboard.title,
        "description": dashboard.description,
        "status": "active",
        "filters": updates.get("filters", {})
    }

@router.delete("/{dashboard_id}")
def delete_dashboard(
    dashboard_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a dashboard"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    db.delete(dashboard)
    db.commit()
    return {"message": "Dashboard deleted"}

@router.get("/{dashboard_id}/charts", response_model=dict)
def get_dashboard_charts(
    dashboard_id: int,
    page: int = 1,
    limit: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get charts for a dashboard with pagination"""
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id, 
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    # Calculate offset
    skip = (page - 1) * limit
    
    total_charts = db.query(Chart).filter(Chart.dashboard_id == dashboard_id).count()
    charts = db.query(Chart).filter(Chart.dashboard_id == dashboard_id).offset(skip).limit(limit).all()
    
    import math
    total_pages = math.ceil(total_charts / limit)
    
    return {
        "charts": charts,
        "total_pages": total_pages,
        "current_page": page,
        "total_items": total_charts
    }
