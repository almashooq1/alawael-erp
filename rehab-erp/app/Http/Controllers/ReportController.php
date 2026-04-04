<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\TherapySession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        // ============================================================
        // KPIs
        // ============================================================
        $totalSessions = TherapySession::count();
        $completedSessions = TherapySession::completed()->count();
        $totalPatients = Patient::count();
        $monthRevenue = Invoice::paid()
            ->whereMonth('paid_at', now()->month)
            ->whereYear('paid_at', now()->year)
            ->sum('total');

        $stats = [
            'total_patients' => $totalPatients,
            'active_patients' => Patient::active()->count(),
            'total_sessions' => $totalSessions,
            'completed_sessions' => $completedSessions,
            'revenue_month' => $monthRevenue,
            'revenue_total' => Invoice::paid()->sum('total'),
            'pending_invoices' => Invoice::pending()->count(),
            'attendance_rate' => $this->getAttendanceRate(),
        ];

        // ============================================================
        // مخطط الجلسات الشهرية (12 شهر)
        // ============================================================
        $monthlySessionsChart = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);
            return [
                'label' => $date->locale('ar')->isoFormat('MMM'),
                'total' => TherapySession::whereMonth('session_date', $date->month)
                    ->whereYear('session_date', $date->year)
                    ->count(),
                'completed' => TherapySession::whereMonth('session_date', $date->month)
                    ->whereYear('session_date', $date->year)
                    ->completed()
                    ->count(),
                'cancelled' => TherapySession::whereMonth('session_date', $date->month)
                    ->whereYear('session_date', $date->year)
                    ->where('status', 'cancelled')
                    ->count(),
            ];
        })->values();

        // ============================================================
        // مخطط الإيرادات الشهرية (12 شهر)
        // ============================================================
        $monthlyRevenueChart = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);
            return [
                'label' => $date->locale('ar')->isoFormat('MMM'),
                'revenue' => Invoice::paid()
                    ->whereMonth('paid_at', $date->month)
                    ->whereYear('paid_at', $date->year)
                    ->sum('total'),
                'invoices' => Invoice::whereMonth('created_at', $date->month)
                    ->whereYear('created_at', $date->year)
                    ->count(),
            ];
        })->values();

        // ============================================================
        // توزيع أنواع الجلسات
        // ============================================================
        $sessionTypeBreakdown = TherapySession::select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->orderByDesc('count')
            ->get()
            ->map(fn($row) => [
                'type' => $row->type ?? 'غير محدد',
                'count' => $row->count,
                'percentage' => $totalSessions > 0 ? round($row->count / $totalSessions * 100) : 0,
            ]);

        // ============================================================
        // توزيع حالات المرضى
        // ============================================================
        $patientStatusBreakdown = Patient::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($row) => [
                'status' => $row->status,
                'label' => match ($row->status) {
                    'active' => 'نشط',
                    'inactive' => 'غير نشط',
                    'discharged' => 'مُخرَّج',
                    default => $row->status,
                },
                'count' => $row->count,
            ]);

        // ============================================================
        // توزيع المرضى حسب الجنس
        // ============================================================
        $patientGenderBreakdown = Patient::select('gender', DB::raw('count(*) as count'))
            ->groupBy('gender')
            ->get()
            ->map(fn($row) => [
                'gender' => $row->gender,
                'label' => match ($row->gender) {
                    'male' => 'ذكر',
                    'female' => 'أنثى',
                    default => 'غير محدد',
                },
                'count' => $row->count,
                'percentage' => $totalPatients > 0 ? round($row->count / $totalPatients * 100) : 0,
            ]);

        // ============================================================
        // أداء المعالجين
        // ============================================================
        $therapistPerformance = User::therapists()
            ->withCount([
                'sessions as sessions_count',
                'sessions as completed_count' => fn($q) => $q->completed(),
            ])
            ->orderByDesc('sessions_count')
            ->limit(10)
            ->get(['id', 'name', 'role']);

        // ============================================================
        // آخر 10 فواتير
        // ============================================================
        $recentTransactions = Invoice::with('patient')
            ->latest()
            ->limit(10)
            ->get(['id', 'invoice_number', 'patient_id', 'total', 'status', 'payment_method', 'created_at']);

        return Inertia::render('Reports/Index', [
            'stats' => $stats,
            'monthlySessionsChart' => $monthlySessionsChart,
            'monthlyRevenueChart' => $monthlyRevenueChart,
            'sessionTypeBreakdown' => $sessionTypeBreakdown,
            'patientStatusBreakdown' => $patientStatusBreakdown,
            'patientGenderBreakdown' => $patientGenderBreakdown,
            'therapistPerformance' => $therapistPerformance,
            'recentTransactions' => $recentTransactions,
        ]);
    }

    private function getAttendanceRate(): int
    {
        $total = TherapySession::thisMonth()
            ->whereIn('status', ['completed', 'no_show'])
            ->count();

        if ($total === 0)
            return 100;

        $completed = TherapySession::thisMonth()->completed()->count();

        return (int) round(($completed / $total) * 100);
    }
}
