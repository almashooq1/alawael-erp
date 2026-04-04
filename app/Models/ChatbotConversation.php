<?php

namespace App\Models;

use App\Enums\ConversationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ChatbotConversation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'chatbot_conversations';

    protected $fillable = [
        'branch_id',
        'session_id',
        'user_id',
        'patient_id',
        'channel',
        'status',
        'language',
        'assigned_to',
        'handed_off_at',
        'resolved_at',
        'last_message_at',
        'message_count',
        'satisfaction_rating',
        'satisfaction_comment',
        'context',
        'intent',
        'current_flow',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'context' => 'array',
        'handed_off_at' => 'datetime',
        'resolved_at' => 'datetime',
        'last_message_at' => 'datetime',
        'status' => ConversationStatus::class,
    ];

    // الرسائل
    public function messages(): HasMany
    {
        return $this->hasMany(ChatbotMessage::class, 'conversation_id');
    }

    // المستخدم
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // المريض
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    // الموظف المسؤول
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // طلب التحويل
    public function handoff(): HasOne
    {
        return $this->hasOne(ChatbotHandoff::class, 'conversation_id');
    }

    // المحادثات النشطة
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', ConversationStatus::ACTIVE);
    }

    // في انتظار الموظف
    public function scopeHandedOff(Builder $query): Builder
    {
        return $query->where('status', ConversationStatus::HANDED_OFF);
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
