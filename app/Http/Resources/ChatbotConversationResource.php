<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatbotConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'session_id' => $this->session_id,
            'channel' => $this->channel,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'status_label' => $this->status instanceof \App\Enums\ConversationStatus ? $this->status->label() : null,
            'status_color' => $this->status instanceof \App\Enums\ConversationStatus ? $this->status->color() : null,
            'language' => $this->language,
            'message_count' => $this->message_count,
            'satisfaction_rating' => $this->satisfaction_rating,
            'satisfaction_comment' => $this->satisfaction_comment,
            'intent' => $this->intent,
            'current_flow' => $this->current_flow,
            'last_message_at' => $this->last_message_at?->toISOString(),
            'handed_off_at' => $this->handed_off_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),

            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ]),
            'patient' => $this->whenLoaded('patient', fn() => [
                'id' => $this->patient->id,
                'name' => $this->patient->name,
            ]),
            'agent' => $this->whenLoaded('agent', fn() => [
                'id' => $this->agent->id,
                'name' => $this->agent->name,
            ]),
            'messages' => $this->whenLoaded('messages', fn() => $this->messages->map(fn($msg) => [
                'id' => $msg->id,
                'sender_type' => $msg->sender_type instanceof \BackedEnum ? $msg->sender_type->value : $msg->sender_type,
                'content' => $msg->content,
                'message_type' => $msg->message_type instanceof \BackedEnum ? $msg->message_type->value : $msg->message_type,
                'buttons' => $msg->buttons,
                'intent' => $msg->intent,
                'confidence' => $msg->confidence,
                'read_at' => $msg->read_at?->toISOString(),
                'created_at' => $msg->created_at?->toISOString(),
            ])),
            'handoff' => $this->whenLoaded('handoff', fn() => $this->handoff ? [
                'id' => $this->handoff->id,
                'status' => $this->handoff->status,
                'reason' => $this->handoff->reason,
                'accepted_at' => $this->handoff->accepted_at?->toISOString(),
            ] : null),
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
