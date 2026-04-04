<?php

namespace App\Models;

use App\Enums\MessageSenderType;
use App\Enums\MessageType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ChatbotMessage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'chatbot_messages';

    protected $fillable = [
        'branch_id',
        'conversation_id',
        'sender_type',
        'sender_id',
        'content',
        'message_type',
        'attachments',
        'buttons',
        'metadata',
        'intent',
        'confidence',
        'was_helpful',
        'read_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'attachments' => 'array',
        'buttons' => 'array',
        'metadata' => 'array',
        'was_helpful' => 'boolean',
        'read_at' => 'datetime',
        'sender_type' => MessageSenderType::class,
        'message_type' => MessageType::class,
    ];

    // المحادثة
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatbotConversation::class);
    }

    // المرسل
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
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
