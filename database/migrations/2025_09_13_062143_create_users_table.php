<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('email_password')->nullable();
            $table->string('phone_number')->unique();
            $table->string('signature')->default('');
            $table->string('password');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('verification_token')->nullable()->unique();
            $table->boolean('deleted')->default(false);
            $table->string('role')->default('client');
            $table->string('password_reset_token')->nullable()->unique();
            $table->timestamp('password_reset_expires')->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->timestamp('email_password_updated_at')->nullable();
            $table->timestamp('verification_token_expires')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};