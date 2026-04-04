<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_number',
        'patient_id',
        'session_id',
        'amount',
        'discount',
        'tax',
        'total',
        'status',
        'payment_method',
        'due_date',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    // ============================================================
    // Relations
    // ============================================================
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function session()
    {
        return $this->belongsTo(TherapySession::class, 'session_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ============================================================
    // Scopes
    // ============================================================
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue');
    }

    // ============================================================
    // Accessors
    // ============================================================
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'paid' => 'مدفوعة',
            'pending' => 'معلقة',
            'cancelled' => 'ملغاة',
            'overdue' => 'متأخرة',
            default => $this->status,
        };
    }

    public function getPaymentMethodLabelAttribute(): string
    {
        return match ($this->payment_method) {
            'cash' => 'نقداً',
            'card' => 'بطاقة',
            'transfer' => 'تحويل',
            'insurance' => 'تأمين',
            default => '-',
        };
    }

    // ============================================================
    // Boot — auto invoice number
    // ============================================================
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invoice) {
            if (empty($invoice->invoice_number)) {
                $last = static::withTrashed()->max('id') ?? 0;
                $invoice->invoice_number = 'INV-' . str_pad($last + 1, 5, '0', STR_PAD_LEFT);
            }
        });
    }
}
