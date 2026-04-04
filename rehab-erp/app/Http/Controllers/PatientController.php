<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Patient::query()
            ->withCount('sessions')
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->gender, fn($q, $v) => $q->where('gender', $v))
            ->when($request->search, fn($q, $v) => $q->where(function ($q) use ($v) {
                $q->where('name', 'like', "%$v%")
                    ->orWhere('patient_number', 'like', "%$v%")
                    ->orWhere('phone', 'like', "%$v%")
                    ->orWhere('diagnosis', 'like', "%$v%");
            }))
            ->latest();

        $patients = $query->paginate(15)->withQueryString();

        $stats = [
            'total' => Patient::count(),
            'active' => Patient::where('status', 'active')->count(),
            'new_this_week' => Patient::where('created_at', '>=', now()->startOfWeek())->count(),
            'avg_age' => (int) Patient::selectRaw('AVG(TIMESTAMPDIFF(YEAR, birth_date, CURDATE())) as avg_age')->value('avg_age'),
        ];

        return Inertia::render('Patients/Index', [
            'patients' => $patients,
            'stats' => $stats,
            'filters' => $request->only(['status', 'gender', 'search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Patients/Form');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'birth_date' => 'required|date|before:today',
            'gender' => 'required|in:male,female',
            'national_id' => 'nullable|string|unique:patients',
            'phone' => 'required|string|max:20',
            'phone2' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'guardian_name' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'diagnosis' => 'required|string|max:500',
            'doctor_name' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'total_sessions' => 'nullable|integer|min:1|max:1000',
            'status' => 'in:active,inactive,discharged',
            'medical_notes' => 'nullable|string',
            'nationality' => 'nullable|string|max:100',
        ]);

        $validated['created_by'] = auth()->id();

        $patient = Patient::create($validated);

        return redirect()->route('patients.show', $patient)
            ->with('success', 'تم إضافة المريض بنجاح');
    }

    public function show(Patient $patient): Response
    {
        $patient->load(['sessions' => fn($q) => $q->with('therapist')->latest('session_date')->limit(10)]);

        return Inertia::render('Patients/Show', [
            'patient' => $patient,
        ]);
    }

    public function edit(Patient $patient): Response
    {
        return Inertia::render('Patients/Form', [
            'patient' => $patient,
        ]);
    }

    public function update(Request $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'birth_date' => 'required|date|before:today',
            'gender' => 'required|in:male,female',
            'national_id' => 'nullable|string|unique:patients,national_id,' . $patient->id,
            'phone' => 'required|string|max:20',
            'phone2' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'guardian_name' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'diagnosis' => 'required|string|max:500',
            'doctor_name' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'total_sessions' => 'nullable|integer|min:1|max:1000',
            'status' => 'in:active,inactive,discharged',
            'medical_notes' => 'nullable|string',
            'nationality' => 'nullable|string|max:100',
        ]);

        $patient->update($validated);

        return redirect()->route('patients.show', $patient)
            ->with('success', 'تم تحديث بيانات المريض بنجاح');
    }

    public function destroy(Patient $patient): RedirectResponse
    {
        $patient->delete();

        return redirect()->route('patients.index')
            ->with('success', 'تم حذف المريض بنجاح');
    }
}
