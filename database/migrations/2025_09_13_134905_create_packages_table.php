<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('board_type', 256);
            $table->string('name', 256);
            $table->text('description');
            $table->float('amount_ksh');
            $table->string('resident')->default('ea');
            $table->string('room_type')->default('single');
            $table->integer('number_of_rooms')->default(0);
            $table->float('taxable_amount')->default(0);
            $table->timestamps();
        });

        
    }

    public function down()
    {
        Schema::dropIfExists('package_tax');
      
    }
};