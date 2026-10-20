<?php

namespace Tests\Feature;

use App\Models\Hatian;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HatianTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_view_landing_page_and_create_grabfood_hatian(): void
    {
        $this->get('/')->assertStatus(200);

        $payload = [
            'title' => 'GrabFood 24 Chicken Group Order',
            'category' => 'food_delivery',
            'merchant' => 'GrabFood - 24 Chicken',
            'currency' => 'PHP',
            'exchange_rate' => 1,
            'payer_name' => 'Alex',
            'notes' => 'Send GCash screenshot!',
            'allow_public_paid_toggle' => true,
            'participants' => [
                ['id' => 'p1', 'name' => 'Alex', 'color' => '#10b981', 'is_payer' => true, 'is_paid' => true],
                ['id' => 'p2', 'name' => 'Marco', 'color' => '#3b82f6', 'is_payer' => false, 'is_paid' => false],
                ['id' => 'p3', 'name' => 'Bea', 'color' => '#f59e0b', 'is_payer' => false, 'is_paid' => false],
            ],
            'items' => [
                ['id' => 'i1', 'name' => 'Jack Daniels Meal', 'quantity' => 1, 'unit_price' => 250, 'assigned_to' => ['p1']],
                ['id' => 'i2', 'name' => 'Snow Cheese Half', 'quantity' => 1, 'unit_price' => 500, 'assigned_to' => ['p2']],
                ['id' => 'i3', 'name' => 'Yangnyeom Meal', 'quantity' => 1, 'unit_price' => 250, 'assigned_to' => ['p3']],
            ],
            'discounts' => [
                [
                    'id' => 'd1',
                    'name' => 'Grab Group Order 10% Off',
                    'type' => 'percentage',
                    'value' => 10,
                    'cap' => null,
                    'split_mode' => 'proportional',
                ],
                [
                    'id' => 'd2',
                    'name' => 'Voucher Code',
                    'type' => 'amount',
                    'value' => 100,
                    'cap' => null,
                    'split_mode' => 'proportional',
                ],
            ],
            'fees' => [
                [
                    'id' => 'f1',
                    'name' => 'Delivery Fee',
                    'type' => 'amount',
                    'value' => 60,
                    'split_mode' => 'equal',
                ],
            ],
            'payment_methods' => [
                [
                    'id' => 'pm1',
                    'channel' => 'GCash',
                    'account_name' => 'Alex D.',
                    'account_number' => '09171234567',
                ],
            ],
        ];

        $response = $this->post('/hatians', $payload);

        $hatian = Hatian::first();
        $this->assertNotNull($hatian);
        $response->assertRedirect(route('hatians.show', $hatian->share_code));

        // Subtotal = 250 + 500 + 250 = 1000
        // Discounts = 10% of 1000 (100) + 100 = 200
        // Fees = 60
        // Grand Total = 1000 - 200 + 60 = 860
        $this->assertEquals(1000.00, $hatian->subtotal);
        $this->assertEquals(200.00, $hatian->discount_total);
        $this->assertEquals(60.00, $hatian->fee_total);
        $this->assertEquals(860.00, $hatian->grand_total);
    }

    public function test_public_share_link_can_be_viewed_and_friend_can_mark_paid(): void
    {
        $hatian = Hatian::create([
            'title' => 'Tokyo Pasabuy',
            'category' => 'pasabuy',
            'merchant' => 'Don Quijote',
            'currency' => 'PHP',
            'exchange_rate' => 1,
            'payer_name' => 'Alex',
            'participants' => [
                ['id' => 'p1', 'name' => 'Alex', 'color' => '#10b981', 'is_payer' => true, 'is_paid' => true],
                ['id' => 'p2', 'name' => 'Marco', 'color' => '#3b82f6', 'is_payer' => false, 'is_paid' => false],
            ],
            'items' => [
                ['id' => 'i1', 'name' => 'Matcha', 'quantity' => 1, 'unit_price' => 500, 'assigned_to' => ['p1']],
                ['id' => 'i2', 'name' => 'Serum', 'quantity' => 1, 'unit_price' => 500, 'assigned_to' => ['p2']],
            ],
            'discounts' => [],
            'fees' => [],
            'payment_methods' => [],
            'subtotal' => 1000,
            'discount_total' => 0,
            'fee_total' => 0,
            'grand_total' => 1000,
            'allow_public_paid_toggle' => true,
        ]);

        $this->get(route('hatians.show', $hatian->share_code))
            ->assertStatus(200);

        // Public user cannot mark paid without payment proof screenshot
        $this->patch(route('hatians.toggle-paid', [
            'share_code' => $hatian->share_code,
            'participant_id' => 'p2',
        ]), [
            'is_paid' => true,
        ])->assertSessionHasErrors('payment_proof');

        $this->patch(route('hatians.toggle-paid', [
            'share_code' => $hatian->share_code,
            'participant_id' => 'p2',
        ]), [
            'is_paid' => true,
            'payment_note' => 'Sent via GCash #9912',
            'payment_proof' => 'data:image/jpeg;base64,sampleproof',
        ])->assertRedirect();

        $hatian->refresh();
        $marco = collect($hatian->participants)->firstWhere('id', 'p2');
        $this->assertTrue($marco['is_paid']);
        $this->assertEquals('Sent via GCash #9912', $marco['payment_note']);
        $this->assertEquals('data:image/jpeg;base64,sampleproof', $marco['payment_proof']);

        $this->patch(route('hatians.toggle-paid', [
            'share_code' => $hatian->share_code,
            'participant_id' => 'p2',
        ]), [
            'is_paid' => false,
        ])->assertRedirect();

        $hatian->refresh();
        $marco = collect($hatian->participants)->firstWhere('id', 'p2');
        $this->assertFalse($marco['is_paid']);
        $this->assertNull($marco['payment_note']);
        $this->assertNull($marco['payment_proof']);
    }

    public function test_authenticated_user_claims_guest_hatians_on_dashboard(): void
    {
        $hatian = Hatian::create([
            'title' => 'Guest Created Split',
            'category' => 'food_delivery',
            'participants' => [
                ['id' => 'p1', 'name' => 'Alex', 'color' => '#10b981', 'is_payer' => true, 'is_paid' => true],
            ],
            'items' => [
                ['id' => 'i1', 'name' => 'Burger', 'quantity' => 1, 'unit_price' => 300, 'assigned_to' => ['p1']],
            ],
            'subtotal' => 300,
            'discount_total' => 0,
            'fee_total' => 0,
            'grand_total' => 300,
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['hatian_edit_tokens' => [$hatian->edit_token]])
            ->get('/dashboard')
            ->assertStatus(200);

        $hatian->refresh();
        $this->assertEquals($user->id, $hatian->user_id);
    }

    public function test_payment_method_with_qr_code_can_be_saved_and_retrieved(): void
    {
        $payload = [
            'title' => 'GrabFood with GCash QR',
            'category' => 'food_delivery',
            'payer_name' => 'Alex',
            'participants' => [
                ['id' => 'p1', 'name' => 'Alex', 'color' => '#10b981', 'is_payer' => true, 'is_paid' => true],
            ],
            'items' => [
                ['id' => 'i1', 'name' => 'Chickenjoy', 'quantity' => 1, 'unit_price' => 200, 'assigned_to' => ['p1']],
            ],
            'payment_methods' => [
                [
                    'id' => 'pm1',
                    'channel' => 'GCash',
                    'account_name' => 'Alex D.',
                    'account_number' => '09171234567',
                    'qr_code' => 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
                ],
            ],
        ];

        $this->post('/hatians', $payload)->assertRedirect();

        $hatian = Hatian::where('title', 'GrabFood with GCash QR')->first();
        $this->assertNotNull($hatian);
        $this->assertEquals('data:image/jpeg;base64,/9j/4AAQSkZJRg==', $hatian->payment_methods[0]['qr_code']);
    }

    public function test_receipt_images_can_be_attached_retrieved_and_duplicated(): void
    {
        $payload = [
            'title' => 'GrabFood Order with Receipts',
            'category' => 'food_delivery',
            'payer_name' => 'Alex',
            'participants' => [
                ['id' => 'p1', 'name' => 'Alex', 'color' => '#10b981', 'is_payer' => true, 'is_paid' => true],
            ],
            'items' => [
                ['id' => 'i1', 'name' => 'Pepper Lunch Beef', 'quantity' => 1, 'unit_price' => 390, 'assigned_to' => ['p1']],
            ],
            'receipt_images' => [
                'data:image/jpeg;base64,receipt_page_1',
                'data:image/jpeg;base64,receipt_page_2',
            ],
        ];

        $response = $this->post('/hatians', $payload);
        $response->assertRedirect();

        $hatian = Hatian::where('title', 'GrabFood Order with Receipts')->first();
        $this->assertNotNull($hatian);
        $this->assertCount(2, $hatian->receipt_images);
        $this->assertEquals('data:image/jpeg;base64,receipt_page_1', $hatian->receipt_images[0]);
        $this->assertEquals('data:image/jpeg;base64,receipt_page_2', $hatian->receipt_images[1]);

        // Duplication should also duplicate receipt images
        $dupResponse = $this->post(route('hatians.duplicate', $hatian->share_code));
        $dupResponse->assertRedirect();

        $duplicatedHatian = Hatian::where('title', 'GrabFood Order with Receipts (Copy)')->first();
        $this->assertNotNull($duplicatedHatian);
        $this->assertCount(2, $duplicatedHatian->receipt_images);
    }
}

