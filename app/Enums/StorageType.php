<?php

namespace App\Enums;

enum StorageType: string
{
    case LOCAL = 'local';
    case S3 = 's3';
    case GCS = 'gcs';
    case SFTP = 'sftp';
    case B2 = 'b2';

    public function label(): string
    {
        return match ($this) {
            self::LOCAL => __('enums.storagetype.local'),
            self::S3 => __('enums.storagetype.s3'),
            self::GCS => __('enums.storagetype.gcs'),
            self::SFTP => __('enums.storagetype.sftp'),
            self::B2 => __('enums.storagetype.b2'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::LOCAL => 'blue',
            self::S3 => 'green',
            self::GCS => 'yellow',
            self::SFTP => 'red',
            self::B2 => 'purple',
        };
    }
}
