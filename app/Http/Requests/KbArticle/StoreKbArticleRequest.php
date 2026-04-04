<?php

namespace App\Http\Requests\KbArticle;

use Illuminate\Foundation\Http\FormRequest;

class StoreKbArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => 'required|exists:kb_categories,id',
            'title' => 'required|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255|unique:kb_articles,slug',
            'excerpt' => 'nullable|string|max:500',
            'excerpt_en' => 'nullable|string|max:500',
            'content' => 'required|string',
            'content_en' => 'nullable|string',
            'type' => 'required|in:article,faq,guide,video',
            'video_url' => 'nullable|url',
            'status' => 'required|in:draft,published,archived',
            'is_public' => 'boolean',
            'is_faq' => 'boolean',
            'is_featured' => 'boolean',
            'tags' => 'nullable|array',
            'related_article_ids' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return __('validation.custom');
    }
}
