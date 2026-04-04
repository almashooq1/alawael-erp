<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('therapy_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('therapist_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('session_date');
            $table->time('session_time');
            $table->unsignedSmallInteger('duration')->default(60); // بالدقائق
            $table->string('type')->default('individual'); // individual, group, evaluation
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->decimal('cost', 8, 2)->nullable();
            $table->boolean('paid')->default(false);
            $table->text('notes')->nullable();
            $table->text('progress_notes')->nullable();
            $table->unsignedTinyInteger('session_number')->nullable(); // رقم الجلسة للمريض
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'session_date']);
            $table->index('status');
            $table->index('session_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('therapy_sessions');
    }
};
