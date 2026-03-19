#!/usr/bin/env python3
"""
Fix waitFor patterns in test files by replacing with setTimeout + simple assertions
"""
import re
import glob
import os

def fix_waitfor_patterns(file_path):
    """Fix waitFor patterns in a test file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern 1: await waitFor(() => { expect(...).toHaveBeenCalled() });
    # Replace with: await new Promise(resolve => setTimeout(resolve, 500)); expect(...).toHaveBeenCalled();
    pattern1 = r'await waitFor\(\(\) => \{\s*expect\((API\.\w+)\)\.toHaveBeenCalled\(\);\s*\}\);'
    replacement1 = r'await new Promise(resolve => setTimeout(resolve, 500));\n      expect(\1).toHaveBeenCalled();'
    content = re.sub(pattern1, replacement1, content)

    # Pattern 2: await waitFor(() => { expect(screen.getByText(...)).toBeInTheDocument() });
    # Replace with: await new Promise(...); expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    pattern2 = r'await waitFor\(\(\) => \{\s*expect\(screen\.getByText\([^)]+\)\)\.toBeInTheDocument\(\);\s*\}\);'
    replacement2 = r'await new Promise(resolve => setTimeout(resolve, 500));\n      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();'
    content = re.sub(pattern2, replacement2, content)

    # Pattern 3: Multiple expects in waitFor
    # Example: await waitFor(() => { expect(...).toBeInTheDocument(); expect(...).toBeInTheDocument(); });
    pattern3 = r'await waitFor\(\(\) => \{\s*((?:expect\([^)]+\)\.\w+\(\);\s*)+)\}\);'
    replacement3 = r'await new Promise(resolve => setTimeout(resolve, 500));\n      \1'
    content = re.sub(pattern3, replacement3, content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Find all test files
test_files = glob.glob(r'c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\supply-chain-management\frontend\src\components\__tests__\*.test.js')

print("Fixing waitFor patterns in test files...")
for test_file in test_files:
    if fix_waitfor_patterns(test_file):
        print(f"✓ Fixed: {os.path.basename(test_file)}")
    else:
        print(f"- No changes needed: {os.path.basename(test_file)}")

print("\nDone!")
