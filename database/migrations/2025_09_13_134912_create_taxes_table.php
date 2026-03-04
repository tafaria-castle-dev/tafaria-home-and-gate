<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('taxes', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name', 256);
            $table->string('tax_code');
            $table->float('rate');
            $table->timestamps();
        });

        Schema::create('additional_tax', function (Blueprint $table) {
            $table->string('additional_id');
            $table->string('tax_id');
            $table->foreign('additional_id')->references('id')->on('additionals')->onDelete('cascade');
            $table->foreign('tax_id')->references('id')->on('taxes')->onDelete('cascade');
            $table->primary(['additional_id', 'tax_id']);
        });
        

        Schema::create('package_tax', function (Blueprint $table) {
            $table->string('package_id');
            $table->string('tax_id');
            $table->foreign('package_id')->references('id')->on('packages')->onDelete('cascade');
            $table->foreign('tax_id')->references('id')->on('taxes')->onDelete('cascade');
            $table->primary(['package_id', 'tax_id']);
        });

        Schema::create('corporate_room_setting_tax', function (Blueprint $table) {
            $table->string('corporate_room_setting_id');
            $table->string('tax_id');
            $table->foreign('corporate_room_setting_id')->references('id')->on('corporate_room_settings')->onDelete('cascade');
            $table->foreign('tax_id')->references('id')->on('taxes')->onDelete('cascade');
            $table->primary(['corporate_room_setting_id', 'tax_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('additional_tax');
        Schema::dropIfExists('package_tax');
        Schema::dropIfExists('corporate_room_setting_tax');
        Schema::dropIfExists('taxes');
    }
};