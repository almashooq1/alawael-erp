<?php

namespace App\Models;

use App\Enums\NotificationChannel;
use App\Enums\NotificationFrequency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class UserNotificationPreference extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'user_notification_preferences';

    protected $fillable = [
        'branch_id',
        'user_id',
        'channel',
        'event_type',
        'is_enabled',
        'schedule',
        'frequency',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'schedule' => 'array',
        'is_enabled' => 'boolean',
        'channel' => NotificationChannel::class,
        'frequency' => NotificationFrequency::class,
    ];

    // المستخدم
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            $m->fill([
                'uuid' => $m->uuid ?? (string) Str::uuid(),
                'created_by' => $m->created_by ?? auth()->id(),
                'branch_id' => $m->branch_id ?? session('current_branch_id'),
            ]);
        });
        static::updating(fn(self $m) => $m->updated_by = auth()->id());
    }
}
