<?php

namespace App\Http\Controllers;

use App\Models\BackupJob;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BackupController extends Controller
{
    public function __construct(
        private readonly BackupService $service,
    ) {
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BackupJob::class);

        $filters = $request->only(['search', 'status', 'branch_id', 'date_from', 'date_to', 'per_page']);
        $backups = $this->service->list($filters);

        return Inertia::render('BackupJob/Index', [
            'backups' => $backups,
            'filters' => $filters,
            'stats' => $this->service->getStats(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', BackupJob::class);

        return Inertia::render('BackupJob/Create', [
            'options' => $this->service->getFormOptions(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', BackupJob::class);

        $backup = $this->service->createFullBackup([
            'branch_id' => session('current_branch_id'),
            'triggered_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => __('تم الإنشاء بنجاح'),
            'data' => $backup,
        ], 201);
    }

    public function show(BackupJob $backup): Response
    {
        $this->authorize('view', $backup);

        $backup->load($this->service->getRelations());

        return Inertia::render('BackupJob/Show', [
            'backup' => $backup,
        ]);
    }

    public function destroy(BackupJob $backup): JsonResponse
    {
        $this->authorize('delete', $backup);

        $this->service->delete($backup);

        return response()->json(['message' => __('تم الحذف بنجاح')]);
    }

    // تشغيل نسخة احتياطية يدوية فورية
    public function runManual(Request $request): JsonResponse
    {
        $this->authorize('create', BackupJob::class);

        $job = $this->service->createFullBackup([
            'branch_id' => session('current_branch_id'),
            'triggered_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => __('تم بدء النسخ الاحتياطي'),
            'job_id' => $job->id,
        ], 202);
    }

    // استعادة نسخة احتياطية
    public function restore(Request $request, BackupJob $backup): JsonResponse
    {
        $this->authorize('update', $backup);

        $restoreJob = $this->service->restore($backup, [
            'type' => $request->input('type', 'full'),
            'environment' => $request->input('environment', 'production'),
        ]);

        return response()->json([
            'message' => __('تم بدء عملية الاستعادة'),
            'restore_job' => $restoreJob->only(['id', 'status', 'restore_type']),
        ], 202);
    }

    // تحميل ملف النسخة الاحتياطية
    public function downloadBackup(Request $request, BackupJob $backup): mixed
    {
        $this->authorize('view', $backup);

        if (!$backup->storage_path) {
            return response()->json(['message' => 'ملف النسخة غير موجود'], 404);
        }

        return response()->download(
            storage_path('app/' . $backup->storage_path),
            $backup->filename
        );
    }

    // عرض خطط التعافي من الكوارث
    public function drPlans(Request $request): Response
    {
        $plans = \App\Models\DrPlan::where('branch_id', session('current_branch_id'))
            ->where('is_active', true)
            ->orderBy('priority')
            ->get();

        return Inertia::render('Backup/DrPlans', [
            'plans' => $plans,
        ]);
    }
}
