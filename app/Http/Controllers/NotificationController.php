<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use App\Models\NotificationLog;
use App\Http\Resources\NotificationLogResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $service,
    ) {
    }

    // عرض القائمة مع الفلترة والبحث
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', NotificationLog::class);

        $filters = $request->only(['search', 'status', 'branch_id', 'date_from', 'date_to', 'per_page']);
        $notifications = NotificationLog::where('branch_id', session('current_branch_id'))
            ->when($filters['search'] ?? null, fn($q, $s) => $q->where('body', 'like', "%{$s}%"))
            ->when($filters['status'] ?? null, fn($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 15);

        return Inertia::render('Notification/Index', [
            'notifications' => NotificationLogResource::collection($notifications),
            'filters' => $filters,
            'stats' => $this->service->getStats(session('current_branch_id')),
        ]);
    }

    // عرض نموذج الإنشاء
    public function create(): Response
    {
        $this->authorize('create', NotificationLog::class);

        return Inertia::render('Notification/Create');
    }

    // عرض التفاصيل
    public function show(NotificationLog $notification): Response
    {
        $this->authorize('view', $notification);

        return Inertia::render('Notification/Show', [
            'notification' => new NotificationLogResource($notification),
        ]);
    }

    // حذف السجل
    public function destroy(NotificationLog $notification): JsonResponse
    {
        $this->authorize('delete', $notification);

        $notification->delete();

        return response()->json([
            'message' => __('تم الحذف بنجاح'),
        ]);
    }

    // الإشعارات الداخلية للمستخدم الحالي
    public function inbox(Request $request): Response|JsonResponse
    {
        $notifications = $this->service->getUserNotifications(auth()->id());

        if ($request->wantsJson()) {
            return response()->json([
                'notifications' => $notifications,
                'unread_count' => $this->service->getUnreadCount(auth()->id()),
            ]);
        }

        return Inertia::render('Notification/Inbox', [
            'notifications' => $notifications,
            'unread_count' => $this->service->getUnreadCount(auth()->id()),
        ]);
    }

    // تحديد إشعار كمقروء
    public function markRead(Request $request, int $id): JsonResponse
    {
        $this->service->markAsRead($id, auth()->id());

        return response()->json(['message' => 'تم التحديث']);
    }

    // تحديد جميع الإشعارات كمقروءة
    public function markAllRead(Request $request): JsonResponse
    {
        $count = $this->service->markAllAsRead(auth()->id());

        return response()->json(['message' => 'تم تحديث ' . $count . ' إشعارات']);
    }

    // حفظ تفضيلات الإشعارات
    public function savePreferences(Request $request): JsonResponse
    {
        $preferences = $request->validate([
            'preferences' => 'required|array',
            'preferences.*.channel' => 'required|string',
            'preferences.*.event_type' => 'required|string',
            'preferences.*.is_enabled' => 'required|boolean',
            'preferences.*.frequency' => 'nullable|string',
        ]);
        $this->service->saveUserPreferences(auth()->id(), $preferences['preferences']);

        return response()->json(['message' => 'تم حفظ التفضيلات']);
    }

    // إحصاءات الإشعارات
    public function analytics(Request $request): Response|JsonResponse
    {
        $this->authorize('viewAny', NotificationLog::class);

        $stats = $this->service->getStats(
            session('current_branch_id'),
            $request->get('period', 'today')
        );

        if ($request->wantsJson()) {
            return response()->json(['stats' => $stats]);
        }

        return Inertia::render('Notification/Analytics', ['stats' => $stats]);
    }
}
