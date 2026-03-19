#!/usr/bin/env python3
"""Quick script to add eslint-disable to test files"""
import os
import glob

# Directory to process
test_dir = r"c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\__tests__"

# Find all .test.js files
for filepath in glob.glob(os.path.join(test_dir, "*.test.js")):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file already has eslint-disable
    if 'eslint-disable' in content:
        continue

    # Add eslint-disable comment at the beginning
    if content.startswith('/**'):
        # Comment block format
        lines = content.split('\n', 1)
        new_content = '/* eslint-disable no-undef */\n' + lines[0] + '\n' + (lines[1] if len(lines) > 1 else '')
    else:
        new_content = '/* eslint-disable no-undef */\n' + content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Fixed: {os.path.basename(filepath)}")

print("Done!")
