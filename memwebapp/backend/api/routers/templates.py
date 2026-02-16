from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import math

from database.connection import get_db
from api.schemas.template import (
    TemplateCreate, 
    TemplateUpdate, 
    TemplateResponse, 
    TemplateListResponse
)
from api.services.template_service import (
    create_template,
    get_template,
    get_templates,
    get_templates_count,
    update_template,
    delete_template,
    hard_delete_template,
    search_templates,
    search_templates_count,
    get_templates_with_filters,
    get_default_templates,
    get_user_templates,
    template_to_response_with_key_points
)
from api.services.auth_service import get_current_user
from api.models.user import User
from api.models.template import Template

router = APIRouter()

@router.post("/templates", response_model=TemplateResponse, status_code=201)
async def create_template_endpoint(
    template: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new template"""
    try:
        db_template = create_template(db, template, created_by=current_user.id)
        return template_to_response_with_key_points(db_template)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create template: {str(e)}")

@router.get("/templates", response_model=TemplateListResponse)
@router.get("/templates/", response_model=TemplateListResponse)  # Accept both with and without trailing slash
async def get_templates_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    active_only: bool = Query(True, description="Show only active templates"),
    include_default: bool = Query(True, description="Include default templates"),
    created_by: Optional[int] = Query(None, description="Filter by creator user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all templates with pagination and filtering"""
    try:
        skip = (page - 1) * limit
        
        # Use the current user's ID if created_by is not specified
        if created_by is None:
            created_by = current_user.id
        
        templates, total = get_templates_with_filters(
            db, 
            search=search, 
            active_only=active_only, 
            created_by=created_by,
            include_default=include_default,
            skip=skip, 
            limit=limit
        )
        
        # Convert templates to response format with key points
        templates_with_key_points = [template_to_response_with_key_points(template) for template in templates]
        
        total_pages = math.ceil(total / limit) if total > 0 else 1
        
        return TemplateListResponse(
            data=templates_with_key_points,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")

@router.get("/templates/default", response_model=TemplateListResponse)
async def get_default_templates_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    active_only: bool = Query(True, description="Show only active templates"),
    db: Session = Depends(get_db)
):
    """Get default templates (system templates)"""
    try:
        skip = (page - 1) * limit
        templates = get_default_templates(db, skip=skip, limit=limit, active_only=active_only)
        
        # Convert templates to response format with key points
        templates_with_key_points = [template_to_response_with_key_points(template) for template in templates]
        
        # Get total count for default templates
        total_query = db.query(Template).filter(Template.created_by.is_(None))
        if active_only:
            total_query = total_query.filter(Template.is_active == True)
        total = total_query.count()
        
        total_pages = math.ceil(total / limit) if total > 0 else 1
        
        return TemplateListResponse(
            data=templates_with_key_points,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch default templates: {str(e)}")

@router.get("/templates/my", response_model=TemplateListResponse)
async def get_my_templates_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    active_only: bool = Query(True, description="Show only active templates"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get templates created by the current user"""
    try:
        skip = (page - 1) * limit
        templates = get_user_templates(db, current_user.id, skip=skip, limit=limit, active_only=active_only)
        
        # Convert templates to response format with key points
        templates_with_key_points = [template_to_response_with_key_points(template) for template in templates]
        
        # Get total count for user templates
        total_query = db.query(Template).filter(Template.created_by == current_user.id)
        if active_only:
            total_query = total_query.filter(Template.is_active == True)
        total = total_query.count()
        
        total_pages = math.ceil(total / limit) if total > 0 else 1
        
        return TemplateListResponse(
            data=templates_with_key_points,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user templates: {str(e)}")

@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template_endpoint(
    template_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific template by ID"""
    try:
        template = get_template(db, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template_to_response_with_key_points(template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch template: {str(e)}")

@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template_endpoint(
    template_id: UUID,
    template: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a template (only if user owns it or it's a default template)"""
    try:
        db_template = get_template(db, template_id)
        if not db_template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check if user can modify this template
        if db_template.created_by is not None and db_template.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You can only modify your own templates")
        
        updated_template = update_template(db, template_id, template)
        return template_to_response_with_key_points(updated_template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")

@router.delete("/templates/{template_id}", status_code=204)
async def delete_template_endpoint(
    template_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete template"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a template (only if user owns it)"""
    try:
        db_template = get_template(db, template_id)
        if not db_template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check if user can delete this template
        if db_template.created_by is not None and db_template.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete your own templates")
        
        # Prevent deletion of default templates
        if db_template.created_by is None:
            raise HTTPException(status_code=403, detail="Cannot delete default templates")
        
        if hard_delete:
            success = hard_delete_template(db, template_id)
        else:
            success = delete_template(db, template_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")

@router.get("/templates/search", response_model=TemplateListResponse)
async def search_templates_endpoint(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    active_only: bool = Query(True, description="Show only active templates"),
    db: Session = Depends(get_db)
):
    """Search templates by title and description"""
    try:
        skip = (page - 1) * limit
        templates = search_templates(db, q, skip=skip, limit=limit, active_only=active_only)
        total = search_templates_count(db, q, active_only=active_only)
        
        # Convert templates to response format with key points
        templates_with_key_points = [template_to_response_with_key_points(template) for template in templates]
        
        total_pages = math.ceil(total / limit) if total > 0 else 1
        
        return TemplateListResponse(
            data=templates_with_key_points,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search templates: {str(e)}")

@router.patch("/templates/{template_id}/activate", response_model=TemplateResponse)
async def activate_template_endpoint(
    template_id: UUID,
    db: Session = Depends(get_db)
):
    """Activate a template"""
    try:
        template_update = TemplateUpdate(is_active=True)
        db_template = update_template(db, template_id, template_update)
        if not db_template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template_to_response_with_key_points(db_template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate template: {str(e)}")

@router.patch("/templates/{template_id}/deactivate", response_model=TemplateResponse)
async def deactivate_template_endpoint(
    template_id: UUID,
    db: Session = Depends(get_db)
):
    """Deactivate a template"""
    try:
        template_update = TemplateUpdate(is_active=False)
        db_template = update_template(db, template_id, template_update)
        if not db_template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template_to_response_with_key_points(db_template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate template: {str(e)}")
