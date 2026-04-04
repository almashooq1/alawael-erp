<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'is_active',
        'last_login',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    // ===================== Scopes =====================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeTherapists($query)
    {
        return $query->where('role', 'therapist');
    }

    // ===================== Relations =====================

    public function sessions()
    {
        return $this->hasMany(TherapySession::class, 'therapist_id');
    }

    // ===================== Helpers =====================

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function getRoleLabelAttribute(): string
    {
        return match ($this->role) {
            'admin' => 'مدير',
            'therapist' => 'معالج',
            'receptionist' => 'موظف استقبال',
            'accountant' => 'محاسب',
            default => $this->role,
        };
    }
}
