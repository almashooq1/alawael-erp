import os
import sys

print("🔍 فحص النظام...")

# فحص الملفات الأساسية
files_to_check = [
    'app.py',
    'models.py', 
    'ai_services.py',
    'templates/ai_programs_assessments.html',
    'static/js/ai_programs_assessments.js'
]

print("\n📁 فحص الملفات:")
for file in files_to_check:
    if os.path.exists(file):
        print(f"✅ {file}")
    else:
        print(f"❌ {file}")

# فحص المجلدات
dirs_to_check = ['templates', 'static', 'static/js', 'static/css']
print("\n📂 فحص المجلدات:")
for dir in dirs_to_check:
    if os.path.exists(dir):
        print(f"✅ {dir}")
    else:
        print(f"❌ {dir}")

print("\n✨ الفحص مكتمل!")
