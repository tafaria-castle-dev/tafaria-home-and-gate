<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bulk_email_attachments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('file_name');
            $table->string('file_path');
            $table->integer('file_size');
            $table->string('file_type');
            $table->string('email_id');
            $table->timestamps();
            $table->foreign('email_id')->references('id')->on('bulk_emails')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('bulk_email_attachments');
    }
};