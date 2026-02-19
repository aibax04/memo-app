from serpapi import GoogleSearch
import re
from collections import Counter

def extract_person_name(image_url):
    params = {
        "engine": "google_reverse_image",
        "image_url": image_url,
        "api_key": os.getenv("SERPAPI_API_KEY") # Load from environment variable
    }
    
    search = GoogleSearch(params)
    results = search.get_dict()
    
    if "image_results" not in results:
        print("No image results found")
        return None
    
    # Extract names from titles and snippets
    names = []
    
    for result in results["image_results"]:
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        
        # Look for common name patterns (First Last format)
        name_patterns = [
            r'\b([A-Z][a-z]+ [A-Z][a-z]+)\b',  # First Last
            r'\b([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)\b',  # First M. Last
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, title + " " + snippet)
            names.extend(matches)
    
    if not names:
        print("No clear person name found in the search results")
        return None
    
    # Count frequency of names and return the most common
    name_counts = Counter(names)
    most_common_name = name_counts.most_common(1)[0][0]
    
    print(f"Most likely person in the image: {most_common_name}")
    print(f"Confidence: {name_counts[most_common_name]} mentions")
    
    return most_common_name

# Example usage - you can change this URL to any image
image_url = "https://www.gettyimages.com/photos/sudhanshu-mittal"
person_name = extract_person_name(image_url)