<?php

namespace App\Http\Controllers;

use App\Models\TherapySession;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        // نجلب جلسات الشهر الحالي والشهرين المجاورين
        $month = $request->get('month', now()->month);
        $year = $request->get('year', now()->year);

        $sessions = TherapySession::with(['patient', 'therapist'])
            ->whereBetween('session_date', [
                now()->setYear($year)->setMonth($month)->startOfMonth()->subMonth(),
                now()->setYear($year)->setMonth($month)->endOfMonth()->addMonth(),
            ])
            ->orderBy('session_date')
            ->orderBy('session_time')
            ->get();

        $todaySessions = TherapySession::with('patient')
            ->whereDate('session_date', today())
            ->orderBy('session_time')
            ->get();

        return Inertia::render('Schedule/Index', [
            'sessions' => $sessions,
            'todaySessions' => $todaySessions,
        ]);
    }
}
