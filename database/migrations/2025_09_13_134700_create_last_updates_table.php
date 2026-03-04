<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('last_updates', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('updated_by_id');
            $table->string('super_staff')->nullable();
            $table->string('opportunity_id')->nullable();
            $table->timestamps();
            $table->foreign('updated_by_id')->references('id')->on('users');
            $table->foreign('opportunity_id')->references('id')->on('opportunities')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('last_updates');
    }
};