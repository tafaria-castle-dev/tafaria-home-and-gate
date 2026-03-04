<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('contact_persons', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('title')->nullable();
            $table->string('contact_id')->nullable();
            $table->string('contact_clerk')->nullable();
            $table->timestamps();
            $table->foreign('contact_id')->references('id')->on('contacts')->onDelete('cascade');
            $table->index('contact_id');
            $table->index('email');
            $table->index('phone');
            $table->index('first_name');
            $table->index('last_name');
            $table->index('title');
            $table->index('contact_clerk');
            $table->index('created_at');
            $table->index(['first_name', 'last_name']);
            $table->index(['contact_id', 'title']);
            $table->index(['contact_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('contact_persons');
    }
};