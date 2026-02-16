#!/usr/bin/env python3
"""
Migration script to convert key_points_prompt from string to list format.
This script converts existing string-based key points prompts to list format.
"""

import sys
import os
import re
from typing import List, Optional

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from api.models.template import Template
from sqlalchemy.orm import Session

def extract_key_points_from_string(key_points_prompt: str) -> List[str]:
    """Extract key points from the old string format"""
    if not key_points_prompt:
        return []
    
    # Look for bullet points or numbered lists after "extract" or "extract the key points"
    lines = key_points_prompt.split('\n')
    key_points = []
    
    # Flag to start collecting points after we find the extraction instruction
    collecting = False
    
    for line in lines:
        line = line.strip()
        
        # Check if this line contains extraction instruction
        if 'extract' in line.lower() and any(phrase in line.lower() for phrase in ['key points', 'key insights', 'main discussion points', 'main points', 'key discussion points']):
            collecting = True
            continue
            
        # If we're collecting and the line is not empty
        if collecting and line:
            # Match lines starting with bullet points, dashes, or numbers
            if re.match(r'^[\-\*\•]\s+', line) or re.match(r'^\d+\.\s+', line):
                # Remove bullet point or number prefix
                clean_line = re.sub(r'^[\-\*\•]\s+', '', line)
                clean_line = re.sub(r'^\d+\.\s+', '', clean_line)
                if clean_line.strip():
                    key_points.append(clean_line.strip())
            # Also match lines that are indented (sub-points)
            elif line.startswith('  ') or line.startswith('\t'):
                clean_line = line.strip()
                if clean_line:
                    key_points.append(clean_line)
            # Match any non-empty line that doesn't start with common prompt words
            elif not any(word in line.lower() for word in ['please', 'this is', 'transcription', 'generate', 'write', 'return', 'output']):
                key_points.append(line)
    
    # If no points were extracted using the above method, try a simpler approach
    if not key_points:
        # Look for any lines that seem like key points (not starting with common prompt words)
        for line in lines:
            line = line.strip()
            if line and not any(word in line.lower() for word in ['please', 'this is', 'transcription', 'generate', 'write', 'return', 'output', 'extract', 'including']):
                # Remove common prefixes
                clean_line = re.sub(r'^[\-\*\•]\s+', '', line)
                clean_line = re.sub(r'^\d+\.\s+', '', clean_line)
                if clean_line.strip():
                    key_points.append(clean_line.strip())
    
    return key_points

def migrate_keypoints_to_list():
    """Migrate all templates to use list format for key_points_prompt"""
    print("🔄 Starting migration of key_points_prompt from string to list format...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get all templates
        templates = db.query(Template).all()
        print(f"📋 Found {len(templates)} templates to migrate")
        
        migrated_count = 0
        
        for template in templates:
            if template.key_points_prompt:
                # Check if it's already a list (from previous migration)
                if isinstance(template.key_points_prompt, list):
                    print(f"✅ Template '{template.title}' already has list format")
                    continue
                
                # Convert string to list
                if isinstance(template.key_points_prompt, str):
                    key_points_list = extract_key_points_from_string(template.key_points_prompt)
                    
                    if key_points_list:
                        template.key_points_prompt = key_points_list
                        migrated_count += 1
                        print(f"✅ Migrated template '{template.title}': {len(key_points_list)} key points")
                        print(f"   Key points: {key_points_list}")
                    else:
                        # Fallback to default key points if extraction failed
                        template.key_points_prompt = [
                            "Main topics discussed",
                            "Key decisions made",
                            "Important points raised",
                            "Action items or next steps",
                            "Critical insights",
                            "Overall outcomes"
                        ]
                        migrated_count += 1
                        print(f"⚠️  Template '{template.title}' - extraction failed, using default key points")
        
        # Commit changes
        db.commit()
        print(f"🎉 Migration completed! Migrated {migrated_count} templates")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_keypoints_to_list()
