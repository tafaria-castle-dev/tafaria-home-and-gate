<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('additionals', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name', 256);
            $table->text('description');
            $table->float('amount_ksh')->default(0);
            $table->float('taxable_amount')->default(0);
            $table->timestamps();
        });

    }

    public function down()
    {
        Schema::dropIfExists('additional_tax');
        Schema::dropIfExists('additionals');
    }
};