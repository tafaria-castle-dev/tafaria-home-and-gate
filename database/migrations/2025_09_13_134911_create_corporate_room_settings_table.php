<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('corporate_room_settings', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('board_type', 256);
            $table->string('room_type')->default('single');
            $table->text('description');
            $table->float('amount_ksh')->default(0);
            $table->float('taxable_amount')->default(0);
            $table->timestamps();
            $table->unique(['board_type', 'room_type']);
        });

       
    }

    public function down()
    {
     
        Schema::dropIfExists('corporate_room_settings');
    }
};