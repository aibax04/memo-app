#!/usr/bin/env python3
"""
Test script for the background transcription service
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal
from api.models.meeting import MeetingRecord, TranscriptionStatus
from api.models.speaker_profile import SpeakerProfile
from api.services.background_transcription_service import background_service
import time

def test_background_service():
    """Test the background transcription service"""
    print("🧪 Testing Background Transcription Service")
    print("=" * 50)
    
    # Get initial status
    print("📊 Initial Status:")
    status = background_service.get_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    print()
    
    # Start the service
    print("🚀 Starting background service...")
    background_service.start()
    time.sleep(2)  # Give it time to start
    
    # Check status after starting
    print("📊 Status after starting:")
    status = background_service.get_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    print()
    
    # Let it run for a bit
    print("⏳ Letting service run for 10 seconds...")
    time.sleep(10)
    
    # Check status again
    print("📊 Status after running:")
    status = background_service.get_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    print()
    
    # Test manual processing
    print("🔄 Testing manual processing...")
    result = background_service.process_all_pending()
    print(f"   Result: {result}")
    print()
    
    # Stop the service
    print("🛑 Stopping background service...")
    background_service.stop()
    time.sleep(2)  # Give it time to stop
    
    # Verify duration was saved (check for completed meetings)
    print("✅ Verifying duration...")
    db = SessionLocal()
    completed_meetings = db.query(MeetingRecord).filter(
        MeetingRecord.status == TranscriptionStatus.COMPLETED
    ).limit(5).all()
    
    found_duration = False
    for meeting in completed_meetings:
        print(f"   Meeting {meeting.id}: Duration = {meeting.duration}")
        if meeting.duration is not None:
            found_duration = True
            
    if found_duration:
        print("   ✅ Found meetings with duration saved!")
    else:
        print("   ⚠️ No meetings with duration found (this might be expected if no new meetings processed)")
    db.close()
    print()
    
    # Final status
    print("📊 Final Status:")
    status = background_service.get_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    print()
    
    print("✅ Test completed!")

if __name__ == "__main__":
    test_background_service()

