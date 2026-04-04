<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\TherapySession;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['patient', 'session'])
            ->orderByDesc('created_at');

        // فلتر الحالة
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // فلتر البحث
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', fn($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        $invoices = $query->paginate(15)->withQueryString();

        // KPIs
        $stats = [
            'total_invoices' => Invoice::count(),
            'paid' => Invoice::paid()->count(),
            'pending' => Invoice::pending()->count(),
            'overdue' => Invoice::overdue()->count(),
            'total_revenue' => Invoice::paid()->sum('total'),
            'pending_amount' => Invoice::pending()->sum('total'),
        ];

        $patients = Patient::orderBy('name')->get(['id', 'name', 'patient_number']);
        $sessions = TherapySession::with('patient')
            ->where('status', 'completed')
            ->orderByDesc('session_date')
            ->get(['id', 'patient_id', 'session_date', 'type']);

        return Inertia::render('Finance/Index', [
            'invoices' => $invoices,
            'stats' => $stats,
            'patients' => $patients,
            'sessions' => $sessions,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'session_id' => 'nullable|exists:therapy_sessions,id',
            'amount' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
            'payment_method' => 'nullable|in:cash,card,transfer,insurance',
        ]);

        $amount = (float) $data['amount'];
        $discount = (float) ($data['discount'] ?? 0);
        $tax = (float) ($data['tax'] ?? 0);
        $total = $amount - $discount + $tax;

        Invoice::create([
            ...$data,
            'total' => max(0, $total),
            'discount' => $discount,
            'tax' => $tax,
            'status' => 'pending',
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'تم إنشاء الفاتورة بنجاح');
    }

    public function pay(Request $request, Invoice $invoice)
    {
        if ($invoice->status === 'paid') {
            return back()->with('error', 'الفاتورة مدفوعة بالفعل');
        }

        $data = $request->validate([
            'payment_method' => 'required|in:cash,card,transfer,insurance',
        ]);

        $invoice->update([
            'status' => 'paid',
            'payment_method' => $data['payment_method'],
            'paid_at' => now(),
        ]);

        return back()->with('success', 'تم تسجيل الدفع بنجاح');
    }

    public function cancel(Invoice $invoice)
    {
        if (in_array($invoice->status, ['paid', 'cancelled'])) {
            return back()->with('error', 'لا يمكن إلغاء هذه الفاتورة');
        }

        $invoice->update(['status' => 'cancelled']);

        return back()->with('success', 'تم إلغاء الفاتورة');
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return back()->with('success', 'تم حذف الفاتورة');
    }
}
