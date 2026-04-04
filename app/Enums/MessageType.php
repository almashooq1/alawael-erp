<?php

namespace App\Enums;

enum MessageType: string
{
    case TEXT = 'text';
    case BUTTON = 'button';
    case CARD = 'card';
    case QUICK_REPLY = 'quick_reply';
    case FILE = 'file';
    case TYPING = 'typing';

    public function label(): string
    {
        return match ($this) {
            self::TEXT => __('enums.messagetype.text'),
            self::BUTTON => __('enums.messagetype.button'),
            self::CARD => __('enums.messagetype.card'),
            self::QUICK_REPLY => __('enums.messagetype.quick_reply'),
            self::FILE => __('enums.messagetype.file'),
            self::TYPING => __('enums.messagetype.typing'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::TEXT => 'blue',
            self::BUTTON => 'green',
            self::CARD => 'yellow',
            self::QUICK_REPLY => 'red',
            self::FILE => 'purple',
            self::TYPING => 'gray',
        };
    }
}
