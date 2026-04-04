<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\ChatbotConversation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ChatbotConversationFactory extends Factory
{
    protected $model = ChatbotConversation::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'session_id' => 'session_' . $this->faker->uuid(),
            'user_id' => null,
            'patient_id' => null,
            'channel' => $this->faker->randomElement(['web', 'whatsapp', 'mobile']),
            'status' => 'active',
            'language' => $this->faker->randomElement(['ar', 'en']),
            'assigned_to' => null,
            'handed_off_at' => null,
            'resolved_at' => null,
            'last_message_at' => now(),
            'message_count' => 0,
            'satisfaction_rating' => null,
            'satisfaction_comment' => null,
            'context' => [],
            'intent' => null,
            'current_flow' => null,
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);
    }

    public function handedOff(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'handed_off',
            'handed_off_at' => now(),
        ]);
    }

    public function abandoned(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'abandoned',
            'last_message_at' => now()->subHours(26),
        ]);
    }
}
