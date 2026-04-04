<?php

namespace App\Enums;

enum NotificationStatus: string
{
    case PENDING = 'pending';
    case SENT = 'sent';
    case DELIVERED = 'delivered';
    case READ = 'read';
    case FAILED = 'failed';
    case SCHEDULED = 'scheduled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => __('enums.notificationstatus.pending'),
            self::SENT => __('enums.notificationstatus.sent'),
            self::DELIVERED => __('enums.notificationstatus.delivered'),
            self::READ => __('enums.notificationstatus.read'),
            self::FAILED => __('enums.notificationstatus.failed'),
            self::SCHEDULED => __('enums.notificationstatus.scheduled'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'blue',
            self::SENT => 'green',
            self::DELIVERED => 'yellow',
            self::READ => 'red',
            self::FAILED => 'purple',
            self::SCHEDULED => 'gray',
        };
    }
}
