from api.services.background_transcription_service import background_service

def test_duration_calculation():
    # Test case 1: Short meeting (14 seconds)
    transcription_short = [
        {"end": "00:00:14.220"}
    ]
    duration = background_service._calculate_duration_from_transcription(transcription_short)
    print(f"Short meeting (14s): {duration} minutes")
    assert duration == 1, f"Expected 1 minute, got {duration}"

    # Test case 2: 30 seconds
    transcription_30s = [
        {"end": "00:00:30.000"}
    ]
    duration = background_service._calculate_duration_from_transcription(transcription_30s)
    print(f"30s meeting: {duration} minutes")
    assert duration == 1, f"Expected 1 minute, got {duration}"

    # Test case 3: 1 minute 1 second
    transcription_61s = [
        {"end": "00:01:01.000"}
    ]
    duration = background_service._calculate_duration_from_transcription(transcription_61s)
    print(f"61s meeting: {duration} minutes")
    assert duration == 2, f"Expected 2 minutes, got {duration}"

    print("✅ All duration tests passed!")

if __name__ == "__main__":
    test_duration_calculation()
