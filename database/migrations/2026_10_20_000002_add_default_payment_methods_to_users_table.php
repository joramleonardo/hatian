<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'default_payment_methods')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('default_payment_methods')->nullable()->after('email');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'default_payment_methods')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('default_payment_methods');
            });
        }
    }
};

