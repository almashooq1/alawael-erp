<?php

namespace Database\Factories;

use App\Enums\DeploymentEnvironment;
use App\Enums\DeploymentStatus;
use App\Models\Branch;
use App\Models\Deployment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class DeploymentFactory extends Factory
{
    protected $model = Deployment::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'version' => $this->faker->numerify('#.#.#'),
            'environment' => $this->faker->randomElement(DeploymentEnvironment::cases())->value,
            'status' => DeploymentStatus::PENDING->value,
            'commit_hash' => substr(sha1($this->faker->uuid()), 0, 40),
            'branch' => 'main',
            'deployed_by' => null,
            'release_notes' => null,
            'changelog' => null,
            'migrations_run' => false,
            'rolled_back' => false,
            'started_at' => now(),
            'health_check_results' => null,
        ];
    }

    public function successful(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => DeploymentStatus::SUCCESS->value,
            'completed_at' => now(),
            'migrations_run' => true,
        ]);
    }

    public function running(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => DeploymentStatus::RUNNING->value,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => DeploymentStatus::FAILED->value,
            'error_message' => $this->faker->sentence(),
            'completed_at' => now(),
        ]);
    }

    public function production(): static
    {
        return $this->state(fn(array $attributes) => [
            'environment' => DeploymentEnvironment::PRODUCTION->value,
        ]);
    }

    public function staging(): static
    {
        return $this->state(fn(array $attributes) => [
            'environment' => DeploymentEnvironment::STAGING->value,
        ]);
    }
}
