<?php

namespace App\Enums;

enum DeploymentStatus: string
{
    case PENDING = 'pending';
    case RUNNING = 'running';
    case SUCCESS = 'success';
    case FAILED = 'failed';
    case ROLLED_BACK = 'rolled_back';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => __('enums.deploymentstatus.pending'),
            self::RUNNING => __('enums.deploymentstatus.running'),
            self::SUCCESS => __('enums.deploymentstatus.success'),
            self::FAILED => __('enums.deploymentstatus.failed'),
            self::ROLLED_BACK => __('enums.deploymentstatus.rolled_back'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'blue',
            self::RUNNING => 'green',
            self::SUCCESS => 'yellow',
            self::FAILED => 'red',
            self::ROLLED_BACK => 'purple',
        };
    }
}
