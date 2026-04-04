<?php

namespace Database\Factories;

use App\Enums\BackupFrequency;
use App\Enums\BackupType;
use App\Models\BackupSchedule;
use App\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class BackupScheduleFactory extends Factory
{
    protected $model = BackupSchedule::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'name' => $this->faker->words(3, true),
            'type' => $this->faker->randomElement(BackupType::cases())->value,
            'frequency' => $this->faker->randomElement(BackupFrequency::cases())->value,
            'cron_expression' => '0 2 * * *',
            'run_at' => '02:00:00',
            'days_of_week' => null,
            'day_of_month' => null,
            'backup_database' => true,
            'backup_files' => true,
            'backup_config' => false,
            'destination_ids' => [1],
            'retention_days' => $this->faker->numberBetween(7, 90),
            'encrypt' => true,
            'compress' => true,
            'verify_after' => true,
            'is_active' => true,
            'notify_on_failure' => true,
            'notify_on_success' => false,
            'notification_channels' => ['email'],
            'next_run_at' => now()->addDay(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }
}
