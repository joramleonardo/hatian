<?php

namespace App\Http\Controllers;

use App\Models\Hatian;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class HatianController extends Controller
{
    /**
     * Display the guest-first landing page & interactive Hatian builder.
     */
    public function index(Request $request): Response
    {
        $this->claimSessionHatiansForAuthUser($request);

        $editTokens = $request->session()->get('hatian_edit_tokens', []);
        $recentHatians = collect();

        if (Auth::check()) {
            $recentHatians = Hatian::where('user_id', Auth::id())
                ->latest()
                ->take(6)
                ->get();
        } elseif (! empty($editTokens)) {
            $recentHatians = Hatian::whereIn('edit_token', $editTokens)
                ->latest()
                ->take(6)
                ->get();
        }

        // Check if editing/templating from an existing Hatian
        $editingHatian = null;
        if ($request->filled('edit')) {
            $candidate = Hatian::where('share_code', $request->string('edit'))->first();
            if ($candidate && $this->canEditHatian($request, $candidate)) {
                $editingHatian = $candidate;
            }
        }

        return Inertia::render('welcome', [
            'recentHatians' => $recentHatians->map(fn (Hatian $h) => $this->formatHatianSummary($h)),
            'defaultPaymentMethods' => Auth::user()?->default_payment_methods ?? [],
            'editingHatian' => $editingHatian ? $this->formatHatianDetail($request, $editingHatian) : null,
        ]);
    }

    /**
     * Display the authenticated user's dashboard with saved Hatians & stats.
     */
    public function dashboard(Request $request): Response
    {
        $this->claimSessionHatiansForAuthUser($request);

        $user = $request->user();
        $hatians = Hatian::where('user_id', $user->id)
            ->latest()
            ->get();

        $formatted = $hatians->map(fn (Hatian $h) => $this->formatHatianSummary($h));

        $totalCollectible = $formatted->sum('unpaid_amount');
        $totalDiscountSaved = $hatians->sum('discount_total');
        $totalVolume = $hatians->sum('grand_total');
        $activeCount = $formatted->where('is_fully_paid', false)->count();

        return Inertia::render('dashboard', [
            'hatians' => $formatted->values(),
            'stats' => [
                'total_hatians' => $hatians->count(),
                'active_hatians' => $activeCount,
                'total_collectible' => round($totalCollectible, 2),
                'total_discount_saved' => round($totalDiscountSaved, 2),
                'total_volume' => round($totalVolume, 2),
            ],
            'defaultPaymentMethods' => $user->default_payment_methods ?? [],
        ]);
    }

    /**
     * Ensure database schema has newly added columns (self-healing for migrations).
     */
    protected function ensureSchemaCompatibility(): void
    {
        try {
            if (Schema::hasTable('hatians') && ! Schema::hasColumn('hatians', 'receipt_images')) {
                Schema::table('hatians', function (Blueprint $table) {
                    $table->json('receipt_images')->nullable()->after('payment_methods');
                });
            }
        } catch (\Throwable $e) {
            Log::warning('Schema compatibility check warning: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created Hatian (guest or authenticated).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateHatianPayload($request);
        $totals = $this->computeTotals($validated['participants'], $validated['items'], $validated['discounts'] ?? [], $validated['fees'] ?? []);

        $this->ensureSchemaCompatibility();

        try {
            $hatian = Hatian::create([
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'category' => $validated['category'] ?? 'food_delivery',
                'merchant' => $validated['merchant'] ?? null,
                'currency' => $validated['currency'] ?? 'PHP',
                'exchange_rate' => $validated['exchange_rate'] ?? 1,
                'payer_name' => $validated['payer_name'] ?? (Auth::user()?->name ?? 'Payer'),
                'notes' => $validated['notes'] ?? null,
                'participants' => $validated['participants'],
                'items' => $validated['items'],
                'discounts' => $validated['discounts'] ?? [],
                'fees' => $validated['fees'] ?? [],
                'payment_methods' => $validated['payment_methods'] ?? [],
                'receipt_images' => $validated['receipt_images'] ?? [],
                'subtotal' => $totals['subtotal'],
                'discount_total' => $totals['discount_total'],
                'fee_total' => $totals['fee_total'],
                'grand_total' => $totals['grand_total'],
                'allow_public_paid_toggle' => $validated['allow_public_paid_toggle'] ?? true,
            ]);

            // Store edit_token in session so guest creators can edit
            $tokens = $request->session()->get('hatian_edit_tokens', []);
            if (! in_array($hatian->edit_token, $tokens, true)) {
                $tokens[] = $hatian->edit_token;
                $request->session()->put('hatian_edit_tokens', $tokens);
            }

            // If authenticated and user has no saved default payment methods yet, save them
            if (Auth::check() && ! empty($validated['payment_methods'])) {
                $user = Auth::user();
                if (empty($user->default_payment_methods) || $request->boolean('save_default_payment_methods')) {
                    $user->update([
                        'default_payment_methods' => $validated['payment_methods'],
                    ]);
                }
            }

            return redirect()->route('hatians.show', $hatian->share_code);
        } catch (\Throwable $e) {
            Log::error('Hatian store failed: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return back()->withErrors([
                'database' => 'Unable to save split: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Show the public shareable Hatian receipt and interactive breakdown.
     */
    public function show(Request $request, string $shareCode): Response
    {
        $hatian = Hatian::where('share_code', $shareCode)->firstOrFail();

        // Support unlocking edit access via ?token= query parameter
        if ($request->filled('token') && hash_equals($hatian->edit_token, (string) $request->query('token'))) {
            $tokens = $request->session()->get('hatian_edit_tokens', []);
            if (! in_array($hatian->edit_token, $tokens, true)) {
                $tokens[] = $hatian->edit_token;
                $request->session()->put('hatian_edit_tokens', $tokens);
            }
        }

        $this->claimSessionHatiansForAuthUser($request);

        return Inertia::render('hatian/show', [
            'hatian' => $this->formatHatianDetail($request, $hatian),
        ]);
    }

    /**
     * Update an existing Hatian.
     */
    public function update(Request $request, string $shareCode): RedirectResponse
    {
        $hatian = Hatian::where('share_code', $shareCode)->firstOrFail();

        if (! $this->canEditHatian($request, $hatian)) {
            abort(403, 'You do not have permission to edit this Hatian.');
        }

        $validated = $this->validateHatianPayload($request);
        $totals = $this->computeTotals($validated['participants'], $validated['items'], $validated['discounts'] ?? [], $validated['fees'] ?? []);

        $this->ensureSchemaCompatibility();

        try {
            $hatian->update([
                'title' => $validated['title'],
                'category' => $validated['category'] ?? $hatian->category,
                'merchant' => $validated['merchant'] ?? null,
                'currency' => $validated['currency'] ?? 'PHP',
                'exchange_rate' => $validated['exchange_rate'] ?? 1,
                'payer_name' => $validated['payer_name'] ?? $hatian->payer_name,
                'notes' => $validated['notes'] ?? null,
                'participants' => $validated['participants'],
                'items' => $validated['items'],
                'discounts' => $validated['discounts'] ?? [],
                'fees' => $validated['fees'] ?? [],
                'payment_methods' => $validated['payment_methods'] ?? [],
                'receipt_images' => $validated['receipt_images'] ?? [],
                'subtotal' => $totals['subtotal'],
                'discount_total' => $totals['discount_total'],
                'fee_total' => $totals['fee_total'],
                'grand_total' => $totals['grand_total'],
                'allow_public_paid_toggle' => $validated['allow_public_paid_toggle'] ?? true,
            ]);

            return redirect()->route('hatians.show', $hatian->share_code);
        } catch (\Throwable $e) {
            Log::error('Hatian update failed: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return back()->withErrors([
                'database' => 'Unable to save changes: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Toggle a participant's paid status on a shared Hatian.
     */
    public function togglePaid(Request $request, string $shareCode, string $participantId): RedirectResponse
    {
        $hatian = Hatian::where('share_code', $shareCode)->firstOrFail();
        $canEdit = $this->canEditHatian($request, $hatian);

        if (! $hatian->allow_public_paid_toggle && ! $canEdit) {
            abort(403, 'Only the organizer can update payment statuses on this Hatian.');
        }

        $participants = $hatian->participants ?? [];
        $updated = false;

        foreach ($participants as &$participant) {
            if (($participant['id'] ?? '') === $participantId) {
                $newPaidState = $request->has('is_paid')
                    ? $request->boolean('is_paid')
                    : ! ($participant['is_paid'] ?? false);

                if ($newPaidState && ! $canEdit && empty($request->input('payment_proof')) && empty($participant['payment_proof'])) {
                    return back()->withErrors([
                        'payment_proof' => 'A screenshot proof of payment is required to mark as paid.',
                    ]);
                }

                $participant['is_paid'] = $newPaidState;
                $participant['paid_at'] = $newPaidState ? now()->toISOString() : null;
                if ($request->has('payment_note')) {
                    $participant['payment_note'] = $request->string('payment_note')->toString() ?: null;
                }
                if ($request->has('payment_proof')) {
                    $participant['payment_proof'] = $request->input('payment_proof') ?: null;
                }
                if (! $newPaidState) {
                    $participant['payment_note'] = null;
                    $participant['payment_proof'] = null;
                }
                $updated = true;
                break;
            }
        }
        unset($participant);

        if ($updated) {
            $hatian->update(['participants' => $participants]);
        }

        return back();
    }

    /**
     * Duplicate an existing Hatian (e.g., same barkada/friends ordering again).
     */
    public function duplicate(Request $request, string $shareCode): RedirectResponse
    {
        $original = Hatian::where('share_code', $shareCode)->firstOrFail();

        $participants = collect($original->participants ?? [])->map(function (array $p) {
            $p['is_paid'] = ! empty($p['is_payer']);
            $p['paid_at'] = null;
            $p['payment_note'] = null;

            return $p;
        })->all();

        $clone = Hatian::create([
            'user_id' => Auth::id(),
            'title' => $original->title.' (Copy)',
            'category' => $original->category,
            'merchant' => $original->merchant,
            'currency' => $original->currency,
            'exchange_rate' => $original->exchange_rate,
            'payer_name' => $original->payer_name,
            'notes' => $original->notes,
            'participants' => $participants,
            'items' => $original->items ?? [],
            'discounts' => $original->discounts ?? [],
            'fees' => $original->fees ?? [],
            'payment_methods' => $original->payment_methods ?? [],
            'receipt_images' => $original->receipt_images ?? [],
            'subtotal' => $original->subtotal,
            'discount_total' => $original->discount_total,
            'fee_total' => $original->fee_total,
            'grand_total' => $original->grand_total,
            'allow_public_paid_toggle' => $original->allow_public_paid_toggle,
        ]);

        $tokens = $request->session()->get('hatian_edit_tokens', []);
        $tokens[] = $clone->edit_token;
        $request->session()->put('hatian_edit_tokens', array_values(array_unique($tokens)));

        return redirect()->route('hatians.show', $clone->share_code);
    }

    /**
     * Delete a Hatian.
     */
    public function destroy(Request $request, string $shareCode): RedirectResponse
    {
        $hatian = Hatian::where('share_code', $shareCode)->firstOrFail();

        if (! $this->canEditHatian($request, $hatian)) {
            abort(403, 'You do not have permission to delete this Hatian.');
        }

        $hatian->delete();

        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        return redirect()->route('home');
    }

    /**
     * Update the authenticated user's saved default payment methods.
     */
    public function updatePaymentMethods(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payment_methods' => ['present', 'array', 'max:10'],
            'payment_methods.*.id' => ['required', 'string'],
            'payment_methods.*.channel' => ['required', 'string', 'max:60'],
            'payment_methods.*.account_name' => ['nullable', 'string', 'max:100'],
            'payment_methods.*.account_number' => ['nullable', 'string', 'max:100'],
            'payment_methods.*.qr_code' => ['nullable', 'string'],
        ]);

        $request->user()->update([
            'default_payment_methods' => $validated['payment_methods'],
        ]);

        return back();
    }

    /**
     * Claim guest Hatians from session or localStorage edit_tokens into the authenticated user's account.
     */
    public function claim(Request $request): RedirectResponse
    {
        if (! Auth::check()) {
            abort(401);
        }

        $tokens = array_merge(
            $request->session()->get('hatian_edit_tokens', []),
            $request->input('edit_tokens', [])
        );

        if (! empty($tokens)) {
            Hatian::whereIn('edit_token', $tokens)
                ->whereNull('user_id')
                ->update(['user_id' => Auth::id()]);
        }

        return back();
    }

    protected function claimSessionHatiansForAuthUser(Request $request): void
    {
        if (! Auth::check()) {
            return;
        }

        $tokens = $request->session()->get('hatian_edit_tokens', []);
        if (! empty($tokens)) {
            Hatian::whereIn('edit_token', $tokens)
                ->whereNull('user_id')
                ->update(['user_id' => Auth::id()]);
        }
    }

    protected function canEditHatian(Request $request, Hatian $hatian): bool
    {
        if (Auth::check() && $hatian->user_id && (int) $hatian->user_id === (int) Auth::id()) {
            return true;
        }

        $sessionTokens = $request->session()->get('hatian_edit_tokens', []);
        if (in_array($hatian->edit_token, $sessionTokens, true)) {
            return true;
        }

        $passedToken = $request->input('edit_token') ?? $request->query('token');
        if (is_string($passedToken) && hash_equals($hatian->edit_token, $passedToken)) {
            return true;
        }

        return false;
    }

    protected function validateHatianPayload(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'category' => ['nullable', 'string', 'in:food_delivery,pasabuy,travel,dine_in,other'],
            'merchant' => ['nullable', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'max:8'],
            'exchange_rate' => ['nullable', 'numeric', 'min:0.0001'],
            'payer_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'allow_public_paid_toggle' => ['nullable', 'boolean'],

            'participants' => ['required', 'array', 'min:1', 'max:60'],
            'participants.*.id' => ['required', 'string'],
            'participants.*.name' => ['required', 'string', 'max:80'],
            'participants.*.color' => ['nullable', 'string', 'max:32'],
            'participants.*.is_payer' => ['nullable', 'boolean'],
            'participants.*.is_paid' => ['nullable', 'boolean'],
            'participants.*.paid_at' => ['nullable', 'string'],
            'participants.*.payment_note' => ['nullable', 'string', 'max:160'],

            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.id' => ['required', 'string'],
            'items.*.name' => ['required', 'string', 'max:140'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.assigned_to' => ['required', 'array', 'min:1'],
            'items.*.assigned_to.*' => ['required', 'string'],
            'items.*.notes' => ['nullable', 'string', 'max:200'],

            'discounts' => ['nullable', 'array', 'max:30'],
            'discounts.*.id' => ['required', 'string'],
            'discounts.*.name' => ['required', 'string', 'max:120'],
            'discounts.*.type' => ['required', 'string', 'in:amount,percentage'],
            'discounts.*.value' => ['required', 'numeric', 'min:0'],
            'discounts.*.cap' => ['nullable', 'numeric', 'min:0'],
            'discounts.*.split_mode' => ['required', 'string', 'in:proportional,equal,selected'],
            'discounts.*.assigned_to' => ['nullable', 'array'],

            'fees' => ['nullable', 'array', 'max:30'],
            'fees.*.id' => ['required', 'string'],
            'fees.*.name' => ['required', 'string', 'max:120'],
            'fees.*.type' => ['required', 'string', 'in:amount,percentage'],
            'fees.*.value' => ['required', 'numeric', 'min:0'],
            'fees.*.split_mode' => ['required', 'string', 'in:equal,proportional,selected'],
            'fees.*.assigned_to' => ['nullable', 'array'],

            'payment_methods' => ['nullable', 'array', 'max:10'],
            'payment_methods.*.id' => ['required', 'string'],
            'payment_methods.*.channel' => ['required', 'string', 'max:60'],
            'payment_methods.*.account_name' => ['nullable', 'string', 'max:100'],
            'payment_methods.*.account_number' => ['nullable', 'string', 'max:100'],
            'payment_methods.*.qr_code' => ['nullable', 'string'],

            'receipt_images' => ['nullable', 'array', 'max:5'],
            'receipt_images.*' => ['required', 'string'],
        ]);
    }

    /**
     * Compute subtotal, discount_total, fee_total, grand_total, and per-participant breakdown.
     */
    public function computeTotals(array $participants, array $items, array $discounts, array $fees): array
    {
        $participantSubtotals = [];
        foreach ($participants as $p) {
            $participantSubtotals[$p['id']] = 0.0;
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $qty = max(0, (float) ($item['quantity'] ?? 1));
            $price = max(0, (float) ($item['unit_price'] ?? 0));
            $lineTotal = $qty * $price;

            $assignedIds = array_values(array_filter(
                $item['assigned_to'] ?? [],
                fn ($id) => array_key_exists($id, $participantSubtotals)
            ));

            if (count($assignedIds) > 0) {
                $subtotal += $lineTotal;
                $share = $lineTotal / count($assignedIds);
                foreach ($assignedIds as $pid) {
                    $participantSubtotals[$pid] += $share;
                }
            }
        }

        // Active participants (those with subtotal > 0, or all if subtotal == 0)
        $activeIds = array_keys(array_filter($participantSubtotals, fn ($v) => $v > 0));
        if (empty($activeIds)) {
            $activeIds = array_keys($participantSubtotals);
        }

        $participantDiscounts = array_fill_keys(array_keys($participantSubtotals), 0.0);
        $discountTotal = 0.0;

        foreach ($discounts as $discount) {
            $val = max(0, (float) ($discount['value'] ?? 0));
            if ($val <= 0) {
                continue;
            }

            $mode = $discount['split_mode'] ?? 'proportional';
            $targetIds = $mode === 'selected' && ! empty($discount['assigned_to'])
                ? array_values(array_filter($discount['assigned_to'], fn ($id) => array_key_exists($id, $participantSubtotals)))
                : $activeIds;

            if (empty($targetIds)) {
                continue;
            }

            $targetSubtotal = 0.0;
            foreach ($targetIds as $tid) {
                $targetSubtotal += $participantSubtotals[$tid];
            }

            $discAmount = ($discount['type'] ?? 'amount') === 'percentage'
                ? ($targetSubtotal * ($val / 100.0))
                : $val;

            if (! empty($discount['cap']) && (float) $discount['cap'] > 0) {
                $discAmount = min($discAmount, (float) $discount['cap']);
            }
            $discAmount = min($discAmount, $targetSubtotal);

            $discountTotal += $discAmount;

            if ($mode === 'equal' || $targetSubtotal <= 0) {
                $perPerson = $discAmount / count($targetIds);
                foreach ($targetIds as $tid) {
                    $participantDiscounts[$tid] += $perPerson;
                }
            } else {
                foreach ($targetIds as $tid) {
                    $ratio = $participantSubtotals[$tid] / $targetSubtotal;
                    $participantDiscounts[$tid] += $discAmount * $ratio;
                }
            }
        }

        $participantFees = array_fill_keys(array_keys($participantSubtotals), 0.0);
        $feeTotal = 0.0;

        foreach ($fees as $fee) {
            $val = max(0, (float) ($fee['value'] ?? 0));
            if ($val <= 0) {
                continue;
            }

            $mode = $fee['split_mode'] ?? 'equal';
            $targetIds = $mode === 'selected' && ! empty($fee['assigned_to'])
                ? array_values(array_filter($fee['assigned_to'], fn ($id) => array_key_exists($id, $participantSubtotals)))
                : $activeIds;

            if (empty($targetIds)) {
                continue;
            }

            $targetSubtotal = 0.0;
            foreach ($targetIds as $tid) {
                $targetSubtotal += $participantSubtotals[$tid];
            }

            $feeAmount = ($fee['type'] ?? 'amount') === 'percentage'
                ? ($targetSubtotal * ($val / 100.0))
                : $val;

            $feeTotal += $feeAmount;

            if ($mode === 'proportional' && $targetSubtotal > 0) {
                foreach ($targetIds as $tid) {
                    $ratio = $participantSubtotals[$tid] / $targetSubtotal;
                    $participantFees[$tid] += $feeAmount * $ratio;
                }
            } else {
                $perPerson = $feeAmount / count($targetIds);
                foreach ($targetIds as $tid) {
                    $participantFees[$tid] += $perPerson;
                }
            }
        }

        $grandTotal = max(0, $subtotal - $discountTotal + $feeTotal);

        $perParticipantNet = [];
        foreach ($participants as $p) {
            $pid = $p['id'];
            $net = max(0, ($participantSubtotals[$pid] ?? 0) - ($participantDiscounts[$pid] ?? 0) + ($participantFees[$pid] ?? 0));
            $perParticipantNet[$pid] = round($net, 2);
        }

        return [
            'subtotal' => round($subtotal, 2),
            'discount_total' => round($discountTotal, 2),
            'fee_total' => round($feeTotal, 2),
            'grand_total' => round($grandTotal, 2),
            'per_participant_net' => $perParticipantNet,
        ];
    }

    protected function formatHatianSummary(Hatian $hatian): array
    {
        $totals = $this->computeTotals(
            $hatian->participants ?? [],
            $hatian->items ?? [],
            $hatian->discounts ?? [],
            $hatian->fees ?? []
        );

        $participants = $hatian->participants ?? [];
        $paidCount = 0;
        $unpaidAmount = 0.0;

        foreach ($participants as $p) {
            $pid = $p['id'] ?? '';
            $net = $totals['per_participant_net'][$pid] ?? 0.0;
            $isPaid = ! empty($p['is_paid']) || ! empty($p['is_payer']);
            if ($isPaid) {
                $paidCount++;
            } else {
                $unpaidAmount += $net;
            }
        }

        return [
            'id' => $hatian->id,
            'share_code' => $hatian->share_code,
            'title' => $hatian->title,
            'category' => $hatian->category,
            'merchant' => $hatian->merchant,
            'currency' => $hatian->currency,
            'payer_name' => $hatian->payer_name,
            'participant_count' => count($participants),
            'paid_count' => $paidCount,
            'is_fully_paid' => $paidCount >= count($participants) && count($participants) > 0,
            'unpaid_amount' => round($unpaidAmount, 2),
            'subtotal' => $hatian->subtotal,
            'discount_total' => $hatian->discount_total,
            'fee_total' => $hatian->fee_total,
            'grand_total' => $hatian->grand_total,
            'created_at' => $hatian->created_at?->toISOString(),
            'created_at_human' => $hatian->created_at?->diffForHumans(),
        ];
    }

    protected function formatHatianDetail(Request $request, Hatian $hatian): array
    {
        $canEdit = $this->canEditHatian($request, $hatian);

        return [
            'id' => $hatian->id,
            'share_code' => $hatian->share_code,
            'edit_token' => $canEdit ? $hatian->edit_token : null,
            'can_edit' => $canEdit,
            'title' => $hatian->title,
            'category' => $hatian->category,
            'merchant' => $hatian->merchant,
            'currency' => $hatian->currency,
            'exchange_rate' => $hatian->exchange_rate,
            'payer_name' => $hatian->payer_name,
            'notes' => $hatian->notes,
            'participants' => $hatian->participants ?? [],
            'items' => $hatian->items ?? [],
            'discounts' => $hatian->discounts ?? [],
            'fees' => $hatian->fees ?? [],
            'payment_methods' => $hatian->payment_methods ?? [],
            'receipt_images' => $hatian->receipt_images ?? [],
            'subtotal' => $hatian->subtotal,
            'discount_total' => $hatian->discount_total,
            'fee_total' => $hatian->fee_total,
            'grand_total' => $hatian->grand_total,
            'allow_public_paid_toggle' => $hatian->allow_public_paid_toggle,
            'created_at' => $hatian->created_at?->toISOString(),
            'created_at_human' => $hatian->created_at?->diffForHumans(),
        ];
    }
}

