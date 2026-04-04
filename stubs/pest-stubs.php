<?php

/**
 * Pest PHP & Laravel Helper Stubs
 * --------------------------------
 * هذا الملف مخصص لتوجيه IDE / PHP IntelliSense فقط.
 * لا يُنفَّذ في وقت التشغيل.
 *
 * يعرّف الدوال العامة الخاصة بـ Pest PHP و Laravel
 * حتى لا تظهر تحذيرات "دالة غير معروفة" في المحرر.
 */

if (!function_exists('it')) {
    /**
     * تعريف اختبار Pest.
     *
     * @param string   $description وصف الاختبار
     * @param \Closure $closure     منطق الاختبار
     * @return \Pest\TestSuite
     */
    function it(string $description, \Closure $closure): mixed
    {
    }
}

if (!function_exists('test')) {
    /**
     * تعريف اختبار Pest (مرادف لـ it).
     *
     * @param string   $description وصف الاختبار
     * @param \Closure $closure     منطق الاختبار
     * @return \Pest\TestSuite
     */
    function test(string $description, \Closure $closure): mixed
    {
    }
}

if (!function_exists('beforeEach')) {
    /**
     * تشغيل كود قبل كل اختبار.
     *
     * @param \Closure $closure الكود المراد تشغيله
     * @return void
     */
    function beforeEach(\Closure $closure): void
    {
    }
}

if (!function_exists('afterEach')) {
    /**
     * تشغيل كود بعد كل اختبار.
     *
     * @param \Closure $closure الكود المراد تشغيله
     * @return void
     */
    function afterEach(\Closure $closure): void
    {
    }
}

if (!function_exists('beforeAll')) {
    /**
     * تشغيل كود مرة واحدة قبل كل الاختبارات.
     *
     * @param \Closure $closure الكود المراد تشغيله
     * @return void
     */
    function beforeAll(\Closure $closure): void
    {
    }
}

if (!function_exists('afterAll')) {
    /**
     * تشغيل كود مرة واحدة بعد كل الاختبارات.
     *
     * @param \Closure $closure الكود المراد تشغيله
     * @return void
     */
    function afterAll(\Closure $closure): void
    {
    }
}

if (!function_exists('describe')) {
    /**
     * تجميع مجموعة من الاختبارات.
     *
     * @param string   $description وصف المجموعة
     * @param \Closure $closure     الاختبارات داخل المجموعة
     * @return void
     */
    function describe(string $description, \Closure $closure): void
    {
    }
}

if (!function_exists('expect')) {
    /**
     * إنشاء توقع (Expectation) لقيمة معينة.
     *
     * @param mixed $value القيمة المراد فحصها
     * @return \Pest\Expectation
     */
    function expect(mixed $value): mixed
    {
    }
}

if (!function_exists('dataset')) {
    /**
     * تعريف مجموعة بيانات للاختبارات.
     *
     * @param string          $name   اسم مجموعة البيانات
     * @param array|\Closure  $data   البيانات أو Closure لإنتاجها
     * @return void
     */
    function dataset(string $name, array|\Closure $data): void
    {
    }
}

// =============================================
// Laravel Helper Functions
// =============================================

if (!function_exists('app')) {
    /**
     * الحصول على مثيل الـ Application container أو حل binding.
     *
     * @param string|null $abstract  اسم الـ binding أو null
     * @param array       $parameters المعاملات
     * @return \Illuminate\Foundation\Application|mixed
     */
    function app(?string $abstract = null, array $parameters = []): mixed
    {
    }
}

if (!function_exists('now')) {
    /**
     * الحصول على الوقت الحالي كـ Carbon instance.
     *
     * @param \DateTimeZone|string|null $tz المنطقة الزمنية
     * @return \Illuminate\Support\Carbon
     */
    function now(\DateTimeZone|string|null $tz = null): \Illuminate\Support\Carbon
    {
    }
}

if (!function_exists('actingAs')) {
    /**
     * محاكاة تسجيل الدخول كمستخدم في الاختبارات (Pest مع Laravel).
     *
     * @param \Illuminate\Contracts\Auth\Authenticatable $user المستخدم
     * @param string|null                                $guard الحارس
     * @return mixed
     */
    function actingAs(\Illuminate\Contracts\Auth\Authenticatable $user, ?string $guard = null): mixed
    {
    }
}

if (!function_exists('route')) {
    /**
     * توليد رابط URL لمسار مسمى.
     *
     * @param string     $name       اسم المسار
     * @param mixed      $parameters المعاملات
     * @param bool       $absolute   رابط مطلق أم نسبي
     * @return string
     */
    function route(string $name, mixed $parameters = [], bool $absolute = true): string
    {
    }
}

if (!function_exists('config')) {
    /**
     * الوصول إلى قيم الإعدادات.
     *
     * @param array|string|null $key     المفتاح
     * @param mixed             $default القيمة الافتراضية
     * @return mixed
     */
    function config(array|string|null $key = null, mixed $default = null): mixed
    {
    }
}

if (!function_exists('env')) {
    /**
     * قراءة متغير بيئة.
     *
     * @param string $key     المفتاح
     * @param mixed  $default القيمة الافتراضية
     * @return mixed
     */
    function env(string $key, mixed $default = null): mixed
    {
    }
}

if (!function_exists('storage_path')) {
    /**
     * الحصول على مسار مجلد storage.
     *
     * @param string $path المسار الفرعي
     * @return string
     */
    function storage_path(string $path = ''): string
    {
    }
}

if (!function_exists('base_path')) {
    /**
     * الحصول على المسار الجذر للتطبيق.
     *
     * @param string $path المسار الفرعي
     * @return string
     */
    function base_path(string $path = ''): string
    {
    }
}
