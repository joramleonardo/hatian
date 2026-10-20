<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Hatian extends Model
{
    use HasFactory;

    protected $fillable = [
        'share_code',
        'edit_token',
        'user_id',
        'title',
        'category',
        'merchant',
        'currency',
        'exchange_rate',
        'payer_name',
        'notes',
        'participants',
        'items',
        'discounts',
        'fees',
        'payment_methods',
        'receipt_images',
        'subtotal',
        'discount_total',
        'fee_total',
        'grand_total',
        'allow_public_paid_toggle',
    ];

    protected function casts(): array
    {
        return [
            'participants' => 'array',
            'items' => 'array',
            'discounts' => 'array',
            'fees' => 'array',
            'payment_methods' => 'array',
            'receipt_images' => 'array',
            'exchange_rate' => 'float',
            'subtotal' => 'float',
            'discount_total' => 'float',
            'fee_total' => 'float',
            'grand_total' => 'float',
            'allow_public_paid_toggle' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Hatian $hatian) {
            if (empty($hatian->share_code)) {
                $hatian->share_code = static::generateUniqueShareCode();
            }
            if (empty($hatian->edit_token)) {
                $hatian->edit_token = Str::random(40);
            }
        });
    }

    public static function generateUniqueShareCode(): string
    {
        do {
            $code = strtolower(Str::random(8));
        } while (static::where('share_code', $code)->exists());

        return $code;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

