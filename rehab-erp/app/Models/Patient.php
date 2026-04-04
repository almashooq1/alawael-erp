<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Patient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'patient_number',
        'name',
        'birth_date',
        'gender',
        'national_id',
        'nationality',
        'phone',
        'phone2',
        'email',
        'guardian_name',
        'address',
        'diagnosis',
        'doctor_name',
        'start_date',
        'total_sessions',
        'status',
        'medical_notes',
        'created_by',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'start_date' => 'date',
    ];

    protected $appends = ['age', 'sessions_count'];

    // ===================== Relationships =====================

    public function sessions(): HasMany
    {
        return $this->hasMany(TherapySession::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ===================== Accessors =====================

    public function getAgeAttribute(): int
    {
        return $this->birth_date ? $this->birth_date->age : 0;
    }

    public function getSessionsCountAttribute(): int
    {
        return $this->sessions()->count();
    }

    // ===================== Scopes =====================

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByGender($query, string $gender)
    {
        return $query->where('gender', $gender);
    }

    // ===================== Boot =====================

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Patient $patient) {
            if (empty($patient->patient_number)) {
                $last = static::withTrashed()->orderBy('id', 'desc')->first();
                $next = $last ? ($last->id + 1) : 1;
                $patient->patient_number = 'PT-' . str_pad($next, 4, '0', STR_PAD_LEFT);
            }
        });
    }
}
