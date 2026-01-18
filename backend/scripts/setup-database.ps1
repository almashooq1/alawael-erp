# ============================================
# MongoDB Setup Script - سكريبت إعداد قاعدة البيانات
# ============================================

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "║   🎯 إعداد قاعدة البيانات - Database Setup              ║" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================
# الخطوة 1: اختيار نوع قاعدة البيانات
# ============================================
Write-Host "الخطوة 1: اختر نوع قاعدة البيانات`n" -ForegroundColor Yellow

Write-Host "  [1] MongoDB Atlas (مجاني، موصى به) ⭐" -ForegroundColor Green
Write-Host "      - 512 MB مجاني" -ForegroundColor Gray
Write-Host "      - إعداد سريع (5 دقائق)" -ForegroundColor Gray
Write-Host "      - عالمي ومستقر`n" -ForegroundColor Gray

Write-Host "  [2] Hostinger MongoDB" -ForegroundColor Yellow
Write-Host "      - لديك استضافة" -ForegroundColor Gray
Write-Host "      - يحتاج إعداد`n" -ForegroundColor Gray

Write-Host "  [3] MongoDB محلي (Local)" -ForegroundColor Cyan
Write-Host "      - يحتاج تثبيت MongoDB`n" -ForegroundColor Gray

Write-Host "  [4] الخروج" -ForegroundColor Red

$choice = Read-Host "`nاختر رقم (1-4)"

