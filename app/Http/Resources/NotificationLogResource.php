<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'channel' => $this->channel instanceof \BackedEnum ? $this->channel->value : $this->channel,
            'channel_label' => $this->channel instanceof \App\Enums\NotificationChannel ? $this->channel->label() : null,
            'channel_color' => $this->channel instanceof \App\Enums\NotificationChannel ? $this->channel->color() : null,
            'event_type' => $this->event_type,
            'recipient_id' => $this->recipient_id,
            'recipient_type' => $this->recipient_type,
            'recipient_contact' => $this->recipient_contact,
            'template_id' => $this->template_id,
            'subject' => $this->subject,
            'body' => $this->body,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'status_label' => $this->status instanceof \App\Enums\NotificationStatus ? $this->status->label() : null,
            'status_color' => $this->status instanceof \App\Enums\NotificationStatus ? $this->status->color() : null,
            'sent_at' => $this->sent_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'read_at' => $this->read_at?->toISOString(),
            'failed_at' => $this->failed_at?->toISOString(),
            'failure_reason' => $this->failure_reason,
            'external_id' => $this->external_id,
            'retry_count' => $this->retry_count,
            'scheduled_at' => $this->scheduled_at?->toISOString(),
            'group_key' => $this->group_key,
            'metadata' => $this->metadata,
            'is_read' => !is_null($this->read_at),

            'recipient' => $this->whenLoaded('recipient', fn() => [
                'id' => $this->recipient->id,
                'name' => $this->recipient->name,
            ]),
            'template' => $this->whenLoaded('template', fn() => [
                'id' => $this->template->id,
                'name' => $this->template->name,
                'code' => $this->template->code,
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
