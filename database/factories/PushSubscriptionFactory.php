<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PushSubscriptionFactory extends Factory
{
    protected $model = PushSubscription::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'user_id' => User::factory(),
            'fcm_token' => 'fcm_' . $this->faker->uuid() . '_' . $this->faker->uuid(),
            'device_type' => $this->faker->randomElement(['android', 'ios', 'web']),
            'device_name' => $this->faker->userAgent(),
            'last_used_at' => now(),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function android(): static
    {
        return $this->state(fn(array $attributes) => [
            'device_type' => 'android',
        ]);
    }

    public function ios(): static
    {
        return $this->state(fn(array $attributes) => [
            'device_type' => 'ios',
        ]);
    }
}
