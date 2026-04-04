<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dr_plans', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('name');
            $table->string('scenario'); // fire|flood|ransomware|hardware_failure|datacenter_loss
            $table->integer('rto_minutes');
            $table->integer('rpo_minutes');
            $table->text('description')->nullable();
            $table->json('steps');
            $table->json('contacts');
            $table->json('resources_needed')->nullable();
            $table->date('last_tested_date')->nullable();
            $table->boolean('last_test_passed')->nullable();
            $table->text('test_notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(1);
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index('scenario');
            $table->index('is_active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_plans');
    }
};
