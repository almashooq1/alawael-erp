<?php

namespace App\Enums;

enum AlertSeverity: string
{
    case CRITICAL = 'critical';
    case WARNING = 'warning';
    case INFO = 'info';

    public function label(): string
    {
        return match ($this) {
            self::CRITICAL => __('enums.alertseverity.critical'),
            self::WARNING => __('enums.alertseverity.warning'),
            self::INFO => __('enums.alertseverity.info'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::CRITICAL => 'red',
            self::WARNING => 'yellow',
            self::INFO => 'blue',
        };
    }
}
