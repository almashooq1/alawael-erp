<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KbArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'category_id' => $this->category_id,
            'title' => $this->title,
            'title_en' => $this->title_en,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'excerpt_en' => $this->excerpt_en,
            'content' => $this->when($request->routeIs('*.show', '*.edit'), $this->content),
            'content_en' => $this->when($request->routeIs('*.show', '*.edit'), $this->content_en),
            'type' => $this->type instanceof \BackedEnum ? $this->type->value : $this->type,
            'type_label' => $this->type instanceof \App\Enums\ArticleType ? $this->type->label() : null,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'status_label' => $this->status instanceof \App\Enums\ArticleStatus ? $this->status->label() : null,
            'status_color' => $this->status instanceof \App\Enums\ArticleStatus ? $this->status->color() : null,
            'is_public' => $this->is_public,
            'is_featured' => $this->is_featured,
            'is_faq' => $this->is_faq,
            'tags' => $this->tags,
            'video_url' => $this->video_url,
            'view_count' => $this->view_count,
            'helpful_count' => $this->helpful_count,
            'not_helpful_count' => $this->not_helpful_count,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'meta_keywords' => $this->meta_keywords,
            'published_at' => $this->published_at?->toISOString(),
            'version' => $this->version,

            'category' => $this->whenLoaded('category', fn() => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'publisher' => $this->whenLoaded('publisher', fn() => [
                'id' => $this->publisher->id,
                'name' => $this->publisher->name,
            ]),
            'branch' => $this->whenLoaded('branch', fn() => [
                'id' => $this->branch->id,
                'name' => $this->branch->name,
            ]),
            'created_by' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
