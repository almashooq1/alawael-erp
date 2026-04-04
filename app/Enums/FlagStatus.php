<?php

namespace App\Enums;

enum FlagStatus: string
{
    case ENABLED = 'enabled';
    case DISABLED = 'disabled';
    case ROLLOUT = 'rollout';

    public function label(): string
    {
        return match ($this) {
            self::ENABLED => __('enums.flagstatus.enabled'),
            self::DISABLED => __('enums.flagstatus.disabled'),
            self::ROLLOUT => __('enums.flagstatus.rollout'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::ENABLED => 'green',
            self::DISABLED => 'red',
            self::ROLLOUT => 'yellow',
        };
    }
}
