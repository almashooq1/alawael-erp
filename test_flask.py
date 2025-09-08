#!/usr/bin/env python3
"""Test Flask application import"""

try:
    print("Testing Flask application import...")
    import app
    print("SUCCESS: Flask app imported without errors")
    
    if hasattr(app, 'app'):
        print("SUCCESS: Flask app instance found")
    else:
        print("WARNING: Flask app instance not found")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
