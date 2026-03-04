<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('email_activities', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('subject');
            $table->text('description');
            $table->json('description_json')->nullable();
            $table->string('type');
            $table->string('opportunity_id');
            $table->string('template_id')->nullable();
            $table->string('created_by_id');
            $table->string('super_staff')->nullable();
            $table->timestamps();
            $table->foreign('opportunity_id')->references('id')->on('opportunities')->onDelete('cascade');
            $table->foreign('template_id')->references('id')->on('email_templates')->onDelete('set null');
            $table->foreign('created_by_id')->references('id')->on('users');
        });
    }

    public function down()
    {
        Schema::dropIfExists('email_activities');
    }
};