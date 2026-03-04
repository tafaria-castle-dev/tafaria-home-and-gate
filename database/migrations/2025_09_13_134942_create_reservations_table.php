<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('contact_id')->nullable();
            $table->string('contact_person_id')->nullable();
            $table->timestamp('visit_date')->nullable();
            $table->string('car_plate_number', 10)->nullable();
            $table->string('reservation_number', 20)->nullable();
            $table->string('id_or_passport_number', 20)->nullable();
            $table->string('id_or_passport_photo')->nullable();
            $table->boolean('cleared')->default(false);
            $table->string('cleared_by_id')->nullable();
            $table->timestamp('cleared_date')->nullable();
            $table->string('created_by_id');
            $table->timestamps();
            $table->foreign('contact_id')->references('id')->on('contacts')->onDelete('set null');
            $table->foreign('contact_person_id')->references('id')->on('contact_persons')->onDelete('set null');
            $table->foreign('cleared_by_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by_id')->references('id')->on('users');
        });
    }

    public function down()
    {
        Schema::dropIfExists('reservations');
    }
};