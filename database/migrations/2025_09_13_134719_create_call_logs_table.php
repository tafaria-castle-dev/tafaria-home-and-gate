<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('call_logs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('subject');
            $table->text('description');
            $table->string('opportunity_id');
            $table->string('created_by_id');
            $table->string('super_staff')->nullable();
            $table->timestamps();
            $table->foreign('opportunity_id')->references('id')->on('opportunities')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users');
        });
    }

    public function down()
    {
        Schema::dropIfExists('call_logs');
    }
};