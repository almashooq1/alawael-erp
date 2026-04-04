<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use App\Models\UserNotificationPreference;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserNotificationPreferenceFactory extends Factory
{
    protected $model = UserNotificationPreference::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'user_id' => User::factory(),
            'channel' => $this->faker->randomElement(['in_app', 'email', 'sms', 'push']),
            'event_type' => $this->faker->randomElement([
                'appointment.reminder',
                'system.alert',
                'user.welcome',
                'backup.completed',
            ]),
            'is_enabled' => true,
            'schedule' => null,
            'frequency' => 'instant',
        ];
    }

    public function disabled(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_enabled' => false,
        ]);
    }
}
