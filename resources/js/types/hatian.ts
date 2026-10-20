export type HatianCategory = 'food_delivery' | 'pasabuy' | 'travel' | 'dine_in' | 'other';

export interface Participant {
    id: string;
    name: string;
    color: string;
    is_payer?: boolean;
    is_paid?: boolean;
    paid_at?: string | null;
    payment_note?: string | null;
    payment_proof?: string | null;
}

export interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    assigned_to: string[];
    notes?: string;
}

export type SplitMode = 'proportional' | 'equal' | 'selected';

export interface DiscountItem {
    id: string;
    name: string;
    type: 'amount' | 'percentage';
    value: number;
    cap?: number | null;
    split_mode: SplitMode;
    assigned_to?: string[];
}

export interface FeeItem {
    id: string;
    name: string;
    type: 'amount' | 'percentage';
    value: number;
    split_mode: SplitMode;
    assigned_to?: string[];
}

export interface PaymentMethod {
    id: string;
    channel: string;
    account_name: string;
    account_number: string;
    qr_code?: string | null;
}

export interface HatianSummary {
    id: number;
    share_code: string;
    title: string;
    category: HatianCategory;
    merchant: string | null;
    currency: string;
    payer_name: string | null;
    participant_count: number;
    paid_count: number;
    is_fully_paid: boolean;
    unpaid_amount: number;
    subtotal: number;
    discount_total: number;
    fee_total: number;
    grand_total: number;
    created_at: string;
    created_at_human: string;
}

export interface HatianDetail {
    id?: number;
    share_code?: string;
    edit_token?: string | null;
    can_edit?: boolean;
    title: string;
    category: HatianCategory;
    merchant: string | null;
    currency: string;
    exchange_rate: number;
    payer_name: string | null;
    notes: string | null;
    participants: Participant[];
    items: OrderItem[];
    discounts: DiscountItem[];
    fees: FeeItem[];
    payment_methods: PaymentMethod[];
    receipt_images?: string[];
    subtotal?: number;
    discount_total?: number;
    fee_total?: number;
    grand_total?: number;
    allow_public_paid_toggle: boolean;
    created_at?: string;
    created_at_human?: string;
}

export interface ParticipantBreakdownItem {
    item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    shared_with_count: number;
    share_amount: number;
}

export interface ParticipantDiscountShare {
    discount_id: string;
    name: string;
    amount: number;
    split_mode: SplitMode;
}

export interface ParticipantFeeShare {
    fee_id: string;
    name: string;
    amount: number;
    split_mode: SplitMode;
}

export interface ParticipantComputed {
    participant: Participant;
    items: ParticipantBreakdownItem[];
    gross_subtotal: number;
    subtotal_ratio: number; // 0 to 1
    discounts: ParticipantDiscountShare[];
    discount_share: number;
    fees: ParticipantFeeShare[];
    fee_share: number;
    net_total: number;
    net_total_php: number;
}

export interface HatianComputationResult {
    subtotal: number;
    discount_total: number;
    fee_total: number;
    grand_total: number;
    grand_total_php: number;
    effective_discount_pct: number;
    participants: ParticipantComputed[];
    unassigned_items_count: number;
}

