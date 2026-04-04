<?php

namespace App\Enums;

enum AlertCondition: string
{
    case GREATER_THAN = 'gt';
    case LESS_THAN = 'lt';
    case EQUALS = 'eq';
    case GREATER_THAN_OR_EQUAL = 'gte';
    case LESS_THAN_OR_EQUAL = 'lte';

    public function label(): string
    {
        return match ($this) {
            self::GREATER_THAN => __('enums.alertcondition.gt'),
            self::LESS_THAN => __('enums.alertcondition.lt'),
            self::EQUALS => __('enums.alertcondition.eq'),
            self::GREATER_THAN_OR_EQUAL => __('enums.alertcondition.gte'),
            self::LESS_THAN_OR_EQUAL => __('enums.alertcondition.lte'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::GREATER_THAN => 'blue',
            self::LESS_THAN => 'green',
            self::EQUALS => 'yellow',
            self::GREATER_THAN_OR_EQUAL => 'red',
            self::LESS_THAN_OR_EQUAL => 'purple',
        };
    }
}
