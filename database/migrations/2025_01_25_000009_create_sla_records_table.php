<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sla_records', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('service_name');
            $table->date('period_date');
            $table->decimal('uptime_percentage', 5, 2)->default(100.00);
            $table->integer('total_minutes');
            $table->integer('downtime_minutes')->default(0);
            $table->integer('incident_count')->default(0);
            $table->integer('avg_response_ms')->nullable();
            $table->decimal('target_uptime', 5, 2)->default(99.9);
            $table->boolean('sla_met')->default(true);
            $table->json('incidents')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index('service_name');
            $table->index('period_date');
            $table->unique(['service_name', 'period_date', 'branch_id']);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sla_records');
    }
};