switch ($choice) {
    "1" {
        # ============================================
        # MongoDB Atlas
        # ============================================
        Write-Host "`n✅ اخترت MongoDB Atlas (ممتاز!)`n" -ForegroundColor Green
        
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 2: إنشاء حساب MongoDB Atlas`n" -ForegroundColor Yellow
        Write-Host "  1. افتح: https://www.mongodb.com/cloud/atlas/register" -ForegroundColor White
        Write-Host "  2. سجل بـ Google أو Email" -ForegroundColor White
        Write-Host "  3. اختر: FREE (M0 Sandbox)"`n -ForegroundColor White
        
        Read-Host "اضغط Enter عندما تنتهي من التسجيل..."
        
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 3: إنشاء Cluster`n" -ForegroundColor Yellow
        Write-Host "  1. اسم Cluster: alawael-erp" -ForegroundColor White
        Write-Host "  2. Provider: AWS" -ForegroundColor White
        Write-Host "  3. Region: eu-central-1 (Frankfurt)" -ForegroundColor White
        Write-Host "  4. Tier: M0 Sandbox (FREE)"`n -ForegroundColor White
        
        Read-Host "اضغط Enter عندما يصبح Cluster جاهزاً (2-3 دقائق)..."
        
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 4: إنشاء مستخدم قاعدة البيانات`n" -ForegroundColor Yellow
        Write-Host "  1. اذهب إلى: Database Access" -ForegroundColor White
        Write-Host "  2. Add New Database User" -ForegroundColor White
        Write-Host "  3. Username: alawael_admin" -ForegroundColor White
        Write-Host "  4. Password: (اختر كلمة مرور قوية)"`n -ForegroundColor White
        
        $dbUser = Read-Host "أدخل Username (افتراضي: alawael_admin)"
        if ([string]::IsNullOrWhiteSpace($dbUser)) {
            $dbUser = "alawael_admin"
        }
        
        $dbPassword = Read-Host "أدخل Password" -AsSecureString
        $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
        
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 5: إعداد IP Whitelist`n" -ForegroundColor Yellow
        Write-Host "  1. اذهب إلى: Network Access" -ForegroundColor White
        Write-Host "  2. Add IP Address" -ForegroundColor White
        Write-Host "  3. أضف: 0.0.0.0/0 (للسماح من أي مكان)"`n -ForegroundColor White
        
        Read-Host "اضغط Enter عندما تنتهي..."
        
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 6: الحصول على Connection String`n" -ForegroundColor Yellow
        Write-Host "  1. اذهب إلى: Databases → Connect" -ForegroundColor White
        Write-Host "  2. اختر: Connect your application" -ForegroundColor White
        Write-Host "  3. Driver: Node.js" -ForegroundColor White
        Write-Host "  4. Version: 5.5 or later" -ForegroundColor White
        Write-Host "  5. انسخ الرابط (يبدأ بـ mongodb+srv://)"`n -ForegroundColor White
        
        $mongoUri = Read-Host "الصق الرابط هنا"
        
        # استبدال <password>
        $mongoUri = $mongoUri -replace "<password>", $dbPasswordPlain
        $mongoUri = $mongoUri -replace "<username>", $dbUser
        
        # إضافة database name إذا لم يكن موجود
        if ($mongoUri -notmatch "mongodb\.net/[\w-]+\?") {
            $mongoUri = $mongoUri -replace "mongodb\.net/\?", "mongodb.net/alawael-erp?"
        }
        
        # ============================================
        # تحديث .env
        # ============================================
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 7: تحديث ملف .env`n" -ForegroundColor Yellow
        
        $envPath = "..\\.env"
        $envContent = Get-Content $envPath -Raw
        
        # تحديث MONGODB_URI
        $envContent = $envContent -replace "MONGODB_URI=.*", "MONGODB_URI=$mongoUri"
        
        # تحديث USE_MOCK_DB
        $envContent = $envContent -replace "USE_MOCK_DB=true", "USE_MOCK_DB=false"
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        
        Write-Host "  ✅ تم تحديث .env بنجاح!`n" -ForegroundColor Green
        
        # ============================================
        # اختبار الاتصال
        # ============================================
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "الخطوة 8: اختبار الاتصال`n" -ForegroundColor Yellow
        
        Write-Host "  جاري الاتصال بقاعدة البيانات..." -ForegroundColor Cyan
        
        # Test connection
        $testScript = @"
require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(() => {
    console.log('✅ الاتصال نجح!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ فشل الاتصال:', err.message);
    process.exit(1);
  });
"@
        
        Set-Content -Path "test-connection.js" -Value $testScript
        
        $result = node test-connection.js
        Write-Host "  $result`n" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })
        
        Remove-Item "test-connection.js" -ErrorAction SilentlyContinue
        
        if ($LASTEXITCODE -eq 0) {
            # ============================================
            # استيراد البيانات
            # ============================================
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
            Write-Host "الخطوة 9: استيراد البيانات الأولية`n" -ForegroundColor Yellow
            
            $importChoice = Read-Host "هل تريد استيراد البيانات الآن؟ (Y/N)"
            
            if ($importChoice -eq "Y" -or $importChoice -eq "y") {
                Write-Host "`n  جاري استيراد البيانات..." -ForegroundColor Cyan
                node seed.js
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "`n  ✅ تم استيراد البيانات بنجاح!`n" -ForegroundColor Green
                }
                else {
                    Write-Host "`n  ⚠️  حدث خطأ أثناء استيراد البيانات`n" -ForegroundColor Yellow
                }
            }
            
            # ============================================
            # النتيجة النهائية
            # ============================================
            Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║                                                           ║" -ForegroundColor Green
            Write-Host "║   🎉 تم إعداد قاعدة البيانات بنجاح!                     ║" -ForegroundColor Green
            Write-Host "║                                                           ║" -ForegroundColor Green
            Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
            
            Write-Host "الآن يمكنك:" -ForegroundColor Cyan
            Write-Host "  1. تشغيل السيرفر: cd .. ; npm start" -ForegroundColor White
            Write-Host "  2. اختبار النظام: انظر 🧪_SYSTEM_QUICK_TEST.md" -ForegroundColor White
            Write-Host "  3. المتابعة إلى Priority 2 (جدولة النسخ الاحتياطية)`n" -ForegroundColor White
            
            Write-Host "معلومات الاتصال:" -ForegroundColor Yellow
            Write-Host "  Database: MongoDB Atlas" -ForegroundColor Gray
            Write-Host "  User: $dbUser" -ForegroundColor Gray
            Write-Host "  URI: مخفي في .env`n" -ForegroundColor Gray
        }
    }
    
    "2" {
        Write-Host "`n✅ اخترت Hostinger MongoDB`n" -ForegroundColor Green
        Write-Host "للإعداد:" -ForegroundColor Yellow
        Write-Host "  1. سجل الدخول إلى Hostinger" -ForegroundColor White
        Write-Host "  2. انتقل إلى Databases → Create MongoDB" -ForegroundColor White
        Write-Host "  3. احصل على Connection String" -ForegroundColor White
        Write-Host "  4. شغل هذا السكريبت مرة أخرى واختر Option 1`n" -ForegroundColor White
    }
    
    "3" {
        Write-Host "`n✅ اخترت MongoDB محلي`n" -ForegroundColor Green
        Write-Host "للإعداد:" -ForegroundColor Yellow
        Write-Host "  1. ثبت MongoDB من: https://www.mongodb.com/try/download/community" -ForegroundColor White
        Write-Host "  2. شغل MongoDB service" -ForegroundColor White
        Write-Host "  3. الرابط الافتراضي: mongodb://localhost:27017/alawael-erp`n" -ForegroundColor White
        
        $useLocal = Read-Host "هل MongoDB مثبت ويعمل؟ (Y/N)"
        
        if ($useLocal -eq "Y" -or $useLocal -eq "y") {
            $envPath = "..\\.env"
            $envContent = Get-Content $envPath -Raw
            $envContent = $envContent -replace "USE_MOCK_DB=true", "USE_MOCK_DB=false"
            Set-Content -Path $envPath -Value $envContent -NoNewline
            
            Write-Host "`n✅ تم تحديث .env!`n" -ForegroundColor Green
        }
    }
    
    "4" {
        Write-Host "`nشكراً! 👋`n" -ForegroundColor Cyan
        exit
    }
    
    default {
        Write-Host "`n❌ خيار غير صحيح`n" -ForegroundColor Red
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
