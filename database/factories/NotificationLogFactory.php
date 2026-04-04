<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class NotificationLogFactory extends Factory
{
    protected $model = NotificationLog::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'channel' => $this->faker->randomElement(['in_app', 'email', 'sms', 'push']),
            'event_type' => $this->faker->randomElement([
                'appointment.reminder',
                'system.alert',
                'user.welcome',
                'backup.completed',
            ]),
            'recipient_id' => null,
            'recipient_type' => 'user',
            'recipient_contact' => $this->faker->email(),
            'template_id' => null,
            'subject' => $this->faker->sentence(),
            'body' => $this->faker->paragraph(),
            'status' => 'pending',
            'sent_at' => null,
            'delivered_at' => null,
            'read_at' => null,
            'failed_at' => null,
            'failure_reason' => null,
            'external_id' => null,
            'metadata' => [],
            'retry_count' => 0,
            'scheduled_at' => null,
            'group_key' => null,
        ];
    }

    public function sent(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }

    public function delivered(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'delivered',
            'sent_at' => now()->subMinutes(5),
            'delivered_at' => now(),
        ]);
    }

    public function read(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'read',
            'sent_at' => now()->subMinutes(10),
            'delivered_at' => now()->subMinutes(8),
            'read_at' => now(),
        ]);
    }
}
