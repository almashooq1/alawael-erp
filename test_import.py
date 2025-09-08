#!/usr/bin/env python3
"""
Simple test script to verify Flask application can be imported without errors
"""

import sys
import traceback

def test_flask_import():
    """Test if the Flask application can be imported successfully"""
    try:
        print("Testing Flask application import...")
        
        # Try to import the main app module
        import app
        print("✅ SUCCESS: Flask app imported without errors")
        
        # Try to access the Flask app instance
        if hasattr(app, 'app'):
            print("✅ SUCCESS: Flask app instance found")
        else:
            print("⚠️  WARNING: Flask app instance not found")
            
        return True
        
    except ImportError as e:
        print(f"❌ IMPORT ERROR: {e}")
        print("This usually indicates missing dependencies or circular imports")
        traceback.print_exc()
        return False
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_flask_import()
    sys.exit(0 if success else 1)
