<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('accommodation_notes', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('note');
            $table->string('created_by_id');
            $table->timestamps();
            $table->foreign('created_by_id')->references('id')->on('users');
        });
    }

    public function down()
    {
        Schema::dropIfExists('accommodation_notes');
    }
};