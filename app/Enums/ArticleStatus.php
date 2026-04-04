<?php

namespace App\Enums;

enum ArticleStatus: string
{
    case DRAFT = 'draft';
    case PUBLISHED = 'published';
    case ARCHIVED = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => __('enums.articlestatus.draft'),
            self::PUBLISHED => __('enums.articlestatus.published'),
            self::ARCHIVED => __('enums.articlestatus.archived'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::DRAFT => 'blue',
            self::PUBLISHED => 'green',
            self::ARCHIVED => 'yellow',
        };
    }
}
