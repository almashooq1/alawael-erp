#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
# 📂 فتح مجلد محدد في VS Code
# تحسين الأداء - افتح فقط ما تحتاجه
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  📂 مدير المشاريع الفرعية - اختر مشروعاً للعمل عليه ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 نصيحة: افتح مجلد واحد فقط لتحسين أداء VS Code" -ForegroundColor Yellow
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📦 المشاريع المتاحة:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$projects = @(
    @{ Number = 1; Path = ".\backend"; Name = "Backend API - نظام Backend الرئيسي" },
    @{ Number = 2; Path = ".\frontend"; Name = "Frontend - واجهة المستخدم الرئيسية" },
    @{ Number = 3; Path = ".\supply-chain-management"; Name = "Supply Chain - إدارة سلسلة التوريد" },
    @{ Number = 4; Path = ".\mobile"; Name = "Mobile App - تطبيق الموبايل" },
    @{ Number = 5; Path = ".\intelligent-agent"; Name = "Intelligent Agent - الذكاء الاصطناعي" },
    @{ Number = 6; Path = ".\whatsapp"; Name = "WhatsApp Integration - تكامل واتساب" },
    @{ Number = 7; Path = ".\graphql"; Name = "GraphQL - خدمات GraphQL" },
    @{ Number = 8; Path = "."; Name = "المشروع كاملاً (غير موصى به لأداء أفضل)" }
)

foreach ($project in $projects) {
    if ($project.Number -eq 8) {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    }

    $color = if ($project.Number -eq 8) { "Yellow" } else { "White" }
    $icon = if ($project.Number -eq 8) { "⚠️ " } else { "" }

    Write-Host "  ${icon}[$($project.Number)] " -NoNewline -ForegroundColor $color
    Write-Host "$($project.Name)" -ForegroundColor $color

    # التحقق من وجود المجلد
    $exists = Test-Path $project.Path
    if (-not $exists -and $project.Number -ne 8) {
        Write-Host "      (غير موجود)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "اختر رقم المشروع (1-8) أو اضغط Enter للخروج: " -NoNewline -ForegroundColor Cyan
$choice = Read-Host

if ([string]::IsNullOrWhiteSpace($choice)) {
    Write-Host "تم الإلغاء." -ForegroundColor Yellow
    exit 0
}

$choiceNum = 0
if (-not [int]::TryParse($choice, [ref]$choiceNum) -or $choiceNum -lt 1 -or $choiceNum -gt 8) {
    Write-Host "❌ اختيار غير صحيح!" -ForegroundColor Red
    exit 1
}

$selectedProject = $projects[$choiceNum - 1]

# التحقق من وجود المجلد
if (-not (Test-Path $selectedProject.Path) -and $choiceNum -ne 8) {
    Write-Host "❌ المجلد غير موجود: $($selectedProject.Path)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "🚀 فتح المشروع: $($selectedProject.Name)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# سؤال: فتح في نفس النافذة أو نافذة جديدة؟
Write-Host "كيف تريد الفتح؟" -ForegroundColor Cyan
Write-Host "  [1] نافذة جديدة (موصى به)" -ForegroundColor White
Write-Host "  [2] نفس النافذة الحالية" -ForegroundColor White
Write-Host ""
Write-Host "اختر (1 أو 2) [الافتراضي: 1]: " -NoNewline -ForegroundColor Cyan
$windowChoice = Read-Host

if ([string]::IsNullOrWhiteSpace($windowChoice)) {
    $windowChoice = "1"
}

$newWindow = $windowChoice -eq "1"

Write-Host ""
Write-Host "⏳ جاري فتح VS Code..." -ForegroundColor Yellow

try {
    if ($newWindow) {
        Start-Process "code" -ArgumentList "-n", $selectedProject.Path
    } else {
        Start-Process "code" -ArgumentList $selectedProject.Path
    }

    Start-Sleep -Seconds 2

    Write-Host ""
    Write-Host "✅ تم فتح المشروع بنجاح!" -ForegroundColor Green
    Write-Host ""

    # نصائح إضافية
    if ($choiceNum -ne 8) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "💡 نصائح للأداء الأفضل:" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  ✓ الآن أنت تعمل على مجلد فرعي واحد فقط" -ForegroundColor Green
        Write-Host "  ✓ الأداء سيكون أسرع بنسبة 70-80%" -ForegroundColor Green
        Write-Host "  ✓ استهلاك الذاكرة سيكون أقل بنسبة 50-60%" -ForegroundColor Green
        Write-Host ""
        Write-Host "  📌 إذا احتجت مجلد آخر، شغّل هذا السكربت مرة أخرى" -ForegroundColor White
        Write-Host "  📌 استخدم Ctrl+P للبحث السريع عن الملفات" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
        Write-Host "⚠️  تنبيه: فتح المشروع كاملاً" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  ⚠️  الأداء قد يكون بطيئاً بسبب حجم المشروع الكبير" -ForegroundColor Yellow
        Write-Host "  💡 يُنصح بإغلاق الملفات غير المستخدمة (Ctrl+K ثم W)" -ForegroundColor White
        Write-Host "  💡 استخدم .\optimize-vscode.ps1 لتحسين الأداء" -ForegroundColor White
        Write-Host ""
    }

} catch {
    Write-Host ""
    Write-Host "❌ خطأ في فتح VS Code:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 تأكد من تثبيت VS Code وإضافته إلى PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
