<?php

use App\Http\Controllers\DeploymentController;
use App\Http\Controllers\FeatureFlagController;
use Illuminate\Support\Facades\Route;

// ======================================================
// DevOps Routes — النشر وإدارة الميزات
// ======================================================
Route::middleware(['auth', 'verified'])->prefix('devops')->name('devops.')->group(function () {

    // ── Deployments ──────────────────────────────────
    Route::resource('deployments', DeploymentController::class);
    Route::post('{deployment}/rollback', [DeploymentController::class, 'rollback'])->name('deployments.rollback');
    Route::get('{deployment}/logs', [DeploymentController::class, 'logs'])->name('deployments.logs');

    // ── Feature Flags ─────────────────────────────────
    Route::resource('feature-flags', FeatureFlagController::class);
    Route::patch('feature-flags/{flag}/toggle', [FeatureFlagController::class, 'toggle'])->name('feature-flags.toggle');
    Route::patch('feature-flags/{flag}/rollout', [FeatureFlagController::class, 'setRollout'])->name('feature-flags.setRollout');
});
