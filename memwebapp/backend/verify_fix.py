import urllib.request
import urllib.parse
import json
import time
import sys

BASE_URL = "http://localhost:8000/api/v1/web"
ROOT_URL = "http://localhost:8000"
MEETING_ID = "445240b0-9d5b-4fc9-ae68-fb32b8c59453"

def make_request(url, method="GET", data=None, headers={}):
    try:
        req = urllib.request.Request(url, method=method)
        try:
            for k, v in headers.items():
                req.add_header(k, v)
        except:
            pass
            
        if data:
            req.data = urllib.parse.urlencode(data).encode()
        
        with urllib.request.urlopen(req) as resp:
            return resp.getcode(), resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        print(f"Request Error: {e}")
        return 0, str(e)

print(f"[{time.strftime('%H:%M:%S')}] Attempting login...")
for i in range(30):
    # Try multiple token paths just in case
    code, body = make_request(f"{ROOT_URL}/token", "POST", {"username": "repair@gmail.com", "password": "password"})
    if code != 200:
        # Fallback to /api/v1/web/token logic if configured differently elsewhere
        code, body = make_request(f"{BASE_URL}/token", "POST", {"username": "repair@gmail.com", "password": "password"})
        
    if code == 200:
        break
    if i % 5 == 0:
        print(f"[{time.strftime('%H:%M:%S')}] Waiting for server...")
    time.sleep(2)

if 'code' not in locals() or code != 200:
    print(f"Login failed: {code} - {body if 'body' in locals() else 'None'}")
    sys.exit(1)

token = json.loads(body)["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"[{time.strftime('%H:%M:%S')}] Logged in.")

print(f"[{time.strftime('%H:%M:%S')}] Triggering finalize for {MEETING_ID}...")
code, body = make_request(f"{BASE_URL}/stream/finalize/{MEETING_ID}", "POST", headers=headers)
print(f"Finalize response: {code} - {body}")

print(f"[{time.strftime('%H:%M:%S')}] Polling status...")
for i in range(60):
    time.sleep(5)
    code, body = make_request(f"{BASE_URL}/meetings/{MEETING_ID}", "GET", headers=headers)
    if code == 200:
        data = json.loads(body)
        status = data.get("status")
        analytics = data.get("analytics_status")
        if i % 2 == 0:
            print(f"[{time.strftime('%H:%M:%S')}] Attempt {i+1}: Status={status}, Analytics={analytics}")
        
        if status == "completed":
            print("SUCCESS! Meeting completed.")
            print(f"Duration: {data.get('duration')}")
            # Verify audio URL
            code, body = make_request(f"{BASE_URL}/meetings/{MEETING_ID}/audio/url", "GET", headers=headers)
            print(f"Audio URL Resp: {code} - {body}")
            break
        if status == "failed":
             print("FAILED! Meeting status is failed.")
             break
    else:
        print(f"Get meeting failed: {code}")
