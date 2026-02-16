import sqlite3
import urllib.request
import json
import uuid

BASE_URL = "http://localhost:8000"

def make_req(url, data):
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    req.data = json.dumps(data).encode()
    try:
        with urllib.request.urlopen(req) as r:
            return r.getcode()
    except urllib.error.HTTPError as e:
        return e.code

print("Creating user...")
code = make_req(f"{BASE_URL}/users/", {"email": "repair@gmail.com", "password": "password", "name": "Repair"})
print(f"Create User Resp: {code}")

print("Connecting to DB...")
conn = sqlite3.connect('meeting_records.db') 
cursor = conn.cursor()

cursor.execute("SELECT id FROM users WHERE email='repair@gmail.com'")
row = cursor.fetchone()
if not row:
    print("User not found!")
    exit(1)
user_id = row[0]
print(f"User ID: {user_id}")

MEETING_ID = "445240b0-9d5b-4fc9-ae68-fb32b8c59453" # Dashed
cursor.execute("UPDATE meeting_records SET user_id=? WHERE id=?", (user_id, MEETING_ID))
print(f"Updated dashed: {cursor.rowcount}")

if cursor.rowcount == 0:
    nodash = MEETING_ID.replace("-", "")
    cursor.execute("UPDATE meeting_records SET user_id=? WHERE id=?", (user_id, nodash))
    print(f"Updated nodash: {cursor.rowcount}")

conn.commit()
conn.close()
