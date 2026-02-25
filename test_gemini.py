import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('memwebapp/backend/.env')

gemini_key = os.getenv("GEMINI_KEY")
genai.configure(api_key=gemini_key)

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error testing Gemini model: {e}")
