<?php

namespace Database\Factories;

use App\Enums\BackupStatus;
use App\Enums\BackupType;
use App\Models\BackupJob;
use App\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class BackupJobFactory extends Factory
{
    protected $model = BackupJob::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'type' => $this->faker->randomElement(BackupType::cases()),
            'status' => BackupStatus::PENDING,
            'storage_path' => 'backups/' . $this->faker->uuid() . '.sql.gz',
            'filename' => $this->faker->uuid() . '.sql.gz',
            'size_bytes' => $this->faker->numberBetween(1024, 1024 * 1024 * 100),
            'checksum' => $this->faker->sha256(),
            'encrypted' => false,
            'compressed' => true,
            'verified' => false,
            'destinations' => ['local'],
            'destination_statuses' => [],
            'metadata' => [],
            'started_at' => now(),
        ];
    }

    public function successful(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => BackupStatus::SUCCESS,
            'completed_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => BackupStatus::FAILED,
            'error_message' => $this->faker->sentence(),
        ]);
    }
}
