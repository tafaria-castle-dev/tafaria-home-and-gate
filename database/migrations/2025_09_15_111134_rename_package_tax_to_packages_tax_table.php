<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  
    public function up(): void
    {
        Schema::rename('package_tax', 'packages_tax');
    }


    public function down(): void
    {
        Schema::rename('packages_tax', 'package_tax');
    }
};