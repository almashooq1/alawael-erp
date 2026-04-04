<?php

namespace App\Enums;

enum MessageSenderType: string
{
    case USER = 'user';
    case BOT = 'bot';
    case AGENT = 'agent';

    public function label(): string
    {
        return match ($this) {
            self::USER => __('enums.messagesendertype.user'),
            self::BOT => __('enums.messagesendertype.bot'),
            self::AGENT => __('enums.messagesendertype.agent'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::USER => 'blue',
            self::BOT => 'green',
            self::AGENT => 'yellow',
        };
    }
}
