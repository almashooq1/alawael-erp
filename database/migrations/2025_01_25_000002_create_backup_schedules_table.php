<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('backup_schedules', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('name');
            $table->string('type'); // full|incremental|differential
            $table->string('frequency'); // daily|weekly|monthly|custom
            $table->string('cron_expression')->nullable();
            $table->time('run_at')->nullable();
            $table->json('days_of_week')->nullable();
            $table->integer('day_of_month')->nullable();
            $table->boolean('backup_database')->default(true);
            $table->boolean('backup_files')->default(true);
            $table->boolean('backup_config')->default(false);
            $table->json('destination_ids');
            $table->integer('retention_days')->default(30);
            $table->integer('retention_count')->nullable();
            $table->boolean('encrypt')->default(true);
            $table->boolean('compress')->default(true);
            $table->boolean('verify_after')->default(true);
            $table->boolean('is_active')->default(true);
            $table->boolean('notify_on_failure')->default(true);
            $table->boolean('notify_on_success')->default(false);
            $table->json('notification_channels')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->string('last_run_status')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index('frequency');
            $table->index('is_active');
            $table->index('next_run_at');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_schedules');
    }
};
