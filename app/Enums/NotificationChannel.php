<?php

namespace App\Enums;

enum NotificationChannel: string
{
    case IN_APP = 'in_app';
    case PUSH = 'push';
    case SMS = 'sms';
    case EMAIL = 'email';
    case WHATSAPP = 'whatsapp';

    public function label(): string
    {
        return match ($this) {
            self::IN_APP => __('enums.notificationchannel.in_app'),
            self::PUSH => __('enums.notificationchannel.push'),
            self::SMS => __('enums.notificationchannel.sms'),
            self::EMAIL => __('enums.notificationchannel.email'),
            self::WHATSAPP => __('enums.notificationchannel.whatsapp'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::IN_APP => 'blue',
            self::PUSH => 'green',
            self::SMS => 'yellow',
            self::EMAIL => 'red',
            self::WHATSAPP => 'purple',
        };
    }
}
