<?php

namespace App\Enums;

enum DeploymentEnvironment: string
{
    case DEVELOPMENT = 'development';
    case STAGING = 'staging';
    case PRODUCTION = 'production';

    public function label(): string
    {
        return match ($this) {
            self::DEVELOPMENT => __('enums.deploymentenvironment.development'),
            self::STAGING => __('enums.deploymentenvironment.staging'),
            self::PRODUCTION => __('enums.deploymentenvironment.production'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::DEVELOPMENT => 'blue',
            self::STAGING => 'green',
            self::PRODUCTION => 'yellow',
        };
    }
}
