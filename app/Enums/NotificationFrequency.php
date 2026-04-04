<?php

namespace App\Enums;

enum NotificationFrequency: string
{
    case IMMEDIATE = 'immediate';
    case DIGEST_DAILY = 'digest_daily';
    case DIGEST_WEEKLY = 'digest_weekly';

    public function label(): string
    {
        return match ($this) {
            self::IMMEDIATE => __('enums.notificationfrequency.immediate'),
            self::DIGEST_DAILY => __('enums.notificationfrequency.digest_daily'),
            self::DIGEST_WEEKLY => __('enums.notificationfrequency.digest_weekly'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::IMMEDIATE => 'blue',
            self::DIGEST_DAILY => 'green',
            self::DIGEST_WEEKLY => 'yellow',
        };
    }
}
