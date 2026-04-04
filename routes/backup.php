<?php

use App\Http\Controllers\BackupController;
use App\Http\Controllers\HealthCheckController;
use Illuminate\Support\Facades\Route;

// ======================================================
// Health Check — متاح بدون مصادقة
// ======================================================
Route::get('/health', HealthCheckController::class)->name('health');

// ======================================================
// Backup Routes — النسخ الاحتياطي
// ======================================================
Route::middleware(['auth', 'verified'])->prefix('backup')->name('backup.')->group(function () {

    // CRUD المورد الرئيسي
    Route::resource('backups', BackupController::class);

    // إجراءات إضافية
    Route::post('manual', [BackupController::class, 'runManual'])->name('backups.runManual');
    Route::post('{backup}/restore', [BackupController::class, 'restore'])->name('backups.restore');
    Route::get('{backup}/download', [BackupController::class, 'downloadBackup'])->name('backups.downloadBackup');
    Route::get('dr-plans', [BackupController::class, 'drPlans'])->name('backups.drPlans');
});
