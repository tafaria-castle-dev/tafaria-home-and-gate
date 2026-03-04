<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('opportunity_names', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name', 256);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('opportunity_names');
    }
};