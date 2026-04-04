<?php

namespace App\Enums;

enum MetricType: string
{
    case CPU = 'cpu';
    case MEMORY = 'memory';
    case DISK = 'disk';
    case NETWORK = 'network';
    case RESPONSE_TIME = 'response_time';
    case THROUGHPUT = 'throughput';
    case ERROR_RATE = 'error_rate';
    case QUEUE_SIZE = 'queue_size';
    case CACHE_HIT_RATE = 'cache_hit_rate';
    case DB_CONNECTIONS = 'db_connections';

    public function label(): string
    {
        return match ($this) {
            self::CPU => __('enums.metrictype.cpu'),
            self::MEMORY => __('enums.metrictype.memory'),
            self::DISK => __('enums.metrictype.disk'),
            self::NETWORK => __('enums.metrictype.network'),
            self::RESPONSE_TIME => __('enums.metrictype.response_time'),
            self::THROUGHPUT => __('enums.metrictype.throughput'),
            self::ERROR_RATE => __('enums.metrictype.error_rate'),
            self::QUEUE_SIZE => __('enums.metrictype.queue_size'),
            self::CACHE_HIT_RATE => __('enums.metrictype.cache_hit_rate'),
            self::DB_CONNECTIONS => __('enums.metrictype.db_connections'),
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::CPU => 'blue',
            self::MEMORY => 'green',
            self::DISK => 'yellow',
            self::NETWORK => 'red',
            self::RESPONSE_TIME => 'purple',
            self::THROUGHPUT => 'gray',
            self::ERROR_RATE => 'indigo',
            self::QUEUE_SIZE => 'pink',
            self::CACHE_HIT_RATE => 'orange',
            self::DB_CONNECTIONS => 'teal',
        };
    }
}
