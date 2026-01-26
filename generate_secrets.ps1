# 🔐 توليد مفاتيح أمان قوية للإنتاج
# تشغيل: .\generate_secrets.ps1

Write-Host "=== 🔐 توليد مفاتيح الأمان ===" -ForegroundColor Green
Write-Host ""

# توليد SECRET_KEY
$bytes1 = New-Object Byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes1)
$secretKey = [Convert]::ToBase64String($bytes1)

# توليد JWT_SECRET_KEY
$bytes2 = New-Object Byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes2)
$jwtSecretKey = [Convert]::ToBase64String($bytes2)

# عرض النتائج
Write-Host "📋 انسخ هذه القيم إلى .env.production:" -ForegroundColor Cyan
Write-Host ""
Write-Host "SECRET_KEY=" -NoNewline -ForegroundColor Yellow
Write-Host $secretKey -ForegroundColor White
Write-Host ""
Write-Host "JWT_SECRET_KEY=" -NoNewline -ForegroundColor Yellow
Write-Host $jwtSecretKey -ForegroundColor White
Write-Host ""

# حفظ في ملف مؤقت
$outputFile = ".env.secrets.txt"
@"
# مفاتيح الأمان المولدة - $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# انسخ هذه القيم إلى .env.production ثم احذف هذا الملف

SECRET_KEY=$secretKey
JWT_SECRET_KEY=$jwtSecretKey
"@ | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ تم حفظ المفاتيح في: $outputFile" -ForegroundColor Green
Write-Host "⚠️  احذف هذا الملف بعد النسخ للأمان!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 الخطوة التالية:" -ForegroundColor Cyan
Write-Host "   1. افتح .env.production" -ForegroundColor White
Write-Host "   2. انسخ القيم أعلاه" -ForegroundColor White
Write-Host "   3. احذف ملف $outputFile" -ForegroundColor White
Write-Host ""
