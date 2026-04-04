<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\KbArticle;
use App\Models\KbArticleVersion;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class KbArticleVersionFactory extends Factory
{
    protected $model = KbArticleVersion::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'article_id' => KbArticle::factory(),
            'version_number' => $this->faker->numberBetween(1, 10),
            'title' => $this->faker->sentence(4),
            'content' => $this->faker->paragraphs(3, true),
            'change_summary' => $this->faker->sentence(),
            'created_by_user' => null,
        ];
    }
}
