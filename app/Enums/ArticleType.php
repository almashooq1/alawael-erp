<?php

namespace App\Enums;

enum ArticleType: string
{
    case ARTICLE = 'article';
    case FAQ = 'faq';
    case GUIDE = 'guide';
    case VIDEO = 'video';

    public function label(): string
    {
        return match ($this) {
            self::ARTICLE => __('enums.articletype.article'),
            self::FAQ => __('enums.articletype.faq'),
            self::GUIDE => __('enums.articletype.guide'),
            self::VIDEO => __('enums.articletype.video'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::ARTICLE => 'blue',
            self::FAQ => 'green',
            self::GUIDE => 'yellow',
            self::VIDEO => 'red',
        };
    }
}
