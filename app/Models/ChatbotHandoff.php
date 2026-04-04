<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ChatbotHandoff extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'chatbot_handoffs';

    protected $fillable = [
        'branch_id',
        'conversation_id',
        'agent_id',
        'reason',
        'status',
        'accepted_at',
        'completed_at',
        'agent_notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatbotConversation::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
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
