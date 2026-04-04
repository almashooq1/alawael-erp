<?php

namespace App\Enums;

enum BackupType: string
{
    case FULL = 'full';
    case INCREMENTAL = 'incremental';
    case DIFFERENTIAL = 'differential';
    case MANUAL = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::FULL => __('enums.backuptype.full'),
            self::INCREMENTAL => __('enums.backuptype.incremental'),
            self::DIFFERENTIAL => __('enums.backuptype.differential'),
            self::MANUAL => __('enums.backuptype.manual'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::FULL => 'blue',
            self::INCREMENTAL => 'green',
            self::DIFFERENTIAL => 'yellow',
            self::MANUAL => 'red',
        };
    }
}
