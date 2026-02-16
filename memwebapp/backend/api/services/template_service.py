from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Tuple
from uuid import UUID
from api.models.template import Template
from api.schemas.template import TemplateCreate, TemplateUpdate

def template_to_response_with_key_points(template: Template) -> dict:
    """Convert template to response format with key points"""
    import json
    
    # Parse key_points_prompt from JSON string to list
    key_points_prompt = template.key_points_prompt
    if isinstance(key_points_prompt, str):
        try:
            key_points_prompt = json.loads(key_points_prompt)
        except (json.JSONDecodeError, TypeError):
            key_points_prompt = []
    elif key_points_prompt is None:
        key_points_prompt = []
    
    return {
        "id": template.id,
        "title": template.title,
        "description": template.description,
        "transcription_prompt": template.transcription_prompt,
        "summary_prompt": template.summary_prompt,
        "key_points_prompt": key_points_prompt,
        "key_points": key_points_prompt,  # Same as key_points_prompt for backward compatibility
        "created_by": template.created_by,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "is_active": template.is_active
    }

def create_template(db: Session, template: TemplateCreate, created_by: Optional[int] = None) -> Template:
    """Create a new template"""
    db_template = Template(
        title=template.title,
        description=template.description,
        transcription_prompt=template.transcription_prompt,
        summary_prompt=template.summary_prompt,
        key_points_prompt=template.key_points_prompt,
        speaker_diarization=template.speaker_diarization,
        created_by=created_by
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

def get_template(db: Session, template_id: UUID) -> Optional[Template]:
    """Get a template by ID"""
    return db.query(Template).filter(Template.id == template_id).first()

def get_template_by_title(db: Session, title: str) -> Optional[Template]:
    """Get a template by title"""
    return db.query(Template).filter(Template.title == title).first()



def get_templates(db: Session, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Template]:
    """Get all templates with pagination"""
    query = db.query(Template)
    if active_only:
        query = query.filter(Template.is_active == True)
    return query.offset(skip).limit(limit).all()

def get_templates_count(db: Session, active_only: bool = True) -> int:
    """Get total count of templates"""
    query = db.query(Template)
    if active_only:
        query = query.filter(Template.is_active == True)
    return query.count()

def update_template(db: Session, template_id: UUID, template: TemplateUpdate) -> Optional[Template]:
    """Update a template"""
    db_template = get_template(db, template_id)
    if not db_template:
        return None
    
    update_data = template.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_template, field, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

def delete_template(db: Session, template_id: UUID) -> bool:
    """Soft delete a template by setting is_active to False"""
    db_template = get_template(db, template_id)
    if not db_template:
        return False
    
    db_template.is_active = False
    db.commit()
    return True

def hard_delete_template(db: Session, template_id: UUID) -> bool:
    """Permanently delete a template from database"""
    db_template = get_template(db, template_id)
    if not db_template:
        return False
    
    db.delete(db_template)
    db.commit()
    return True

def search_templates(db: Session, query: str, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Template]:
    """Search templates by title or description"""
    search_query = db.query(Template).filter(
        or_(
            Template.title.contains(query),
            Template.description.contains(query)
        )
    )
    if active_only:
        search_query = search_query.filter(Template.is_active == True)
    return search_query.offset(skip).limit(limit).all()

def search_templates_count(db: Session, query: str, active_only: bool = True) -> int:
    """Get count of search results"""
    search_query = db.query(Template).filter(
        or_(
            Template.title.contains(query),
            Template.description.contains(query)
        )
    )
    if active_only:
        search_query = search_query.filter(Template.is_active == True)
    return search_query.count()

def get_templates_with_filters(
    db: Session, 
    search: Optional[str] = None,
    active_only: bool = True,
    created_by: Optional[int] = None,
    include_default: bool = True,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Template], int]:
    """Get templates with comprehensive filtering and return total count"""
    query = db.query(Template)
    
    # Apply active filter
    if active_only:
        query = query.filter(Template.is_active == True)
    
    # Apply created_by filter
    if created_by is not None:
        if include_default:
            # Include both user templates and default templates (created_by is NULL)
            query = query.filter(
                or_(
                    Template.created_by == created_by,
                    Template.created_by.is_(None)
                )
            )
        else:
            # Only user templates
            query = query.filter(Template.created_by == created_by)
    elif not include_default:
        # Only user-created templates (exclude default templates)
        query = query.filter(Template.created_by.isnot(None))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Template.title.ilike(search_term),
                Template.description.ilike(search_term)
            )
        )
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    templates = query.order_by(Template.created_at.desc()).offset(skip).limit(limit).all()
    
    return templates, total

def get_default_templates(db: Session, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Template]:
    """Get default templates (created_by is NULL)"""
    query = db.query(Template).filter(Template.created_by.is_(None))
    if active_only:
        query = query.filter(Template.is_active == True)
    return query.offset(skip).limit(limit).all()

def get_user_templates(db: Session, user_id: int, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Template]:
    """Get templates created by a specific user"""
    query = db.query(Template).filter(Template.created_by == user_id)
    if active_only:
        query = query.filter(Template.is_active == True)
    return query.offset(skip).limit(limit).all()