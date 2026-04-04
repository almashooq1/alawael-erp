<?php

namespace Database\Factories;

use App\Enums\FlagStatus;
use App\Models\Branch;
use App\Models\FeatureFlag;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class FeatureFlagFactory extends Factory
{
    protected $model = FeatureFlag::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'key' => $this->faker->unique()->slug(2),
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'status' => FlagStatus::DISABLED,
            'rollout_percentage' => 0,
            'allowed_users' => [],
            'allowed_branches' => [],
            'allowed_environments' => [],
            'type' => 'boolean',
        ];
    }

    public function enabled(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => FlagStatus::ENABLED,
            'enabled_at' => now(),
        ]);
    }

    public function rollout(int $percentage = 50): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => FlagStatus::ROLLOUT,
            'rollout_percentage' => $percentage,
        ]);
    }
}
