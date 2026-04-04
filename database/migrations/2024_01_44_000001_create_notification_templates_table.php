<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('channel'); // in_app, push, sms, email, whatsapp
            $table->string('locale')->default('ar'); // ar, en
            $table->string('subject')->nullable();
            $table->text('body');
            $table->text('body_html')->nullable();
            $table->json('variables')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('event_type')->nullable();
            $table->integer('sort_order')->default(0);
            $table->index(['channel', 'locale', 'is_active']);
            $table->index(['code', 'channel']);

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
