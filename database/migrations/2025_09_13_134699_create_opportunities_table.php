<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('opportunities', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('stage')->default('None');
            $table->text('description')->nullable();
            $table->string('year')->nullable();
            $table->integer('probability');
            $table->timestamp('close_date');
            $table->float('amount')->nullable();
            $table->string('prepared_by')->default('');
            $table->string('created_by_id');
            $table->string('assistant_clerk_id')->nullable();
            $table->string('contact_id');
            $table->string('contact_person_id');
            $table->string('last_update_id')->nullable()->unique();
            $table->json('files')->default('[]');
            $table->timestamps();
            $table->foreign('created_by_id')->references('id')->on('users');
            $table->foreign('assistant_clerk_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('contact_id')->references('id')->on('contacts');
            $table->foreign('contact_person_id')->references('id')->on('contact_persons');
            $table->index('stage');
            $table->index('created_by_id');
            $table->index('close_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('opportunities');
    }
};