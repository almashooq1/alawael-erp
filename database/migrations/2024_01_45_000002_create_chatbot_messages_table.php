<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('chatbot_messages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained('chatbot_conversations')->cascadeOnDelete();
            $table->string('sender_type'); // user, bot, agent
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('content');
            $table->string('message_type')->default('text'); // text, button, card, quick_reply, file
            $table->json('attachments')->nullable();
            $table->json('buttons')->nullable();
            $table->json('metadata')->nullable();
            $table->string('intent')->nullable();
            $table->decimal('confidence', 5, 4)->nullable();
            $table->boolean('was_helpful')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->index(['conversation_id', 'created_at']);
            $table->index('sender_type');

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_messages');
    }
};
