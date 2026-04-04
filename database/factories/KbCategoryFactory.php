<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\KbCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class KbCategoryFactory extends Factory
{
    protected $model = KbCategory::class;

    public function definition(): array
    {
        $name = $this->faker->words(2, true);

        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'name' => $name,
            'name_en' => $this->faker->words(2, true),
            'slug' => Str::slug($name) . '-' . $this->faker->unique()->numberBetween(1, 9999),
            'description' => $this->faker->sentence(),
            'description_en' => $this->faker->sentence(),
            'icon' => 'book',
            'color' => $this->faker->hexColor(),
            'parent_id' => null,
            'sort_order' => $this->faker->numberBetween(1, 100),
            'is_public' => true,
            'is_active' => true,
            'article_count' => 0,
        ];
    }

    public function private(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_public' => false,
        ]);
    }
}
