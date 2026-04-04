<?php

namespace App\Http\Controllers;

use App\Enums\FlagStatus;
use App\Models\FeatureFlag;
use App\Services\FeatureFlagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeatureFlagController extends Controller
{
    public function __construct(
        private readonly FeatureFlagService $service,
    ) {
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', FeatureFlag::class);

        $filters = $request->only(['search', 'status', 'per_page']);
        $flags = $this->service->list($filters);

        return Inertia::render('FeatureFlag/Index', [
            'flags' => $flags,
            'filters' => $filters,
            'stats' => $this->service->getStats(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', FeatureFlag::class);

        return Inertia::render('FeatureFlag/Create', [
            'options' => $this->service->getFormOptions(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', FeatureFlag::class);

        $request->validate([
            'key' => 'required|string|unique:feature_flags,key',
            'name' => 'required|string',
            'status' => 'required|string',
        ]);

        $flag = $this->service->create($request->validated());

        return response()->json([
            'message' => __('تم الإنشاء بنجاح'),
            'data' => $flag,
        ], 201);
    }

    public function show(FeatureFlag $featureFlag): Response
    {
        $this->authorize('view', $featureFlag);

        return Inertia::render('FeatureFlag/Show', [
            'flag' => $featureFlag,
        ]);
    }

    public function edit(FeatureFlag $featureFlag): Response
    {
        $this->authorize('update', $featureFlag);

        return Inertia::render('FeatureFlag/Edit', [
            'flag' => $featureFlag,
            'options' => $this->service->getFormOptions(),
        ]);
    }

    public function update(Request $request, FeatureFlag $featureFlag): JsonResponse
    {
        $this->authorize('update', $featureFlag);

        $flag = $this->service->update($featureFlag, $request->all());

        return response()->json([
            'message' => __('تم التحديث بنجاح'),
            'data' => $flag,
        ]);
    }

    public function destroy(FeatureFlag $featureFlag): JsonResponse
    {
        $this->authorize('delete', $featureFlag);

        $this->service->delete($featureFlag);

        return response()->json(['message' => __('تم الحذف بنجاح')]);
    }

    // تبديل حالة علم الميزة
    public function toggle(Request $request, FeatureFlag $featureFlag): JsonResponse
    {
        $this->authorize('update', $featureFlag);

        if ($featureFlag->status === FlagStatus::ENABLED) {
            $this->service->disable($featureFlag->key);
            $message = 'تم إلغاء تفعيل الميزة';
        } else {
            $this->service->enable($featureFlag->key);
            $message = 'تم تفعيل الميزة';
        }

        return response()->json(['message' => __($message)]);
    }

    // ضبط نسبة الطرح التدريجي
    public function setRollout(Request $request, FeatureFlag $featureFlag): JsonResponse
    {
        $this->authorize('update', $featureFlag);

        $request->validate(['percentage' => 'required|integer|min:0|max:100']);

        $this->service->setRollout($featureFlag->key, $request->integer('percentage'));

        return response()->json([
            'message' => __('تم تحديث نسبة الطرح'),
            'percentage' => $request->integer('percentage'),
        ]);
    }
}
