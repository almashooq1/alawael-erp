<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\TherapySession;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        // ============================================================
        // الإحصاءات الرئيسية
        // ============================================================
        $stats = [
            'total_patients' => Patient::count(),
            'active_patients' => Patient::active()->count(),
            'sessions_today' => TherapySession::today()->count(),
            'sessions_month' => TherapySession::thisMonth()->count(),
            'revenue_month' => Invoice::paid()
                ->whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('total'),
            'completed_sessions' => TherapySession::completed()->count(),
            'pending_invoices' => Invoice::pending()->count(),
            'active_staff' => User::active()->count(),
        ];

        // ============================================================
        // مخطط جلسات آخر 7 أيام
        // ============================================================
        $weeklyChart = collect(range(6, 0))->map(function ($daysAgo) {
            $date = Carbon::today()->subDays($daysAgo);
            return [
                'label' => $date->locale('ar')->isoFormat('ddd D/M'),
                'date' => $date->toDateString(),
                'sessions' => TherapySession::whereDate('session_date', $date)->count(),
                'completed' => TherapySession::whereDate('session_date', $date)->completed()->count(),
            ];
        })->values();

        // ============================================================
        // مخطط الإيرادات آخر 6 أشهر
        // ============================================================
        $revenueChart = collect(range(5, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);
            return [
                'label' => $date->locale('ar')->isoFormat('MMM YY'),
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
        // المرضى الأخيرون
        // ============================================================
        $recentPatients = Patient::latest()
            ->limit(5)
            ->get(['id', 'name', 'patient_number', 'diagnosis', 'status', 'created_at']);

        // ============================================================
        // جلسات اليوم
        // ============================================================
        $todaySessions = TherapySession::with(['patient', 'therapist'])
            ->today()
            ->orderBy('session_time')
            ->get();

        // ============================================================
        // آخر الفواتير
        // ============================================================
        $recentInvoices = Invoice::with('patient')
            ->latest()
            ->limit(5)
            ->get(['id', 'invoice_number', 'patient_id', 'total', 'status', 'created_at']);

        return Inertia::render('Home', [
            'stats' => $stats,
            'weeklyChart' => $weeklyChart,
            'revenueChart' => $revenueChart,
            'recentPatients' => $recentPatients,
            'todaySessions' => $todaySessions,
            'recentInvoices' => $recentInvoices,
            'appName' => config('app.name'),
        ]);
    }
}
