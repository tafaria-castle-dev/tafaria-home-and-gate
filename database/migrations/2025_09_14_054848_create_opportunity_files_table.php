<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('opportunity_files', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('file_path');
            $table->string('opportunity_id');
            $table->foreign('opportunity_id')->references('id')->on('opportunities')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn('files');
        });
    }

    public function down()
    {
        Schema::dropIfExists('opportunity_files');

        Schema::table('opportunities', function (Blueprint $table) {
            $table->json('files')->default('[]');
        });
    }
};