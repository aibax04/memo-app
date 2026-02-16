
import re

def _extract_speaker_names_from_transcription(transcription):
    speaker_mapping = {}
    name_patterns = [
        # English patterns
        r"hi,?\s*i'?m\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "Hi, I'm John, and..." or "Hi, I'm John"
        r"hello,?\s*i'?m\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "Hello, I'm John, and..." or "Hello, I'm John"
        r"my\s+name\s+is\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "My name is Sarah, and..." or "My name is Sarah"
        r"i'?m\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "I'm John, and..." or "I'm John"
        r"this\s+is\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "This is John, and..." or "This is John"
        r"call\s+me\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "Call me John, and..." or "Call me John"
        r"you\s+can\s+call\s+me\s+([a-zA-Z]+)(?:,|\s+and|\s+the|\s*$|\.)",  # "You can call me John, and..." or "You can call me John"
        r"([a-zA-Z]+)\s+here", # "John here"
        r"speaking\s+is\s+([a-zA-Z]+)", # "Speaking is John"
        # Hindi/Hinglish patterns
        r"mera\s+naam\s+([a-zA-Z]+)\s+hai",  # "Mera naam Suryanshu hai"
        r"mera\s+naam\s+hai\s+([a-zA-Z]+)",  # "Mera naam hai Suryanshu"
        r"main\s+([a-zA-Z]+)\s+hoon",  # "Main Suryanshu hoon"
        r"mai\s+([a-zA-Z]+)\s+hun",  # "Mai Suryanshu hun"
        r"naam\s+([a-zA-Z]+)\s+hai",  # "Naam Suryanshu hai"
    ]
    
    speaker_introductions = {}
    
    for segment in transcription:
        text = segment['text'].lower()
        speaker = segment['speaker']
        
        for pattern in name_patterns:
            matches = re.findall(pattern, text)
            for name in matches:
                if name and len(name) > 1:
                    speaker_introductions[speaker] = name.capitalize()
                    break
    
    return speaker_introductions

# Test cases
test_transcript = [
    {"speaker": "speaker1", "text": "Hi, I'm John and I'll be leading the meeting today."},
    {"speaker": "speaker2", "text": "Hello, my name is Sarah. Nice to meet you John."},
    {"speaker": "speaker3", "text": "Mera naam Suryanshu hai."},
    {"speaker": "speaker4", "text": "This is Michael speaking."},
]

mapping = _extract_speaker_names_from_transcription(test_transcript)
print(mapping)
