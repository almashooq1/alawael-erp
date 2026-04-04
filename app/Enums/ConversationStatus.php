<?php

namespace App\Enums;

enum ConversationStatus: string
{
    case ACTIVE = 'active';
    case RESOLVED = 'resolved';
    case HANDED_OFF = 'handed_off';
    case ABANDONED = 'abandoned';

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE => __('enums.conversationstatus.active'),
            self::RESOLVED => __('enums.conversationstatus.resolved'),
            self::HANDED_OFF => __('enums.conversationstatus.handed_off'),
            self::ABANDONED => __('enums.conversationstatus.abandoned'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::ACTIVE => 'blue',
            self::RESOLVED => 'green',
            self::HANDED_OFF => 'yellow',
            self::ABANDONED => 'red',
        };
    }
}
