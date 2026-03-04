<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name', 256);
            $table->string('subject');
            $table->text('description');
            $table->json('description_json')->nullable();
            $table->string('created_by_id');
            $table->timestamps();
            $table->foreign('created_by_id')->references('id')->on('users');
        });
    }

    public function down()
    {
        Schema::dropIfExists('email_templates');
    }
};