<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class ChangeEmailPasswordColumnToTextInUsersTable extends Migration
{

    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('email_password')->nullable()->change();
        });
    }


    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email_password')->nullable()->change();
        });
    }
}