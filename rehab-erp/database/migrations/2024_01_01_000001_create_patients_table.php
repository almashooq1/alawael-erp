<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('patient_number')->unique(); // PT-0001
            $table->string('name');
            $table->date('birth_date');
            $table->enum('gender', ['male', 'female']);
            $table->string('national_id')->nullable()->unique();
            $table->string('nationality')->default('سعودي');
            $table->string('phone', 20);
            $table->string('phone2', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('guardian_name')->nullable();
            $table->text('address')->nullable();
            $table->string('diagnosis');
            $table->string('doctor_name')->nullable();
            $table->date('start_date')->nullable();
            $table->unsignedSmallInteger('total_sessions')->default(20);
            $table->enum('status', ['active', 'inactive', 'discharged'])->default('active');
            $table->text('medical_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('gender');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
