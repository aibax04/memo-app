with open('/Users/admin/Desktop/memo-app/memwebapp/frontend/src/pages/MeetingDetail.tsx', 'r') as f:
    stack = []
    line_num = 0
    for line in f:
        line_num += 1
        for char in line:
            if char in '({[':
                stack.append((char, line_num))
            elif char in ')}]':
                if not stack:
                    print(f"Extra closing {char} on line {line_num}")
                    continue
                last_char, last_line = stack.pop()
                if (char == ')' and last_char != '(') or                    (char == '}' and last_char != '{') or                    (char == ']' and last_char != '['):
                    print(f"Mismatch: {last_char} on {last_line} closed by {char} on {line_num}")
    for char, line in stack:
        print(f"Unclosed {char} on line {line}")
