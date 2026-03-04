<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('opportunity_files', function (Blueprint $table) {
            $table->string('original_name')->nullable();
            $table->string('extension', 10)->nullable();
            $table->string('mime_type', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('opportunity_files', function (Blueprint $table) {
            $table->dropColumn(['original_name', 'extension', 'mime_type']);
        });
    }
};