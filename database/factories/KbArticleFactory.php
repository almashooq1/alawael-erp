<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\KbArticle;
use App\Models\KbCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class KbArticleFactory extends Factory
{
    protected $model = KbArticle::class;

    public function definition(): array
    {
        $title = $this->faker->sentence(4);

        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'category_id' => KbCategory::factory(),
            'title' => $title,
            'title_en' => $this->faker->sentence(4),
            'slug' => Str::slug($title) . '-' . $this->faker->unique()->numberBetween(1, 99999),
            'excerpt' => $this->faker->paragraph(),
            'excerpt_en' => $this->faker->paragraph(),
            'content' => $this->faker->paragraphs(3, true),
            'content_en' => $this->faker->paragraphs(3, true),
            'type' => 'article',
            'video_url' => null,
            'status' => 'draft',
            'is_public' => true,
            'is_featured' => false,
            'is_faq' => false,
            'tags' => [],
            'related_article_ids' => [],
            'view_count' => 0,
            'helpful_count' => 0,
            'not_helpful_count' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'meta_keywords' => null,
            'published_at' => null,
            'published_by' => null,
            'version' => 1,
        ];
    }

    public function published(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function faq(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_faq' => true,
            'status' => 'published',
            'published_at' => now(),
        ]);
    }
}
