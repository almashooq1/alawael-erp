<?php

namespace App\Http\Requests\KbArticle;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKbArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => 'sometimes|exists:kb_categories,id',
            'title' => 'sometimes|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'excerpt_en' => 'nullable|string|max:500',
            'content' => 'sometimes|string',
            'content_en' => 'nullable|string',
            'type' => 'sometimes|in:article,faq,guide,video',
            'video_url' => 'nullable|url',
            'status' => 'sometimes|in:draft,published,archived',
            'is_public' => 'boolean',
            'is_faq' => 'boolean',
            'is_featured' => 'boolean',
            'tags' => 'nullable|array',
            'related_article_ids' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'change_summary' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return __('validation.custom');
    }
}
