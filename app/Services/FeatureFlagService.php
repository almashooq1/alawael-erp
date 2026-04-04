<?php

namespace App\Services;

use App\Enums\FlagStatus;
use App\Models\FeatureFlag;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FeatureFlagService
{
    public function __construct(
        private readonly FeatureFlag $model,
    ) {
    }

    // التحقق من تفعيل علم ميزة لمستخدم معين
    public function isEnabled(string $key, ?User $user = null): bool
    {
        return Cache::remember(
            "feature_flag:{$key}:" . ($user?->id ?? 'guest'),
            60,
            function () use ($key, $user) {
                $flag = FeatureFlag::where('key', $key)->first();

                if (!$flag || $flag->status === FlagStatus::DISABLED) {
                    return false;
                }

                if ($flag->status === FlagStatus::ENABLED) {
                    return $this->checkEnvironmentAndBranch($flag);
                }

                if ($flag->status === FlagStatus::ROLLOUT) {
                    return $this->checkRollout($flag, $user);
                }

                return false;
            }
        );
    }

    // التحقق من الطرح التدريجي بناءً على نسبة مئوية
    public function checkRollout(FeatureFlag $flag, ?User $user): bool
    {
        if ($user && in_array($user->id, $flag->allowed_users ?? [])) {
            return true;
        }

        if (!$user) {
            return false;
        }

        $bucket = crc32($flag->key . $user->id) % 100;

        return abs($bucket) < $flag->rollout_percentage;
    }

    // التحقق من البيئة والفرع المسموح
    public function checkEnvironmentAndBranch(FeatureFlag $flag): bool
    {
        $currentEnv = config('app.env');
        $currentBranch = session('current_branch_id');

        if (!empty($flag->allowed_environments) && !in_array($currentEnv, $flag->allowed_environments)) {
            return false;
        }

        if (!empty($flag->allowed_branches) && !in_array($currentBranch, $flag->allowed_branches)) {
            return false;
        }

        return true;
    }

    // تفعيل علم ميزة
    public function enable(string $key): FeatureFlag
    {
        $flag = FeatureFlag::where('key', $key)->firstOrFail();
        $flag->update([
            'status' => FlagStatus::ENABLED,
            'enabled_at' => now(),
        ]);

        Cache::forget("feature_flag:{$key}:*");
        Log::info("Feature flag enabled: {$key}", ['by' => auth()->id()]);

        return $flag;
    }

    // إلغاء تفعيل علم ميزة
    public function disable(string $key): FeatureFlag
    {
        $flag = FeatureFlag::where('key', $key)->firstOrFail();
        $flag->update([
            'status' => FlagStatus::DISABLED,
            'disabled_at' => now(),
        ]);

        Cache::forget("feature_flag:{$key}:*");
        Log::info("Feature flag disabled: {$key}", ['by' => auth()->id()]);

        return $flag;
    }

    // ضبط نسبة الطرح التدريجي
    public function setRollout(string $key, int $percentage): FeatureFlag
    {
        if ($percentage < 0 || $percentage > 100) {
            throw new \InvalidArgumentException('Rollout percentage must be between 0 and 100');
        }

        $flag = FeatureFlag::where('key', $key)->firstOrFail();
        $flag->update([
            'status' => FlagStatus::ROLLOUT,
            'rollout_percentage' => $percentage,
        ]);

        Cache::forget("feature_flag:{$key}:*");

        return $flag;
    }

    // الحصول على قائمة الأعلام المفعّلة للمستخدم
    public function allEnabled(?User $user = null): array
    {
        $flags = FeatureFlag::active()->get();

        return $flags->filter(fn($flag) => $this->isEnabled($flag->key, $user))
            ->pluck('key')
            ->toArray();
    }

    // إحصائيات الأعلام للوحة التحكم
    public function getStats(?int $branchId = null): array
    {
        return [
            'total' => ['title' => 'إجمالي الأعلام', 'value' => FeatureFlag::count()],
            'enabled' => ['title' => 'مفعّلة', 'value' => FeatureFlag::where('status', FlagStatus::ENABLED)->count()],
            'disabled' => ['title' => 'معطّلة', 'value' => FeatureFlag::where('status', FlagStatus::DISABLED)->count()],
            'rollout' => ['title' => 'طرح تدريجي', 'value' => FeatureFlag::where('status', FlagStatus::ROLLOUT)->count()],
        ];
    }

    // قائمة الأعلام مع فلترة
    public function list(array $filters = [])
    {
        return FeatureFlag::query()
            ->when($filters['search'] ?? null, fn($q, $v) => $q->where('name', 'like', "%{$v}%")->orWhere('key', 'like', "%{$v}%"))
            ->when($filters['status'] ?? null, fn($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate($filters['per_page'] ?? 15);
    }

    public function getRelations(): array
    {
        return ['branch', 'creator'];
    }

    public function getFormOptions(): array
    {
        return [
            'statuses' => collect(FlagStatus::cases())->map(fn($e) => ['value' => $e->value, 'label' => $e->label()]),
        ];
    }

    public function create(array $data): FeatureFlag
    {
        return FeatureFlag::create($data);
    }

    public function update(FeatureFlag $flag, array $data): FeatureFlag
    {
        $flag->update($data);
        Cache::forget("feature_flag:{$flag->key}:*");

        return $flag->fresh();
    }

    public function delete(FeatureFlag $flag): void
    {
        Cache::forget("feature_flag:{$flag->key}:*");
        $flag->delete();
    }
}
