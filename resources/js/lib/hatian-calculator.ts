import {
    DiscountItem,
    FeeItem,
    HatianCategory,
    HatianComputationResult,
    HatianDetail,
    OrderItem,
    Participant,
    ParticipantBreakdownItem,
    ParticipantComputed,
    ParticipantDiscountShare,
    ParticipantFeeShare,
    PaymentMethod,
} from '@/types/hatian';

export const PARTICIPANT_COLORS = [
    '#D95D28', // Deep Burnt Ochre / Warm Terracotta (Brand Primary)
    '#0C2D37', // Dark Petrol / Midnight Teal (Contrast Anchor)
    '#15803D', // Muted Sage Green
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f97316', // orange
    '#06b6d4', // cyan
    '#6366f1', // indigo
];

export const CURRENCIES: Record<string, { symbol: string; label: string; defaultRateToPhp: number }> = {
    PHP: { symbol: '₱', label: 'PHP (₱)', defaultRateToPhp: 1 },
    JPY: { symbol: '¥', label: 'JPY (¥)', defaultRateToPhp: 0.38 },
    KRW: { symbol: '₩', label: 'KRW (₩)', defaultRateToPhp: 0.042 },
    USD: { symbol: '$', label: 'USD ($)', defaultRateToPhp: 56.5 },
    SGD: { symbol: 'S$', label: 'SGD (S$)', defaultRateToPhp: 42.5 },
    THB: { symbol: '฿', label: 'THB (฿)', defaultRateToPhp: 1.65 },
    TWD: { symbol: 'NT$', label: 'TWD (NT$)', defaultRateToPhp: 1.78 },
};

export const CATEGORY_META: Record<
    HatianCategory,
    {
        label: string;
        shortLabel: string;
        description: string;
        badgeColor: string;
        merchantPlaceholder: string;
        titlePlaceholder: string;
    }
> = {
    food_delivery: {
        label: 'GrabFood / Delivery',
        shortLabel: 'Food Delivery',
        description: 'Group orders with shared delivery fees & group promo discounts',
        badgeColor: 'bg-[#D95D28]/15 text-[#C2410C] dark:text-[#EA7746] border-[#D95D28]/30',
        merchantPlaceholder: 'e.g., GrabFood - 24 Chicken',
        titlePlaceholder: 'e.g., Friday Lunch GrabFood Group Order',
    },
    pasabuy: {
        label: 'Pasabuy / Group Buy',
        shortLabel: 'Pasabuy',
        description: 'Shopping for friends with shared shipping, baggage, or store promos',
        badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        merchantPlaceholder: 'e.g., Don Quijote / Olive Young / Shopee',
        titlePlaceholder: 'e.g., Tokyo Donki & Matcha Pasabuy',
    },
    travel: {
        label: 'Travel / Barkada Trip',
        shortLabel: 'Travel',
        description: 'Van rentals, villas, boat tours, and barkada meal splits',
        badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        merchantPlaceholder: 'e.g., Siargao Trip / Airbnb / Klook',
        titlePlaceholder: 'e.g., Elyu Weekend Barkada Hatian',
    },
    dine_in: {
        label: 'Dine-In / KKB Receipt',
        shortLabel: 'Dine-In',
        description: 'Restaurant bills with service charge, VAT, or credit card promos',
        badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        merchantPlaceholder: 'e.g., Manam / Chili’s / Ramen Nagi',
        titlePlaceholder: 'e.g., Team Dinner at Manam',
    },
    other: {
        label: 'Custom Split',
        shortLabel: 'Custom',
        description: 'Any shared expense, household bill, or gift contribution',
        badgeColor: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
        merchantPlaceholder: 'e.g., Meralco / Spotify / Gift',
        titlePlaceholder: 'e.g., Shared Group Expense',
    },
};

