<?php

namespace App\Http\Controllers;

use App\Models\TherapySession;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SessionController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TherapySession::query()
            ->with(['patient', 'therapist'])
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->date, fn($q, $v) => $q->whereDate('session_date', $v))
            ->when($request->patient_id, fn($q, $v) => $q->where('patient_id', $v))
            ->latest('session_date');

        $sessions = $query->paginate(15)->withQueryString();

        $todaySessions = TherapySession::with('patient')
            ->today()
            ->orderBy('session_time')
            ->get();

        $stats = [
            'total' => TherapySession::count(),
            'completed' => TherapySession::thisMonth()->completed()->count(),
            'scheduled' => TherapySession::scheduled()->count(),
            'revenue' => TherapySession::thisMonth()->completed()->sum('cost'),
            'week_completed' => TherapySession::thisWeek()->completed()->count(),
            'week_cancelled' => TherapySession::thisWeek()->where('status', 'cancelled')->count(),
            'week_revenue' => TherapySession::thisWeek()->completed()->sum('cost'),
            'attendance_rate' => $this->getAttendanceRate(),
        ];

        return Inertia::render('Sessions/Index', [
            'sessions' => $sessions,
            'todaySessions' => $todaySessions,
            'stats' => $stats,
            'filters' => $request->only(['status', 'date', 'patient_id']),
        ]);
    }

    public function create(Request $request): Response
    {
        $patients = Patient::active()->orderBy('name')->get(['id', 'name', 'patient_number']);
        $therapists = User::active()->whereIn('role', ['therapist', 'admin'])->orderBy('name')->get(['id', 'name', 'role']);

        return Inertia::render('Sessions/Form', [
            'patients' => $patients,
            'therapists' => $therapists,
            'defaultPatientId' => $request->query('patient_id'),
        ]);
    }

    public function edit(TherapySession $session): Response
    {
        $session->load(['patient', 'therapist']);
        $patients = Patient::active()->orderBy('name')->get(['id', 'name', 'patient_number']);
        $therapists = User::active()->whereIn('role', ['therapist', 'admin'])->orderBy('name')->get(['id', 'name', 'role']);

        return Inertia::render('Sessions/Form', [
            'session' => $session,
            'patients' => $patients,
            'therapists' => $therapists,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'therapist_id' => 'nullable|exists:users,id',
            'session_date' => 'required|date',
            'session_time' => 'required',
            'duration' => 'integer|min:15|max:480',
            'type' => 'string|in:individual,group,evaluation',
            'status' => 'in:scheduled,completed,cancelled,no_show',
            'cost' => 'nullable|numeric|min:0',
            'paid' => 'boolean',
            'notes' => 'nullable|string',
            'progress_notes' => 'nullable|string',
        ]);

        $validated['created_by'] = auth()->id();

        // احسب رقم الجلسة للمريض
        $count = TherapySession::where('patient_id', $validated['patient_id'])->count();
        $validated['session_number'] = $count + 1;

        TherapySession::create($validated);

        return redirect()->route('sessions.index')
            ->with('success', 'تم إضافة الجلسة بنجاح');
    }

    public function show(TherapySession $session): Response
    {
        $session->load(['patient', 'therapist']);

        return Inertia::render('Sessions/Show', [
            'session' => $session,
        ]);
    }

    public function update(Request $request, TherapySession $session): RedirectResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'therapist_id' => 'nullable|exists:users,id',
            'session_date' => 'required|date',
            'session_time' => 'required',
            'duration' => 'integer|min:15|max:480',
            'type' => 'string|in:individual,group,evaluation',
            'status' => 'in:scheduled,completed,cancelled,no_show',
            'cost' => 'nullable|numeric|min:0',
            'paid' => 'boolean',
            'notes' => 'nullable|string',
            'progress_notes' => 'nullable|string',
        ]);

        $session->update($validated);

        return redirect()->route('sessions.show', $session)
            ->with('success', 'تم تحديث الجلسة بنجاح');
    }

    public function destroy(TherapySession $session): RedirectResponse
    {
        $session->delete();

        return redirect()->route('sessions.index')
            ->with('success', 'تم حذف الجلسة بنجاح');
    }

    public function complete(TherapySession $session): RedirectResponse
    {
        $session->update(['status' => 'completed']);

        return back()->with('success', 'تم تأكيد إتمام الجلسة');
    }

    public function cancel(TherapySession $session): RedirectResponse
    {
        $session->update(['status' => 'cancelled']);

        return back()->with('success', 'تم إلغاء الجلسة');
    }

    private function getAttendanceRate(): int
    {
        $total = TherapySession::thisMonth()->whereIn('status', ['completed', 'no_show'])->count();
        if ($total === 0)
            return 100;

        $completed = TherapySession::thisMonth()->completed()->count();

        return (int) round(($completed / $total) * 100);
    }
}
