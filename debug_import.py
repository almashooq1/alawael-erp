#!/usr/bin/env python3
"""Debug import issues"""

import sys
import traceback

def test_imports():
    """Test individual imports to find the issue"""
    
    try:
        print("1. Testing database import...")
        from database import db
        print("✅ Database import successful")
    except Exception as e:
        print(f"❌ Database import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        print("2. Testing models import...")
        from models import User
        print("✅ Models import successful")
    except Exception as e:
        print(f"❌ Models import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        print("3. Testing comprehensive rehabilitation models import...")
        from comprehensive_rehabilitation_models import RehabilitationBeneficiary
        print("✅ Comprehensive rehabilitation models import successful")
    except Exception as e:
        print(f"❌ Comprehensive rehabilitation models import failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        print("4. Testing security models import...")
        from security_models import SecurityConfig
        print("✅ Security models import successful")
    except Exception as e:
        print(f"❌ Security models import failed: {e}")
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = test_imports()
    if success:
        print("\n✅ All imports successful!")
    else:
        print("\n❌ Some imports failed!")
    sys.exit(0 if success else 1)
