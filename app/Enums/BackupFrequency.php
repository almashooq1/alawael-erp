<?php

namespace App\Enums;

enum BackupFrequency: string
{
    case HOURLY = 'hourly';
    case DAILY = 'daily';
    case WEEKLY = 'weekly';
    case MONTHLY = 'monthly';
    case CUSTOM = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::HOURLY => __('enums.backupfrequency.hourly'),
            self::DAILY => __('enums.backupfrequency.daily'),
            self::WEEKLY => __('enums.backupfrequency.weekly'),
            self::MONTHLY => __('enums.backupfrequency.monthly'),
            self::CUSTOM => __('enums.backupfrequency.custom'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::HOURLY => 'blue',
            self::DAILY => 'green',
            self::WEEKLY => 'yellow',
            self::MONTHLY => 'red',
            self::CUSTOM => 'purple',
        };
    }
}
