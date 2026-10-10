import re

def remove_comments_and_strings(text):
    # Remove single line comments
    text = re.sub(r'//.*', '', text)
    # Remove multiline comments
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    # Remove strings
    text = re.sub(r'"([^"\\]|\\.)*"', '""', text)
    text = re.sub(r"'([^'\\]|\\.)*'", "''", text)
    text = re.sub(r'`([^`\\]|\\.)*`', '``', text)
    # Remove regex literals (basic heuristic)
    text = re.sub(r'/(?!/|\*)[^/\n]+/[gimsuy]*', '', text)
    return text

with open('app.js', 'r') as f:
    text = f.read()

clean_text = remove_comments_and_strings(text)

stack = []
for i, line in enumerate(clean_text.split('\n')):
    for char in line:
        if char in '{[(': stack.append((char, i+1))
        elif char in '}])':
            if not stack:
                print(f"Unmatched {char} at line {i+1}")
                exit(1)
            top, top_line = stack.pop()
            if (top == '{' and char != '}') or \
               (top == '[' and char != ']') or \
               (top == '(' and char != ')'):
                print(f"Mismatched {top} (line {top_line}) and {char} (line {i+1})")
                exit(1)

if stack:
    top, top_line = stack.pop()
    print(f"Unclosed {top} from line {top_line}")
else:
    print("OK")
