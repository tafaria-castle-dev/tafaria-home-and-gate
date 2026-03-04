<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bulk_emails', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('subject')->nullable();
            $table->text('description')->nullable();
            $table->json('description_json')->nullable();
            $table->string('template_id')->nullable();
            $table->string('created_by_id');
            $table->string('sent_by')->default('');
            $table->timestamps();
            $table->foreign('template_id')->references('id')->on('email_templates')->onDelete('set null');
            $table->foreign('created_by_id')->references('id')->on('users');
        });

        Schema::create('bulk_email_contact', function (Blueprint $table) {
            $table->string('bulk_email_id');
            $table->string('contact_id');
            $table->foreign('bulk_email_id')->references('id')->on('bulk_emails')->onDelete('cascade');
            $table->foreign('contact_id')->references('id')->on('contacts')->onDelete('cascade');
            $table->primary(['bulk_email_id', 'contact_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('bulk_email_contact');
        Schema::dropIfExists('bulk_emails');
    }
};