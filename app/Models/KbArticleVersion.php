<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class KbArticleVersion extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kb_article_versions';

    protected $fillable = [
        'branch_id',
        'article_id',
        'version_number',
        'title',
        'content',
        'change_summary',
        'created_by_user',
        'created_by',
        'updated_by',
    ];

    // المقالة
    public function article(): BelongsTo
    {
        return $this->belongsTo(KbArticle::class);
    }

    // المنشئ
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user');
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
