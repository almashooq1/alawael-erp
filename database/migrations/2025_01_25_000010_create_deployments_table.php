<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('deployments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('version');
            $table->string('environment'); // production|staging|development
            $table->string('status'); // pending|running|success|failed|rolled_back
            $table->string('commit_hash', 40)->nullable();
            $table->string('branch')->nullable();
            $table->string('deployed_by')->nullable();
            $table->text('release_notes')->nullable();
            $table->text('changelog')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->text('deployment_log')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('migrations_run')->default(false);
            $table->json('health_check_results')->nullable();
            $table->boolean('rolled_back')->default(false);
            $table->timestamp('rolled_back_at')->nullable();
            $table->string('previous_version')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index('environment');
            $table->index('status');
            $table->index('version');
            $table->index('started_at');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deployments');
    }
};
