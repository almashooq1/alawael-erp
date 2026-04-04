<?php

namespace App\Models;

use App\Enums\NotificationChannel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class NotificationTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'notification_templates';

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'channel',
        'locale',
        'subject',
        'body',
        'body_html',
        'variables',
        'is_active',
        'event_type',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'variables' => 'array',
        'is_active' => 'boolean',
        'channel' => NotificationChannel::class,
    ];

    // سجلات الإشعارات المرسلة
    public function logs(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }

    // الفلترة بالقناة
    public function scopeForChannel(Builder $query, string $channel): Builder
    {
        return $query->where('channel', $channel)->where('is_active', true);
    }

    // الفلترة باللغة
    public function scopeForLocale(Builder $query, string $locale): Builder
    {
        return $query->where('locale', $locale);
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
