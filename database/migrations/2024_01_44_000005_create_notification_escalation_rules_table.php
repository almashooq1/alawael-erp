<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notification_escalation_rules', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('event_type');
            $table->string('trigger_channel');
            $table->string('escalate_to_channel');
            $table->integer('wait_minutes')->default(30);
            $table->string('condition')->default('unread'); // unread, undelivered
            $table->boolean('is_active')->default(true);
            $table->integer('max_escalations')->default(1);
            $table->index(['event_type', 'is_active']);

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_escalation_rules');
    }
};
