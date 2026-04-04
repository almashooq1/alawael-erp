<?php

namespace App\Http\Controllers;

use App\Models\Deployment;
use App\Services\DeploymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeploymentController extends Controller
{
    public function __construct(
        private readonly DeploymentService $service,
    ) {
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Deployment::class);

        $filters = $request->only(['search', 'status', 'branch_id', 'date_from', 'date_to', 'per_page']);
        $deployments = $this->service->list($filters);

        return Inertia::render('Deployment/Index', [
            'deployments' => $deployments,
            'filters' => $filters,
            'stats' => $this->service->getStats(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Deployment::class);

        return Inertia::render('Deployment/Create', [
            'options' => $this->service->getFormOptions(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Deployment::class);

        $request->validate([
            'version' => 'required|string',
            'environment' => 'required|string',
        ]);

        $deployment = $this->service->create($request->validated());

        return response()->json([
            'message' => __('تم الإنشاء بنجاح'),
            'data' => $deployment,
        ], 201);
    }

    public function show(Deployment $deployment): Response
    {
        $this->authorize('view', $deployment);

        $deployment->load($this->service->getRelations());

        return Inertia::render('Deployment/Show', [
            'deployment' => $deployment,
        ]);
    }

    public function edit(Deployment $deployment): Response
    {
        $this->authorize('update', $deployment);

        return Inertia::render('Deployment/Edit', [
            'deployment' => $deployment,
            'options' => $this->service->getFormOptions(),
        ]);
    }

    public function update(Request $request, Deployment $deployment): JsonResponse
    {
        $this->authorize('update', $deployment);

        $deployment = $this->service->update($deployment, $request->all());

        return response()->json([
            'message' => __('تم التحديث بنجاح'),
            'data' => $deployment,
        ]);
    }

    public function destroy(Deployment $deployment): JsonResponse
    {
        $this->authorize('delete', $deployment);

        $this->service->delete($deployment);

        return response()->json(['message' => __('تم الحذف بنجاح')]);
    }

    // التراجع عن آخر نشر
    public function rollback(Request $request, Deployment $deployment): JsonResponse
    {
        $this->authorize('update', $deployment);

        $previous = $this->service->rollback($deployment);

        return response()->json([
            'message' => __('تم بدء التراجع'),
            'previous_version' => $previous->version,
        ], 202);
    }

    // عرض سجلات النشر
    public function logs(Request $request, Deployment $deployment): JsonResponse
    {
        $this->authorize('view', $deployment);

        return response()->json([
            'log' => $deployment->deployment_log,
        ]);
    }
}
