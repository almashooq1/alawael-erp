<?php

namespace App\Services;

use App\Enums\DeploymentEnvironment;
use App\Enums\DeploymentStatus;
use App\Models\Deployment;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class DeploymentService
{
    public function __construct(
        private readonly Deployment $model,
    ) {
    }

    // إنشاء سجل نشر جديد
    public function createDeployment(array $data): Deployment
    {
        return Deployment::create([
            'version' => $data['version'],
            'environment' => $data['environment'] ?? DeploymentEnvironment::PRODUCTION,
            'status' => DeploymentStatus::PENDING,
            'commit_hash' => $data['commit_hash'] ?? null,
            'branch' => $data['branch'] ?? 'main',
            'deployed_by' => $data['deployed_by'] ?? 'CI/CD Pipeline',
            'release_notes' => $data['release_notes'] ?? null,
            'branch_id' => $data['branch_id'] ?? session('current_branch_id') ?? 1,
        ]);
    }

    // بدء عملية النشر وتسجيلها
    public function startDeployment(Deployment $deployment): void
    {
        $deployment->update([
            'status' => DeploymentStatus::RUNNING,
            'started_at' => now(),
        ]);

        Log::info('Deployment started', [
            'id' => $deployment->id,
            'version' => $deployment->version,
            'environment' => $deployment->environment,
        ]);
    }

    // تسجيل إتمام النشر بنجاح
    public function completeDeployment(Deployment $deployment, array $results = []): void
    {
        $startedAt = $deployment->started_at ?? now();
        $duration = (int) $startedAt->diffInSeconds(now());

        $deployment->update([
            'status' => DeploymentStatus::SUCCESS,
            'completed_at' => now(),
            'duration_seconds' => $duration,
            'health_check_results' => $results['health_checks'] ?? [],
            'migrations_run' => $results['migrations_run'] ?? false,
        ]);

        Log::info('Deployment completed successfully', [
            'id' => $deployment->id,
            'version' => $deployment->version,
            'duration' => $duration,
        ]);
    }

    // تسجيل فشل النشر
    public function failDeployment(Deployment $deployment, string $errorMessage): void
    {
        $deployment->update([
            'status' => DeploymentStatus::FAILED,
            'completed_at' => now(),
            'error_message' => $errorMessage,
        ]);

        Log::error('Deployment failed', [
            'id' => $deployment->id,
            'version' => $deployment->version,
            'error' => $errorMessage,
        ]);

        Notification::route('mail', config('app.admin_email'))
            ->notify(new \App\Notifications\DeploymentFailed($deployment));
    }

    // التراجع عن النشر الأخير
    public function rollback(Deployment $deployment): Deployment
    {
        $previousDeployment = Deployment::where('environment', $deployment->environment)
            ->where('status', DeploymentStatus::SUCCESS)
            ->where('id', '!=', $deployment->id)
            ->latest('completed_at')
            ->first();

        if (!$previousDeployment) {
            throw new \RuntimeException('لا يوجد نشر سابق للتراجع إليه');
        }

        $deployment->update([
            'status' => DeploymentStatus::ROLLED_BACK,
            'rolled_back' => true,
            'rolled_back_at' => now(),
            'previous_version' => $previousDeployment->version,
        ]);

        dispatch(new \App\Jobs\RollbackDeploymentJob($deployment, $previousDeployment));

        Log::warning('Deployment rollback initiated', [
            'from_version' => $deployment->version,
            'to_version' => $previousDeployment->version,
        ]);

        return $previousDeployment;
    }

    // إحصائيات النشر للوحة التحكم
    public function getStats(?int $branchId = null): array
    {
        $latest = Deployment::orderBy('started_at', 'desc')->first();

        return [
            'total' => ['title' => 'إجمالي النشرات', 'value' => Deployment::count()],
            'successful' => ['title' => 'ناجحة', 'value' => Deployment::where('status', DeploymentStatus::SUCCESS)->count()],
            'failed' => ['title' => 'فاشلة', 'value' => Deployment::where('status', DeploymentStatus::FAILED)->count()],
            'last' => ['title' => 'آخر نشر', 'value' => $latest?->version . ' (' . $latest?->started_at?->diffForHumans() . ')'],
        ];
    }

    // قائمة النشرات مع فلترة
    public function list(array $filters = [])
    {
        return Deployment::with(['approver', 'branch'])
            ->when($filters['search'] ?? null, fn($q, $v) => $q->where('version', 'like', "%{$v}%"))
            ->when($filters['status'] ?? null, fn($q, $v) => $q->where('status', $v))
            ->when($filters['branch_id'] ?? null, fn($q, $v) => $q->where('branch_id', $v))
            ->when($filters['date_from'] ?? null, fn($q, $v) => $q->whereDate('started_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn($q, $v) => $q->whereDate('started_at', '<=', $v))
            ->latest('started_at')
            ->paginate($filters['per_page'] ?? 15);
    }

    public function getRelations(): array
    {
        return ['approver', 'branch'];
    }

    public function getFormOptions(): array
    {
        return [
            'environments' => collect(DeploymentEnvironment::cases())->map(fn($e) => ['value' => $e->value, 'label' => $e->label()]),
            'statuses' => collect(DeploymentStatus::cases())->map(fn($e) => ['value' => $e->value, 'label' => $e->label()]),
        ];
    }

    public function create(array $data): Deployment
    {
        return $this->createDeployment($data);
    }

    public function update(Deployment $deployment, array $data): Deployment
    {
        $deployment->update($data);

        return $deployment->fresh();
    }

    public function delete(Deployment $deployment): void
    {
        $deployment->delete();
    }
}
