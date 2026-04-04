<?php

namespace App\Models;

use App\Enums\NotificationChannel;
use App\Enums\NotificationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class NotificationLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'notification_logs';

    protected $fillable = [
        'branch_id',
        'channel',
        'event_type',
        'recipient_id',
        'recipient_type',
        'recipient_contact',
        'template_id',
        'subject',
        'body',
        'status',
        'sent_at',
        'delivered_at',
        'read_at',
        'failed_at',
        'failure_reason',
        'external_id',
        'metadata',
        'retry_count',
        'scheduled_at',
        'group_key',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
        'failed_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'status' => NotificationStatus::class,
        'channel' => NotificationChannel::class,
    ];

    // المستخدم المستقبل
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    // القالب المستخدم
    public function template(): BelongsTo
    {
        return $this->belongsTo(NotificationTemplate::class);
    }

    // الفلترة بالحالة
    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    // الإشعارات غير المقروءة
    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at')->where('status', '!=', 'failed');
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
