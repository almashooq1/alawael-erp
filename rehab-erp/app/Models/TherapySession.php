<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TherapySession extends Model
{
    use SoftDeletes;

    protected $table = 'therapy_sessions';

    protected $fillable = [
        'patient_id',
        'therapist_id',
        'session_date',
        'session_time',
        'duration',
        'type',
        'status',
        'cost',
        'paid',
        'notes',
        'progress_notes',
        'session_number',
        'created_by',
    ];

    protected $casts = [
        'session_date' => 'date',
        'paid' => 'boolean',
        'cost' => 'decimal:2',
    ];

    // ===================== Relationships =====================

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function therapist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'therapist_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ===================== Scopes =====================

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('session_date', today());
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('session_date', now()->month)
            ->whereYear('session_date', now()->year);
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('session_date', [now()->startOfWeek(), now()->endOfWeek()]);
    }
}
