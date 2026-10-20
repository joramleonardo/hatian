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
        Schema::table('users', function (Blueprint $table) {
            $table->json('default_payment_methods')->nullable()->after('email');
        });

        Schema::create('hatians', function (Blueprint $table) {
            $table->id();
            $table->string('share_code', 16)->unique()->index();
            $table->string('edit_token', 64)->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->string('title');
            $table->string('category', 32)->default('food_delivery')->index();
            $table->string('merchant')->nullable();
            $table->string('currency', 8)->default('PHP');
            $table->decimal('exchange_rate', 12, 4)->default(1.0000);
            $table->string('payer_name')->nullable();
            $table->text('notes')->nullable();

            $table->json('participants');
            $table->json('items');
            $table->json('discounts')->nullable();
            $table->json('fees')->nullable();
            $table->json('payment_methods')->nullable();

            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('fee_total', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);

            $table->boolean('allow_public_paid_toggle')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hatians');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('default_payment_methods');
        });
    }
};

