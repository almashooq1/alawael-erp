<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('performance_alerts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('name');
            $table->string('metric_type');
            $table->string('condition'); // gt|lt|eq|gte|lte
            $table->decimal('threshold', 15, 4);
            $table->string('severity'); // critical|warning|info
            $table->integer('duration_minutes')->default(5);
            $table->json('notification_channels');
            $table->json('notify_users')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_silenced')->default(false);
            $table->timestamp('silenced_until')->nullable();
            $table->timestamp('last_triggered_at')->nullable();
            $table->integer('trigger_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index('metric_type');
            $table->index('is_active');
            $table->index('severity');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_alerts');
    }
};
