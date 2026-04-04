<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Pest PHP Bootstrap
|--------------------------------------------------------------------------
|
| هذا الملف هو نقطة الدخول لإعداد Pest PHP.
| يتم فيه تحديد الـ TestCase الأساسي ويمكن مشاركة الإعدادات
| بين جميع ملفات الاختبار.
|
*/

uses(TestCase::class, RefreshDatabase::class)->in('Feature');
