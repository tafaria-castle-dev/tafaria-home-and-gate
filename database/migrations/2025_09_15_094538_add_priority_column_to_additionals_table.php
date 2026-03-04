<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('additionals', function (Blueprint $table) {
            $table->boolean('priority')->default(false)->after('dynamic');
        });
    }

    public function down(): void
    {
        Schema::table('additionals', function (Blueprint $table) {
            $table->dropColumn(['priority']);
        });
    }
};