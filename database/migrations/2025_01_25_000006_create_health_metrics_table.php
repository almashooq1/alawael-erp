<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('health_metrics', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('metric_type'); // cpu|memory|disk|network|response_time
            $table->string('host')->nullable();
            $table->decimal('value', 15, 4);
            $table->string('unit')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('recorded_at');
            $table->string('environment')->default('production');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index('metric_type');
            $table->index('recorded_at');
            $table->index(['metric_type', 'recorded_at']);
            $table->index('host');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('health_metrics');
    }
};
