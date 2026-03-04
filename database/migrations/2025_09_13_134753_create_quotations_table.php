<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->boolean('is_invoice_generated')->default(false);
            $table->boolean('no_accommodation')->default(false);
            $table->string('status')->default('pending');
            $table->timestamp('approved_on')->nullable();
            $table->json('quotation_details');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users');
            $table->index('quotation_details', 'quotation_details_idx');
        });
    }

    public function down()
    {
        Schema::dropIfExists('quotations');
    }
};