export function generateId(prefix = 'id'): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatMoney(amount: number, currency = 'PHP'): string {
    const symbol = CURRENCIES[currency]?.symbol ?? '₱';
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${symbol}${safeAmount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function computeHatian(
    participants: Participant[],
    items: OrderItem[],
    discounts: DiscountItem[],
    fees: FeeItem[],
    exchangeRate = 1
): HatianComputationResult {
    const rate = exchangeRate > 0 ? exchangeRate : 1;

    const participantSubtotals: Record<string, number> = {};
    const participantItemsMap: Record<string, ParticipantBreakdownItem[]> = {};
    const participantDiscountsMap: Record<string, ParticipantDiscountShare[]> = {};
    const participantFeesMap: Record<string, ParticipantFeeShare[]> = {};
    const participantDiscountTotals: Record<string, number> = {};
    const participantFeeTotals: Record<string, number> = {};

    for (const p of participants) {
        participantSubtotals[p.id] = 0;
        participantItemsMap[p.id] = [];
        participantDiscountsMap[p.id] = [];
        participantFeesMap[p.id] = [];
        participantDiscountTotals[p.id] = 0;
        participantFeeTotals[p.id] = 0;
    }

    let subtotal = 0;
    let unassignedItemsCount = 0;

    for (const item of items) {
        const qty = Math.max(0, Number(item.quantity) || 0);
        const unitPrice = Math.max(0, Number(item.unit_price) || 0);
        const lineTotal = qty * unitPrice;

        const validAssignees = (item.assigned_to || []).filter((id) => id in participantSubtotals);

        if (validAssignees.length === 0) {
            if (lineTotal > 0 || item.name.trim() !== '') {
                unassignedItemsCount++;
            }
            continue;
        }

        subtotal += lineTotal;
        const shareAmount = lineTotal / validAssignees.length;

        for (const pid of validAssignees) {
            participantSubtotals[pid] += shareAmount;
            participantItemsMap[pid].push({
                item_id: item.id,
                name: item.name || 'Unnamed item',
                quantity: qty,
                unit_price: unitPrice,
                line_total: lineTotal,
                shared_with_count: validAssignees.length,
                share_amount: shareAmount,
            });
        }
    }

    // Active participants: those with order subtotal > 0 (fallback to all participants if subtotal is 0)
    const activeIds = participants.filter((p) => participantSubtotals[p.id] > 0).map((p) => p.id);
    const defaultTargetIds = activeIds.length > 0 ? activeIds : participants.map((p) => p.id);

    let discountTotal = 0;

    for (const discount of discounts) {
        const val = Math.max(0, Number(discount.value) || 0);
        if (val <= 0) continue;

        const mode = discount.split_mode || 'proportional';
        const targetIds =
            mode === 'selected' && discount.assigned_to && discount.assigned_to.length > 0
                ? discount.assigned_to.filter((id) => id in participantSubtotals)
                : defaultTargetIds;

        if (targetIds.length === 0) continue;

        const targetSubtotal = targetIds.reduce((sum, id) => sum + participantSubtotals[id], 0);

        let discAmount = discount.type === 'percentage' ? targetSubtotal * (val / 100) : val;
        if (discount.cap && Number(discount.cap) > 0) {
            discAmount = Math.min(discAmount, Number(discount.cap));
        }
        if (targetSubtotal > 0) {
            discAmount = Math.min(discAmount, targetSubtotal);
        }

        discountTotal += discAmount;

        if (mode === 'equal' || targetSubtotal <= 0) {
            const perPerson = discAmount / targetIds.length;
            for (const tid of targetIds) {
                participantDiscountTotals[tid] += perPerson;
                participantDiscountsMap[tid].push({
                    discount_id: discount.id,
                    name: discount.name || 'Discount',
                    amount: perPerson,
                    split_mode: mode,
                });
            }
        } else {
            for (const tid of targetIds) {
                const ratio = participantSubtotals[tid] / targetSubtotal;
                const share = discAmount * ratio;
                if (share > 0) {
                    participantDiscountTotals[tid] += share;
                    participantDiscountsMap[tid].push({
                        discount_id: discount.id,
                        name: discount.name || 'Discount',
                        amount: share,
                        split_mode: mode,
                    });
                }
            }
        }
    }

    let feeTotal = 0;

    for (const fee of fees) {
        const val = Math.max(0, Number(fee.value) || 0);
        if (val <= 0) continue;

        const mode = fee.split_mode || 'equal';
        const targetIds =
            mode === 'selected' && fee.assigned_to && fee.assigned_to.length > 0
                ? fee.assigned_to.filter((id) => id in participantSubtotals)
                : defaultTargetIds;

        if (targetIds.length === 0) continue;

        const targetSubtotal = targetIds.reduce((sum, id) => sum + participantSubtotals[id], 0);
        const feeAmount = fee.type === 'percentage' ? targetSubtotal * (val / 100) : val;

        feeTotal += feeAmount;

        if (mode === 'proportional' && targetSubtotal > 0) {
            for (const tid of targetIds) {
                const ratio = participantSubtotals[tid] / targetSubtotal;
                const share = feeAmount * ratio;
                if (share > 0) {
                    participantFeeTotals[tid] += share;
                    participantFeesMap[tid].push({
                        fee_id: fee.id,
                        name: fee.name || 'Fee',
                        amount: share,
                        split_mode: mode,
                    });
                }
            }
        } else {
            const perPerson = feeAmount / targetIds.length;
            for (const tid of targetIds) {
                participantFeeTotals[tid] += perPerson;
                participantFeesMap[tid].push({
                    fee_id: fee.id,
                    name: fee.name || 'Fee',
                    amount: perPerson,
                    split_mode: mode,
                });
            }
        }
    }

    const grandTotal = Math.max(0, subtotal - discountTotal + feeTotal);
    const effectiveDiscountPct = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;

    const computedParticipants: ParticipantComputed[] = participants.map((p) => {
        const gross = participantSubtotals[p.id] || 0;
        const disc = participantDiscountTotals[p.id] || 0;
        const fee = participantFeeTotals[p.id] || 0;
        const net = Math.max(0, gross - disc + fee);
        const ratio = subtotal > 0 ? gross / subtotal : 0;

        return {
            participant: p,
            items: participantItemsMap[p.id] || [],
            gross_subtotal: gross,
            subtotal_ratio: ratio,
            discounts: participantDiscountsMap[p.id] || [],
            discount_share: disc,
            fees: participantFeesMap[p.id] || [],
            fee_share: fee,
            net_total: net,
            net_total_php: net * rate,
        };
    });

    return {
        subtotal,
        discount_total: discountTotal,
        fee_total: feeTotal,
        grand_total: grandTotal,
        grand_total_php: grandTotal * rate,
        effective_discount_pct: effectiveDiscountPct,
        participants: computedParticipants,
        unassigned_items_count: unassignedItemsCount,
    };
}

export function createSampleHatian(preset: HatianCategory, defaultPaymentMethods: PaymentMethod[] = []): HatianDetail {
    const p1 = { id: 'p_you', name: 'Me (Payer)', color: PARTICIPANT_COLORS[0], is_payer: true, is_paid: true };
    const p2 = { id: 'p_marco', name: 'Marco', color: PARTICIPANT_COLORS[1], is_payer: false, is_paid: false };
    const p3 = { id: 'p_bea', name: 'Bea', color: PARTICIPANT_COLORS[2], is_payer: false, is_paid: false };
    const p4 = { id: 'p_kyla', name: 'Kyla', color: PARTICIPANT_COLORS[3], is_payer: false, is_paid: false };

    const paymentMethods: PaymentMethod[] =
        defaultPaymentMethods.length > 0
            ? defaultPaymentMethods
            : [
                  {
                      id: 'pm_1',
                      channel: 'GCash',
                      account_name: 'Alex D.',
                      account_number: '0917 123 4567',
                  },
              ];

    if (preset === 'pasabuy') {
        return {
            title: 'Tokyo Don Quijote & Matcha Pasabuy',
            category: 'pasabuy',
            merchant: 'Don Quijote Shibuya',
            currency: 'PHP',
            exchange_rate: 1,
            payer_name: 'Me (Payer)',
            notes: 'Tax-free discount applied proportionally! Baggage fee split equally.',
            allow_public_paid_toggle: true,
            participants: [p1, p2, p3],
            items: [
                { id: 'i_1', name: 'Ippodo Sayaka Matcha 40g', quantity: 1, unit_price: 980, assigned_to: ['p_you'] },
                { id: 'i_2', name: 'Rohto Melano CC Serum (2x)', quantity: 2, unit_price: 450, assigned_to: ['p_marco'] },
                { id: 'i_3', name: 'Fino Hair Mask + Royce Nama', quantity: 1, unit_price: 820, assigned_to: ['p_bea'] },
                { id: 'i_4', name: 'Assorted KitKat Party Pack (Shared)', quantity: 1, unit_price: 600, assigned_to: ['p_you', 'p_marco', 'p_bea'] },
            ],
            discounts: [
                {
                    id: 'd_1',
                    name: 'Donki Coupon + Tax Refund (10%)',
                    type: 'percentage',
                    value: 10,
                    cap: null,
                    split_mode: 'proportional',
                },
            ],
            fees: [
                {
                    id: 'f_1',
                    name: 'Extra Check-in Baggage Share',
                    type: 'amount',
                    value: 450,
                    split_mode: 'equal',
                },
            ],
            payment_methods: paymentMethods,
            receipt_images: [],
        };
    }

    if (preset === 'travel') {
        return {
            title: 'La Union Barkada Weekend Hatian',
            category: 'travel',
            merchant: 'Kabsat & Flotsam Outing',
            currency: 'PHP',
            exchange_rate: 1,
            payer_name: 'Me (Payer)',
            notes: 'Includes Klook group voucher discount and shared trike/service charges.',
            allow_public_paid_toggle: true,
            participants: [p1, p2, p3, p4],
            items: [
                { id: 'i_1', name: 'Shared Barkada Nachos & Sisig Platter', quantity: 1, unit_price: 1120, assigned_to: ['p_you', 'p_marco', 'p_bea', 'p_kyla'] },
                { id: 'i_2', name: 'Grilled Liempo Rice Bowl', quantity: 1, unit_price: 380, assigned_to: ['p_you'] },
                { id: 'i_3', name: 'Beef Tapa + 2 San Mig Pale', quantity: 1, unit_price: 540, assigned_to: ['p_marco'] },
                { id: 'i_4', name: 'Truffle Pasta + Cocktail', quantity: 1, unit_price: 620, assigned_to: ['p_bea'] },
                { id: 'i_5', name: 'Roast Chicken Quarter + Shake', quantity: 1, unit_price: 490, assigned_to: ['p_kyla'] },
            ],
            discounts: [
                {
                    id: 'd_1',
                    name: 'Credit Card 15% Barkada Promo',
                    type: 'percentage',
                    value: 15,
                    cap: 500,
                    split_mode: 'proportional',
                },
            ],
            fees: [
                {
                    id: 'f_1',
                    name: 'Service Charge (10%)',
                    type: 'percentage',
                    value: 10,
                    split_mode: 'proportional',
                },
            ],
            payment_methods: paymentMethods,
            receipt_images: [],
        };
    }

    // Default: GrabFood Group Order (the exact primary user scenario!)
    return {
        title: 'GrabFood Group Order — 24 Chicken & Coffee',
        category: 'food_delivery',
        merchant: 'GrabFood (24 Chicken)',
        currency: 'PHP',
        exchange_rate: 1,
        payer_name: 'Me (Payer)',
        notes: 'Group order discount + GrabUnlimited voucher applied proportionally to orders. Delivery fee split equally!',
        allow_public_paid_toggle: true,
        participants: [p1, p2, p3, p4],
        items: [
            { id: 'i_1', name: 'Jack Daniels Boneless Meal', quantity: 1, unit_price: 245, assigned_to: ['p_you'] },
            { id: 'i_2', name: 'Snow Cheese Half-Half Box', quantity: 1, unit_price: 470, assigned_to: ['p_marco'] },
            { id: 'i_3', name: 'Yangnyeom Solo Meal + Extra Rice', quantity: 1, unit_price: 280, assigned_to: ['p_bea'] },
            { id: 'i_4', name: 'Original Boneless Meal', quantity: 1, unit_price: 235, assigned_to: ['p_kyla'] },
            { id: 'i_5', name: 'Large Cajun Fries (Shared)', quantity: 1, unit_price: 160, assigned_to: ['p_bea', 'p_kyla'] },
        ],
        discounts: [
            {
                id: 'd_1',
                name: 'GrabFood Group Order Discount (10%)',
                type: 'percentage',
                value: 10,
                cap: null,
                split_mode: 'proportional',
            },
            {
                id: 'd_2',
                name: 'Promo Voucher (HOTDEALS)',
                type: 'amount',
                value: 100,
                cap: null,
                split_mode: 'proportional',
            },
        ],
        fees: [
            {
                id: 'f_1',
                name: 'Delivery Fee',
                type: 'amount',
                value: 59,
                split_mode: 'equal',
            },
            {
                id: 'f_2',
                name: 'Restaurant Packaging / Service Fee',
                type: 'amount',
                value: 15,
                split_mode: 'equal',
            },
        ],
        payment_methods: paymentMethods,
        receipt_images: [],
    };
}

export function createBlankHatian(category: HatianCategory = 'food_delivery', defaultPaymentMethods: PaymentMethod[] = []): HatianDetail {
    const p1 = { id: generateId('p'), name: 'Me (Payer)', color: PARTICIPANT_COLORS[0], is_payer: true, is_paid: true };
    const p2 = { id: generateId('p'), name: 'Friend 1', color: PARTICIPANT_COLORS[1], is_payer: false, is_paid: false };

    return {
        title: '',
        category,
        merchant: '',
        currency: 'PHP',
        exchange_rate: 1,
        payer_name: 'Me (Payer)',
        notes: '',
        allow_public_paid_toggle: true,
        participants: [p1, p2],
        items: [
            { id: generateId('item'), name: '', quantity: 1, unit_price: 0, assigned_to: [p1.id] },
            { id: generateId('item'), name: '', quantity: 1, unit_price: 0, assigned_to: [p2.id] },
        ],
        discounts:
            category === 'food_delivery'
                ? [
                      {
                          id: generateId('disc'),
                          name: 'Group Order Discount / Voucher',
                          type: 'amount',
                          value: 0,
                          cap: null,
                          split_mode: 'proportional',
                      },
                  ]
                : [],
        fees:
            category === 'food_delivery'
                ? [
                      {
                          id: generateId('fee'),
                          name: 'Delivery Fee',
                          type: 'amount',
                          value: 0,
                          split_mode: 'equal',
                      },
                  ]
                : [],
        payment_methods: defaultPaymentMethods,
        receipt_images: [],
    };
}

export function formatChatSummary(hatian: HatianDetail, result: HatianComputationResult, shareUrl?: string): string {
    const cur = hatian.currency || 'PHP';
    const lines: string[] = [];

    lines.push(`🧾 *${hatian.title || 'Hatian Bill Split'}*`);
    if (hatian.merchant) {
        lines.push(`📍 ${hatian.merchant}`);
    }
    lines.push(`────────────────────`);
    lines.push(`Subtotal: ${formatMoney(result.subtotal, cur)}`);
    if (result.discount_total > 0) {
        lines.push(`Discounts Saved: -${formatMoney(result.discount_total, cur)} (${result.effective_discount_pct.toFixed(1)}% off)`);
    }
    if (result.fee_total > 0) {
        lines.push(`Delivery / Fees: +${formatMoney(result.fee_total, cur)}`);
    }
    lines.push(`*Total Bill: ${formatMoney(result.grand_total, cur)}*`);
    lines.push(`────────────────────`);
    lines.push(`👥 *Individual Hatian:*`);

    for (const p of result.participants) {
        const statusIcon = p.participant.is_paid || p.participant.is_payer ? '✅' : '⏳';
        const discPart = p.discount_share > 0 ? ` (-${formatMoney(p.discount_share, cur)} disc)` : '';
        const feePart = p.fee_share > 0 ? ` (+${formatMoney(p.fee_share, cur)} fee)` : '';
        const phpEquivalent =
            cur !== 'PHP' && hatian.exchange_rate > 0 ? ` [≈ ${formatMoney(p.net_total_php, 'PHP')}]` : '';

        lines.push(
            `${statusIcon} *${p.participant.name}*: *${formatMoney(p.net_total, cur)}*${phpEquivalent} (Orders: ${formatMoney(p.gross_subtotal, cur)}${discPart}${feePart})`
        );
    }

    if (hatian.payment_methods && hatian.payment_methods.length > 0) {
        lines.push(`────────────────────`);
        lines.push(`💸 *Send payment to:*`);
        for (const pm of hatian.payment_methods) {
            const hasNum = Boolean(pm.account_number);
            const hasQr = Boolean(pm.qr_code);
            const namePart = pm.account_name ? ` (${pm.account_name})` : '';
            const qrPart = hasQr ? ' [QR attached]' : '';
            if (hasNum) {
                lines.push(`• ${pm.channel}: ${pm.account_number}${namePart}${qrPart}`);
            } else if (hasQr) {
                lines.push(`• ${pm.channel}: Scan QR on link${namePart}`);
            }
        }
    }

    if (hatian.notes) {
        lines.push(`📝 ${hatian.notes}`);
    }

    if (shareUrl) {
        lines.push(`────────────────────`);
        lines.push(`🔗 View full breakdown & mark paid: ${shareUrl}`);
    }

    return lines.join('\n');
}

/**
 * Client-side image compressor for payment QR codes & order receipts.
 * Scales large phone screenshots down to max 1000x1400 webp/jpeg to keep payloads lightweight (~40-80KB) while keeping text sharp.
 */
export function compressImageToDataUrl(file: File, maxWidth = 1000, maxHeight = 1400): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Selected file is not an image'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(e.target?.result as string);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                // Use image/jpeg for broad compatibility and compact size
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

