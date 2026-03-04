<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateAccommodationNotesTable extends Migration
{
    public function up()
    {
        Schema::table('accommodation_notes', function (Blueprint $table) {
            $table->renameColumn('note', 'description');
            $table->renameColumn('created_by_id', 'created_by');

            $table->string('name')->after('id');

            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('accommodation_notes', function (Blueprint $table) {
            $table->dropForeign(['created_by']);

            $table->dropColumn('name');

            $table->renameColumn('description', 'note');
            $table->renameColumn('created_by', 'created_by_id');
        });
    }
}