<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes - Rehab ERP
|--------------------------------------------------------------------------
*/

// ===================== مسارات المصادقة =====================
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.post');
});

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth')
    ->name('logout');

// ===================== المسارات المحمية =====================
Route::middleware('auth')->group(function () {

    // لوحة التحكم
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // إدارة المرضى
    Route::resource('patients', PatientController::class);

    // إدارة الجلسات
    Route::resource('sessions', SessionController::class);
    Route::patch('/sessions/{session}/complete', [SessionController::class, 'complete'])->name('sessions.complete');
    Route::patch('/sessions/{session}/cancel', [SessionController::class, 'cancel'])->name('sessions.cancel');

    // الجدول الزمني
    Route::get('/schedule', [ScheduleController::class, 'index'])->name('schedule.index');

    // التقارير
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');

    // إدارة المستخدمين
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/users/{user}/toggle', [UserController::class, 'toggle'])->name('users.toggle');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    // الإعدادات
    Route::get('/settings', fn() => Inertia::render('Settings/Index'))->name('settings.index');

    // الفواتير والمالية
    Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::patch('/invoices/{invoice}/pay', [InvoiceController::class, 'pay'])->name('invoices.pay');
    Route::patch('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel'])->name('invoices.cancel');
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('invoices.destroy');

    // الملف الشخصي
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/password', [ProfileController::class, 'password'])->name('profile.password');
});
