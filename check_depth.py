with open('/Users/admin/Desktop/memo-app/memwebapp/frontend/src/pages/MeetingDetail.tsx', 'r') as f:
    depth = 0
    for i, line in enumerate(f, 1):
        for char in line:
            if char == '(': depth += 1
            if char == ')': depth -= 1
        if depth < 0:
            print(f"Negative depth on line {i}: {depth}")
            break
    print(f"Final depth: {depth}")
