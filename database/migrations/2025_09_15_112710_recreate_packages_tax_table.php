<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('packages_tax');
        
         Schema::create('package_tax', function (Blueprint $table) {
            $table->string('package_id');
            $table->string('tax_id');
            $table->foreign('package_id')->references('id')->on('packages')->onDelete('cascade');
            $table->foreign('tax_id')->references('id')->on('taxes')->onDelete('cascade');
            $table->primary(['package_id', 'tax_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_tax');
    }
};