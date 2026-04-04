<?php

namespace App\Enums;

enum BackupStatus: string
{
    case PENDING = 'pending';
    case RUNNING = 'running';
    case SUCCESS = 'success';
    case FAILED = 'failed';
    case PARTIAL = 'partial';
    case EXPIRED = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => __('enums.backupstatus.pending'),
            self::RUNNING => __('enums.backupstatus.running'),
            self::SUCCESS => __('enums.backupstatus.success'),
            self::FAILED => __('enums.backupstatus.failed'),
            self::PARTIAL => __('enums.backupstatus.partial'),
            self::EXPIRED => __('enums.backupstatus.expired'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'blue',
            self::RUNNING => 'green',
            self::SUCCESS => 'yellow',
            self::FAILED => 'red',
            self::PARTIAL => 'purple',
            self::EXPIRED => 'gray',
        };
    }
}
