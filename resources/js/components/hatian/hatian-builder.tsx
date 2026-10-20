import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    CATEGORY_META,
    CURRENCIES,
    PARTICIPANT_COLORS,
    compressImageToDataUrl,
    computeHatian,
    createBlankHatian,
    createSampleHatian,
    formatChatSummary,
    formatMoney,
    generateId,
} from '@/lib/hatian-calculator';
import {
    DiscountItem,
    FeeItem,
    HatianCategory,
    HatianDetail,
    OrderItem,
    Participant,
    PaymentMethod,
    SplitMode,
} from '@/types/hatian';
import { router } from '@inertiajs/react';
import {
    Check,
    Copy,
    Crown,
    Download,
    Eye,
    Globe,
    HelpCircle,
    ImageIcon,
    Layers,
    Percent,
    Plane,
    Plus,
    QrCode,
    Receipt,
    RotateCcw,
    Share2,
    ShoppingBag,
    Sparkles,
    Tag,
    Trash2,
    Truck,
    Upload,
    Users,
    Utensils,
    Wallet,
    Wand2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

interface HatianBuilderProps {
    initialData?: HatianDetail | null;
    defaultPaymentMethods?: PaymentMethod[];
    isEditing?: boolean;
}

const STORAGE_DRAFT_KEY = 'hatian_guest_draft_v1';

const CATEGORY_ICONS: Record<HatianCategory, React.ReactNode> = {
    food_delivery: <Truck className="size-4" />,
    pasabuy: <ShoppingBag className="size-4" />,
    travel: <Plane className="size-4" />,
    dine_in: <Utensils className="size-4" />,
    other: <Layers className="size-4" />,
};

export function HatianBuilder({ initialData, defaultPaymentMethods = [], isEditing = false }: HatianBuilderProps) {
    const [hatian, setHatian] = useState<HatianDetail>(() => {
        if (initialData) {
            return initialData;
        }
        return createSampleHatian('food_delivery', defaultPaymentMethods);
    });

    const [newParticipantName, setNewParticipantName] = useState('');
    const [orderViewMode, setOrderViewMode] = useState<'all_items' | 'by_person'>('all_items');
    const [targetFinalTotalInput, setTargetFinalTotalInput] = useState('');
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [previewQrModal, setPreviewQrModal] = useState<{ open: boolean; src: string; title: string } | null>(null);
    const [previewReceiptModal, setPreviewReceiptModal] = useState<{ open: boolean; src: string; index: number } | null>(null);
    const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);

    // Load draft from localStorage on initial mount if not editing an existing record
    useEffect(() => {
        if (initialData || isEditing) return;
        try {
            const savedDraft = localStorage.getItem(STORAGE_DRAFT_KEY);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                if (parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.items)) {
                    setHatian(parsed);
                }
            }
        } catch {
            // Ignore localStorage parse errors
        }
    }, [initialData, isEditing]);

    // Save draft to localStorage when working as guest/new
    useEffect(() => {
        if (isEditing) return;
        try {
            localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(hatian));
        } catch {
            // Ignore storage quota errors
        }
    }, [hatian, isEditing]);

    const computation = useMemo(() => {
        return computeHatian(
            hatian.participants,
            hatian.items,
            hatian.discounts,
            hatian.fees,
            hatian.exchange_rate
        );
    }, [hatian.participants, hatian.items, hatian.discounts, hatian.fees, hatian.exchange_rate]);

    const currency = hatian.currency || 'PHP';
    const currencySymbol = CURRENCIES[currency]?.symbol ?? '₱';

    // Category / Preset handlers
    const handleCategorySelect = (category: HatianCategory) => {
        setHatian((prev) => ({
            ...prev,
            category,
        }));
    };

    const handleLoadSample = (category: HatianCategory) => {
        const sample = createSampleHatian(category, defaultPaymentMethods);
        setHatian(sample);
        setValidationError(null);
    };

    const handleResetBlank = () => {
        const blank = createBlankHatian(hatian.category, defaultPaymentMethods);
        setHatian(blank);
        setTargetFinalTotalInput('');
        setValidationError(null);
    };

    // Participant handlers
    const addParticipant = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newParticipantName.trim();
        if (!trimmed) return;

        const nextColor = PARTICIPANT_COLORS[hatian.participants.length % PARTICIPANT_COLORS.length];
        const newP: Participant = {
            id: generateId('p'),
            name: trimmed,
            color: nextColor,
            is_payer: hatian.participants.length === 0,
            is_paid: hatian.participants.length === 0,
        };

        setHatian((prev) => ({
            ...prev,
            participants: [...prev.participants, newP],
        }));
        setNewParticipantName('');
    };

    const updateParticipantName = (id: string, name: string) => {
        setHatian((prev) => ({
            ...prev,
            participants: prev.participants.map((p) => (p.id === id ? { ...p, name } : p)),
            payer_name: prev.participants.find((p) => p.id === id)?.is_payer ? name : prev.payer_name,
        }));
    };

    const setAsPayer = (id: string) => {
        setHatian((prev) => {
            const target = prev.participants.find((p) => p.id === id);
            return {
                ...prev,
                payer_name: target?.name ?? prev.payer_name,
                participants: prev.participants.map((p) => ({
                    ...p,
                    is_payer: p.id === id,
                    is_paid: p.id === id ? true : p.is_paid,
                })),
            };
        });
    };

    const removeParticipant = (id: string) => {
        if (hatian.participants.length <= 1) return;
        setHatian((prev) => {
            const remaining = prev.participants.filter((p) => p.id !== id);
            if (!remaining.some((p) => p.is_payer) && remaining.length > 0) {
                remaining[0].is_payer = true;
                remaining[0].is_paid = true;
            }
            return {
                ...prev,
                participants: remaining,
                items: prev.items.map((item) => ({
                    ...item,
                    assigned_to: item.assigned_to.filter((pid) => pid !== id),
                })),
            };
        });
    };

    // Item handlers
    const addItem = (defaultAssigneeIds?: string[]) => {
        const assignees =
            defaultAssigneeIds && defaultAssigneeIds.length > 0
                ? defaultAssigneeIds
                : hatian.participants[0]
                  ? [hatian.participants[0].id]
                  : [];

        const newItem: OrderItem = {
            id: generateId('item'),
            name: '',
            quantity: 1,
            unit_price: 0,
            assigned_to: assignees,
        };

        setHatian((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
    };

    const updateItem = (id: string, patch: Partial<OrderItem>) => {
        setHatian((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
    };

    const toggleItemAssignee = (itemId: string, participantId: string) => {
        setHatian((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
                if (item.id !== itemId) return item;
                const exists = item.assigned_to.includes(participantId);
                const nextAssignees = exists
                    ? item.assigned_to.filter((id) => id !== participantId)
                    : [...item.assigned_to, participantId];
                return {
                    ...item,
                    assigned_to: nextAssignees,
                };
            }),
        }));
    };

    const assignItemToEveryone = (itemId: string) => {
        const allIds = hatian.participants.map((p) => p.id);
        updateItem(itemId, { assigned_to: allIds });
    };

    const removeItem = (id: string) => {
        setHatian((prev) => ({
            ...prev,
            items: prev.items.filter((i) => i.id !== id),
        }));
    };

    // Discount handlers
    const addDiscount = () => {
        const newDisc: DiscountItem = {
            id: generateId('disc'),
            name: hatian.category === 'food_delivery' ? 'Group Order Discount / Voucher' : 'Promo Discount',
            type: 'amount',
            value: 0,
            cap: null,
            split_mode: 'proportional',
        };
        setHatian((prev) => ({
            ...prev,
            discounts: [...prev.discounts, newDisc],
        }));
    };

    const updateDiscount = (id: string, patch: Partial<DiscountItem>) => {
        setHatian((prev) => ({
            ...prev,
            discounts: prev.discounts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
    };

    const removeDiscount = (id: string) => {
        setHatian((prev) => ({
            ...prev,
            discounts: prev.discounts.filter((d) => d.id !== id),
        }));
    };

    // Fee handlers
    const addFee = () => {
        const newFee: FeeItem = {
            id: generateId('fee'),
            name:
                hatian.category === 'food_delivery'
                    ? 'Delivery Fee'
                    : hatian.category === 'pasabuy'
                      ? 'Shipping / Baggage Fee'
                      : 'Service / Extra Fee',
            type: 'amount',
            value: 0,
            split_mode: hatian.category === 'dine_in' ? 'proportional' : 'equal',
        };
        setHatian((prev) => ({
            ...prev,
            fees: [...prev.fees, newFee],
        }));
    };

    const updateFee = (id: string, patch: Partial<FeeItem>) => {
        setHatian((prev) => ({
            ...prev,
            fees: prev.fees.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }));
    };

    const removeFee = (id: string) => {
        setHatian((prev) => ({
            ...prev,
            fees: prev.fees.filter((f) => f.id !== id),
        }));
    };

    // Smart Receipt Total Matcher (auto-computes net discount from final amount charged!)
    const handleMatchFinalTotal = () => {
        const target = parseFloat(targetFinalTotalInput);
        if (!Number.isFinite(target) || target < 0) return;

        const grossPlusFees = computation.subtotal + computation.fee_total;
        const neededDiscount = grossPlusFees - target;

        if (neededDiscount >= 0) {
            setHatian((prev) => ({
                ...prev,
                discounts: [
                    {
                        id: generateId('disc'),
                        name: 'Total Earned Group Discount (Auto-computed)',
                        type: 'amount',
                        value: Number(neededDiscount.toFixed(2)),
                        cap: null,
                        split_mode: 'proportional',
                    },
                ],
            }));
        } else {
            // Final total is higher than subtotal + current fees -> add difference as a fee
            const extraFee = Math.abs(neededDiscount);
            setHatian((prev) => ({
                ...prev,
                fees: [
                    ...prev.fees,
                    {
                        id: generateId('fee'),
                        name: 'Additional Receipt Charges / Fees',
                        type: 'amount',
                        value: Number(extraFee.toFixed(2)),
                        split_mode: 'equal',
                    },
                ],
            }));
        }
        setTargetFinalTotalInput('');
    };

    // Payment method handlers
    const addPaymentMethod = () => {
        const pm: PaymentMethod = {
            id: generateId('pm'),
            channel: 'GCash',
            account_name: hatian.payer_name || '',
            account_number: '',
            qr_code: null,
        };
        setHatian((prev) => ({
            ...prev,
            payment_methods: [...prev.payment_methods, pm],
        }));
    };

    const updatePaymentMethod = (id: string, patch: Partial<PaymentMethod>) => {
        setHatian((prev) => ({
            ...prev,
            payment_methods: prev.payment_methods.map((pm) => (pm.id === id ? { ...pm, ...patch } : pm)),
        }));
    };

    const handleQrUpload = async (id: string, file?: File | null) => {
        if (!file) return;
        try {
            const compressed = await compressImageToDataUrl(file);
            updatePaymentMethod(id, { qr_code: compressed });
        } catch (err) {
            console.error('Failed to process QR image', err);
        }
    };

    const removePaymentMethod = (id: string) => {
        setHatian((prev) => ({
            ...prev,
            payment_methods: prev.payment_methods.filter((pm) => pm.id !== id),
        }));
    };

    const handleReceiptUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const current = hatian.receipt_images || [];
        if (current.length >= 5) {
            setValidationError('Maximum 5 receipt images allowed.');
            return;
        }
        const filesToProcess = Array.from(files).slice(0, 5 - current.length);
        setIsCompressingReceipt(true);
        setValidationError(null);
        try {
            const compressedPromises = filesToProcess.map((file) => compressImageToDataUrl(file, 1200, 1600));
            const newImages = await Promise.all(compressedPromises);
            setHatian((prev) => ({
                ...prev,
                receipt_images: [...(prev.receipt_images || []), ...newImages],
            }));
        } catch (err) {
            console.error('Failed to compress receipt image', err);
            setValidationError('Failed to process one or more receipt images. Please try another image.');
        } finally {
            setIsCompressingReceipt(false);
        }
    };

    const removeReceiptImage = (index: number) => {
        setHatian((prev) => ({
            ...prev,
            receipt_images: (prev.receipt_images || []).filter((_, i) => i !== index),
        }));
    };

    const handleCopyChatSummary = async () => {
        const shareUrl = hatian.share_code ? `${window.location.origin}/s/${hatian.share_code}` : window.location.origin;
        const text = formatChatSummary(hatian, computation, shareUrl);
        await navigator.clipboard.writeText(text);
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 2500);
    };

    const handleSaveAndShare = () => {
        setValidationError(null);

        const cleanTitle =
            hatian.title.trim() ||
            (hatian.merchant?.trim()
                ? `${hatian.merchant.trim()} Hatian`
                : `${CATEGORY_META[hatian.category].shortLabel} Hatian`);

        const validItems = hatian.items.filter(
            (i) => (i.name.trim() !== '' || i.unit_price > 0) && i.assigned_to.length > 0
        );

        if (hatian.participants.length === 0) {
            setValidationError('Please add at least one participant.');
            return;
        }

        if (validItems.length === 0) {
            setValidationError('Please add at least one item/order with a price and assign it to who ordered.');
            return;
        }

        const sanitizedItems = validItems.map((i, idx) => ({
            ...i,
            name: i.name.trim() || `Order Item #${idx + 1}`,
            quantity: Number(i.quantity) || 1,
            unit_price: Number(i.unit_price) || 0,
        }));

        const sanitizedDiscounts = hatian.discounts
            .filter((d) => Number(d.value) > 0)
            .map((d) => ({
                ...d,
                name: d.name.trim() || 'Group Discount',
                value: Number(d.value) || 0,
                cap: d.cap ? Number(d.cap) : null,
            }));

        const sanitizedFees = hatian.fees
            .filter((f) => Number(f.value) > 0)
            .map((f) => ({
                ...f,
                name: f.name.trim() || 'Delivery / Service Fee',
                value: Number(f.value) || 0,
            }));

        const sanitizedPaymentMethods = hatian.payment_methods
            .filter(
                (pm) => pm.channel.trim() !== '' && (Boolean(pm.account_number?.trim()) || Boolean(pm.qr_code))
            )
            .map((pm) => ({
                ...pm,
                account_name: pm.account_name?.trim() || '',
                account_number: pm.account_number?.trim() || '',
                qr_code: pm.qr_code || null,
            }));

        const metaCsrf =
            typeof document !== 'undefined'
                ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                : null;

        const payload: Record<string, unknown> = {
            title: cleanTitle,
            category: hatian.category,
            merchant: hatian.merchant?.trim() || null,
            currency: hatian.currency || 'PHP',
            exchange_rate: Number(hatian.exchange_rate) || 1,
            payer_name: hatian.payer_name?.trim() || hatian.participants.find((p) => p.is_payer)?.name || 'Payer',
            notes: hatian.notes?.trim() || null,
            allow_public_paid_toggle: hatian.allow_public_paid_toggle,
            participants: hatian.participants,
            items: sanitizedItems,
            discounts: sanitizedDiscounts,
            fees: sanitizedFees,
            payment_methods: sanitizedPaymentMethods,
            receipt_images: hatian.receipt_images || [],
            edit_token: hatian.edit_token,
            ...(metaCsrf ? { _token: metaCsrf } : {}),
        };

        setIsSaving(true);

        if (isEditing && hatian.share_code) {
            router.put(route('hatians.update', hatian.share_code), payload as Record<string, unknown>, {
                onFinish: () => setIsSaving(false),
                onError: (errors) => {
                    const firstErr = Object.values(errors)[0];
                    setValidationError(firstErr || 'Please check your inputs and try again.');
                },
            });
        } else {
            router.post(route('hatians.store'), payload as Record<string, unknown>, {
                onFinish: () => setIsSaving(false),
                onError: (errors) => {
                    const firstErr = Object.values(errors)[0];
                    setValidationError(firstErr || 'Please check your inputs and try again.');
                },
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Preset Bar & Quick Actions */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/40 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground mr-1 text-xs font-semibold tracking-wider uppercase text-[#0C2D37] dark:text-stone-200">
                        Split Mode:
                    </span>
                    {(Object.keys(CATEGORY_META) as HatianCategory[]).map((cat) => {
                        const active = hatian.category === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => handleCategorySelect(cat)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                    active
                                        ? 'bg-[#D95D28] text-white shadow-sm'
                                        : 'bg-background hover:bg-stone-100 text-stone-700 dark:text-stone-200 border border-[#E7DED3]'
                                }`}
                            >
                                {CATEGORY_ICONS[cat]}
                                <span>{CATEGORY_META[cat].label}</span>
                            </button>
                        );
                    })}
                </div>

                {!isEditing && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadSample(hatian.category)}
                            className="h-8 gap-1.5 text-xs border-[#E7DED3] hover:bg-[#F2EAE0] dark:hover:bg-stone-800 text-[#0C2D37] dark:text-stone-100"
                        >
                            <Sparkles className="size-3.5 text-[#D95D28]" />
                            Load {CATEGORY_META[hatian.category].shortLabel} Demo
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetBlank}
                            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs"
                        >
                            <RotateCcw className="size-3.5" />
                            Clear / Blank
                        </Button>
                    </div>
                )}
            </div>

            {validationError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                    {validationError}
                </div>
            )}

            {/* Main 2-Column Workspace */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* LEFT COLUMN: Builder Inputs (7 cols) */}
                <div className="space-y-6 lg:col-span-7">
                    {/* 1. Bill Details */}
                    <Card className="shadow-xs border border-[#E7DED3]">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#D95D28]/10 text-[#D95D28]">
                                        <Receipt className="size-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base text-[#0C2D37] dark:text-stone-100">1. Order / Bill Details</CardTitle>
                                        <CardDescription className="text-xs">
                                            {CATEGORY_META[hatian.category].description}
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* Currency selector for Pasabuy / Travel */}
                                <div className="flex items-center gap-2">
                                    <Globe className="text-muted-foreground size-3.5" />
                                    <select
                                        aria-label="Currency"
                                        value={hatian.currency}
                                        onChange={(e) => {
                                            const nextCur = e.target.value;
                                            const defaultRate = CURRENCIES[nextCur]?.defaultRateToPhp ?? 1;
                                            setHatian((prev) => ({
                                                ...prev,
                                                currency: nextCur,
                                                exchange_rate: nextCur === 'PHP' ? 1 : defaultRate,
                                            }));
                                        }}
                                        className="border-input bg-background rounded-md border px-2.5 py-1 text-xs font-medium"
                                    >
                                        {Object.entries(CURRENCIES).map(([code, meta]) => (
                                            <option key={code} value={code}>
                                                {meta.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="hatian-title" className="text-xs">
                                        Hatian Title
                                    </Label>
                                    <Input
                                        id="hatian-title"
                                        placeholder={CATEGORY_META[hatian.category].titlePlaceholder}
                                        value={hatian.title}
                                        onChange={(e) => setHatian((prev) => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="hatian-merchant" className="text-xs">
                                        Store / App / Merchant
                                    </Label>
                                    <Input
                                        id="hatian-merchant"
                                        placeholder={CATEGORY_META[hatian.category].merchantPlaceholder}
                                        value={hatian.merchant || ''}
                                        onChange={(e) => setHatian((prev) => ({ ...prev, merchant: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {hatian.currency !== 'PHP' && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                                    <div className="text-xs">
                                        <span className="font-semibold text-sky-700 dark:text-sky-300">
                                            Foreign Currency Pasabuy / Travel Mode ({hatian.currency})
                                        </span>
                                        <p className="text-muted-foreground">
                                            Enter item prices in {hatian.currency} ({currencySymbol}). We’ll also show each friend’s exact PHP (₱) equivalent!
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">1 {hatian.currency} = ₱</span>
                                        <Input
                                            type="number"
                                            step="0.0001"
                                            min="0.0001"
                                            value={hatian.exchange_rate}
                                            onChange={(e) =>
                                                setHatian((prev) => ({
                                                    ...prev,
                                                    exchange_rate: parseFloat(e.target.value) || 1,
                                                }))
                                            }
                                            className="h-8 w-24 text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order Receipt / Proof Attachment Card */}
                    <Card className="shadow-xs border border-[#E7DED3] bg-[#FBF8F3]/60 dark:bg-stone-900/30">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#D95D28]/10 text-[#D95D28]">
                                        <Receipt className="size-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-[#0C2D37] dark:text-stone-100">
                                            <span>Order Receipt / Proof Attachment</span>
                                            <Badge variant="outline" className="text-[10px] h-4.5 border-[#E7DED3] text-[#D95D28] bg-white dark:bg-stone-800">
                                                Optional
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Attach GrabFood order screenshots, restaurant bills, or store receipts so everyone can see and verify prices.
                                        </CardDescription>
                                    </div>
                                </div>

                                {hatian.receipt_images && hatian.receipt_images.length > 0 && (
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                        {hatian.receipt_images.length} / 5 Images
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {hatian.receipt_images && hatian.receipt_images.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                        {hatian.receipt_images.map((src, idx) => (
                                            <div
                                                key={idx}
                                                className="group relative flex flex-col overflow-hidden rounded-xl border border-[#E7DED3] bg-card shadow-2xs transition-all hover:border-[#D95D28]"
                                            >
                                                <div className="relative aspect-3/4 w-full overflow-hidden bg-muted/40">
                                                    <img
                                                        src={src}
                                                        alt={`Receipt photo ${idx + 1}`}
                                                        className="size-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewReceiptModal({ open: true, src, index: idx })}
                                                            className="rounded-full bg-white/90 p-1.5 text-zinc-900 shadow-sm hover:bg-white"
                                                            title="Inspect receipt"
                                                        >
                                                            <Eye className="size-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeReceiptImage(idx)}
                                                            className="rounded-full bg-red-600/90 p-1.5 text-white shadow-sm hover:bg-red-600"
                                                            title="Remove receipt photo"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                    <Badge
                                                        className="absolute top-1.5 left-1.5 bg-black/60 text-white backdrop-blur-xs text-[10px] h-4.5 px-1.5"
                                                    >
                                                        Receipt #{idx + 1}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between border-t p-2 text-[11px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewReceiptModal({ open: true, src, index: idx })}
                                                        className="font-semibold text-[#D95D28] hover:underline"
                                                    >
                                                        Tap to View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeReceiptImage(idx)}
                                                        className="text-muted-foreground hover:text-destructive text-[11px]"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {hatian.receipt_images.length < 5 && (
                                            <label
                                                htmlFor="receipt-upload-input"
                                                className="hover:border-[#D95D28] hover:bg-[#FBF8F3] flex aspect-3/4 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E7DED3] bg-muted/20 p-4 text-center transition-colors dark:hover:bg-stone-800"
                                            >
                                                <div className="rounded-full bg-[#D95D28]/10 p-2 text-[#D95D28]">
                                                    <Plus className="size-4" />
                                                </div>
                                                <span className="text-xs font-semibold text-foreground">
                                                    + Add Another Photo
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Page {hatian.receipt_images.length + 1} of 5
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>💡 Friends viewing the shared link can inspect these receipts to check individual item prices & promos.</span>
                                    </div>
                                </div>
                            ) : (
                                <label
                                    htmlFor="receipt-upload-input"
                                    className="hover:border-[#D95D28] hover:bg-[#FBF8F3] group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#E7DED3] bg-background/50 p-6 text-center transition-all dark:hover:bg-stone-800"
                                >
                                    <div className="flex size-11 items-center justify-center rounded-full bg-[#D95D28]/10 text-[#D95D28] transition-transform group-hover:scale-110">
                                        <Upload className="size-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-foreground">
                                            {isCompressingReceipt
                                                ? 'Compressing receipt images...'
                                                : 'Upload GrabFood / Restaurant Receipt Photo'}
                                        </div>
                                        <p className="mt-0.5 text-muted-foreground text-[11px]">
                                            Click or drag screenshots here (up to 5 photos). We auto-compress them so everyone can view them quickly!
                                        </p>
                                    </div>
                                </label>
                            )}

                            <input
                                id="receipt-upload-input"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                disabled={isCompressingReceipt || (hatian.receipt_images?.length ?? 0) >= 5}
                                onChange={(e) => {
                                    handleReceiptUpload(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* 2. Participants (Who ordered?) */}
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                        <Users className="size-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">
                                            2. Friends in the Order ({hatian.participants.length})
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Add everyone joining the group order. Click the crown icon on whoever paid the bill first.
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add new participant form */}
                            <form onSubmit={addParticipant} className="flex gap-2">
                                <Input
                                    placeholder="Add a friend's name (e.g., Marco, Bea, Kyla) and press Enter..."
                                    value={newParticipantName}
                                    onChange={(e) => setNewParticipantName(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit" variant="secondary" className="gap-1.5 shrink-0">
                                    <Plus className="size-4" />
                                    Add Person
                                </Button>
                            </form>

                            {/* Participant chips/rows */}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {hatian.participants.map((p) => (
                                    <div
                                        key={p.id}
                                        className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                                            p.is_payer
                                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                                : 'border-border bg-card'
                                        }`}
                                    >
                                        <span
                                            className="size-3.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: p.color }}
                                        />
                                        <input
                                            type="text"
                                            value={p.name}
                                            onChange={(e) => updateParticipantName(p.id, e.target.value)}
                                            aria-label="Participant name"
                                            className="min-w-0 flex-1 bg-transparent text-sm font-medium focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setAsPayer(p.id)}
                                            title={p.is_payer ? 'Bill Payer (Paid upfront)' : 'Set as Bill Payer'}
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                                                p.is_payer
                                                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                            }`}
                                        >
                                            <Crown className="size-3" />
                                            {p.is_payer ? 'Payer' : 'Make Payer'}
                                        </button>
                                        {hatian.participants.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeParticipant(p.id)}
                                                title="Remove participant"
                                                className="text-muted-foreground hover:text-destructive rounded-md p-1 transition-colors"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Placed Orders / Items */}
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                        <ShoppingBag className="size-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">
                                            3. Placed Orders & Shared Items
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Enter each item ordered and tap who ordered it (tap multiple friends for shared dishes!).
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* View toggle: All Items vs By Person */}
                                <div className="bg-muted inline-flex rounded-lg p-0.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setOrderViewMode('all_items')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                                            orderViewMode === 'all_items'
                                                ? 'bg-background text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        All Items ({hatian.items.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrderViewMode('by_person')}
                                        className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                                            orderViewMode === 'by_person'
                                                ? 'bg-background text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        By Person
                                    </button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {orderViewMode === 'all_items' ? (
                                <>
                                    <div className="space-y-3">
                                        {hatian.items.map((item, index) => {
                                            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                                            const isShared = item.assigned_to.length > 1;
                                            const isUnassigned = item.assigned_to.length === 0;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`rounded-xl border p-3 transition-colors ${
                                                        isUnassigned
                                                            ? 'border-amber-500/50 bg-amber-500/5'
                                                            : 'border-border bg-card/60'
                                                    }`}
                                                >
                                                    <div className="grid grid-cols-12 items-center gap-2">
                                                        <div className="col-span-12 sm:col-span-6">
                                                            <Label className="text-muted-foreground mb-1 block text-[11px] sm:hidden">
                                                                Item Name
                                                            </Label>
                                                            <Input
                                                                placeholder={`Item #${index + 1} (e.g., Snow Cheese Chicken)`}
                                                                value={item.name}
                                                                onChange={(e) =>
                                                                    updateItem(item.id, { name: e.target.value })
                                                                }
                                                                className="h-9 text-sm"
                                                            />
                                                        </div>
                                                        <div className="col-span-4 sm:col-span-2">
                                                            <Label className="text-muted-foreground mb-1 block text-[11px] sm:hidden">
                                                                Qty
                                                            </Label>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    step="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, {
                                                                            quantity: Math.max(0, parseFloat(e.target.value) || 0),
                                                                        })
                                                                    }
                                                                    className="h-9 pr-6 text-center text-sm"
                                                                    title="Quantity"
                                                                />
                                                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px]">
                                                                    ×
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-6 sm:col-span-3">
                                                            <Label className="text-muted-foreground mb-1 block text-[11px] sm:hidden">
                                                                Unit Price ({currencySymbol})
                                                            </Label>
                                                            <div className="relative">
                                                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                                                                    {currencySymbol}
                                                                </span>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={item.unit_price === 0 ? '' : item.unit_price}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, {
                                                                            unit_price: parseFloat(e.target.value) || 0,
                                                                        })
                                                                    }
                                                                    className="h-9 pl-7 text-sm font-medium"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item.id)}
                                                                title="Remove item"
                                                                className="text-muted-foreground hover:text-destructive rounded-lg p-1.5 transition-colors"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Assignee Pills */}
                                                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-muted-foreground mr-1 text-[11px] font-medium">
                                                                Ordered by:
                                                            </span>
                                                            {hatian.participants.map((p) => {
                                                                const selected = item.assigned_to.includes(p.id);
                                                                return (
                                                                    <button
                                                                        key={p.id}
                                                                        type="button"
                                                                        onClick={() => toggleItemAssignee(item.id, p.id)}
                                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                                                                            selected
                                                                                ? 'border-transparent text-white shadow-2xs'
                                                                                : 'border-border bg-background text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100'
                                                                        }`}
                                                                        style={
                                                                            selected
                                                                                ? { backgroundColor: p.color }
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        {!selected && (
                                                                            <span
                                                                                className="size-2 rounded-full"
                                                                                style={{ backgroundColor: p.color }}
                                                                            />
                                                                        )}
                                                                        <span>{p.name}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                            <button
                                                                type="button"
                                                                onClick={() => assignItemToEveryone(item.id)}
                                                                className="text-muted-foreground hover:text-foreground ml-1 rounded-full border border-dashed px-2 py-0.5 text-[11px] transition-colors"
                                                            >
                                                                All (Shared)
                                                            </button>
                                                        </div>

                                                        <div className="text-right text-xs">
                                                            {isShared && lineTotal > 0 ? (
                                                                <span className="text-muted-foreground">
                                                                    {formatMoney(lineTotal, currency)} ÷{' '}
                                                                    {item.assigned_to.length} ={' '}
                                                                    <strong className="text-foreground">
                                                                        {formatMoney(
                                                                            lineTotal / item.assigned_to.length,
                                                                            currency
                                                                        )}
                                                                        /ea
                                                                    </strong>
                                                                </span>
                                                            ) : isUnassigned ? (
                                                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                                                    Select who ordered this
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground font-medium">
                                                                    {formatMoney(lineTotal, currency)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => addItem()}
                                        className="w-full gap-1.5 border-dashed"
                                    >
                                        <Plus className="size-4" />
                                        Add Another Order / Item
                                    </Button>
                                </>
                            ) : (
                                /* BY PERSON VIEW: Super fast when looking at each friend's GrabFood group order! */
                                <div className="space-y-4">
                                    {hatian.participants.map((p) => {
                                        const personItems = hatian.items.filter((i) => i.assigned_to.includes(p.id));
                                        const personComputed = computation.participants.find(
                                            (cp) => cp.participant.id === p.id
                                        );

                                        return (
                                            <div key={p.id} className="rounded-xl border p-3.5">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="size-3 rounded-full"
                                                            style={{ backgroundColor: p.color }}
                                                        />
                                                        <span className="text-sm font-semibold">{p.name}</span>
                                                        {p.is_payer && (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                Payer
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-semibold">
                                                        Subtotal:{' '}
                                                        {formatMoney(personComputed?.gross_subtotal ?? 0, currency)}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {personItems.map((item) => (
                                                        <div key={item.id} className="flex items-center gap-2">
                                                            <Input
                                                                placeholder={`${p.name}'s order item...`}
                                                                value={item.name}
                                                                onChange={(e) =>
                                                                    updateItem(item.id, { name: e.target.value })
                                                                }
                                                                className="h-8 flex-1 text-xs"
                                                            />
                                                            <div className="relative w-28">
                                                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">
                                                                    {currencySymbol}
                                                                </span>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={item.unit_price === 0 ? '' : item.unit_price}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, {
                                                                            unit_price: parseFloat(e.target.value) || 0,
                                                                        })
                                                                    }
                                                                    className="h-8 pl-6 text-xs font-medium"
                                                                />
                                                            </div>
                                                            {item.assigned_to.length > 1 && (
                                                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                                                    Shared ÷{item.assigned_to.length}
                                                                </Badge>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item.id)}
                                                                className="text-muted-foreground hover:text-destructive p-1"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addItem([p.id])}
                                                        className="h-7 gap-1 text-xs"
                                                    >
                                                        <Plus className="size-3.5" />
                                                        Add item for {p.name}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 4. Discounts & Vouchers + Delivery / Extra Fees */}
                    <Card className="shadow-xs border border-[#E7DED3]">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-[#D95D28]/10 text-[#D95D28]">
                                    <Tag className="size-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-base text-[#0C2D37] dark:text-stone-100">
                                        4. Earned Discounts & Delivery / Extra Fees
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Discounts default to <strong>Proportional</strong> (bigger order = bigger share of the discount). Delivery fees default to <strong>Equal</strong> split.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* DISCOUNTS SECTION */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#D95D28] uppercase">
                                        <Percent className="size-3.5" />
                                        Discounts / Vouchers (-{formatMoney(computation.discount_total, currency)})
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addDiscount}
                                        className="h-7 gap-1 text-xs border-[#E7DED3] hover:bg-[#FBF8F3] text-[#0C2D37] dark:text-stone-100"
                                    >
                                        <Plus className="size-3.5" />
                                        Add Discount / Promo
                                    </Button>
                                </div>

                                {hatian.discounts.length === 0 ? (
                                    <p className="text-muted-foreground rounded-lg border border-dashed border-[#E7DED3] p-3 text-center text-xs">
                                        No discounts added yet. Earned a GrabFood group discount or promo voucher? Click "Add Discount / Promo".
                                    </p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {hatian.discounts.map((disc) => (
                                            <div
                                                key={disc.id}
                                                className="rounded-xl border border-[#D95D28]/25 bg-[#D95D28]/5 p-3"
                                            >
                                                <div className="grid grid-cols-12 items-center gap-2">
                                                    <div className="col-span-12 sm:col-span-5">
                                                        <Input
                                                            placeholder="e.g., Grab Group Order Discount"
                                                            value={disc.name}
                                                            onChange={(e) =>
                                                                updateDiscount(disc.id, { name: e.target.value })
                                                            }
                                                            className="bg-background h-8 text-xs"
                                                        />
                                                    </div>

                                                    <div className="col-span-5 sm:col-span-3">
                                                        <div className="flex">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateDiscount(disc.id, {
                                                                        type:
                                                                            disc.type === 'amount'
                                                                                ? 'percentage'
                                                                                : 'amount',
                                                                    })
                                                                }
                                                                className="border-input bg-muted hover:bg-accent rounded-l-md border border-r-0 px-2 text-xs font-semibold"
                                                                title="Toggle Fixed Amount vs Percentage"
                                                            >
                                                                {disc.type === 'amount' ? currencySymbol : '%'}
                                                            </button>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0"
                                                                value={disc.value === 0 ? '' : disc.value}
                                                                onChange={(e) =>
                                                                    updateDiscount(disc.id, {
                                                                        value: parseFloat(e.target.value) || 0,
                                                                    })
                                                                }
                                                                className="bg-background h-8 rounded-l-none text-xs font-semibold"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="col-span-5 sm:col-span-3">
                                                        <select
                                                            aria-label="Discount split mode"
                                                            value={disc.split_mode}
                                                            onChange={(e) =>
                                                                updateDiscount(disc.id, {
                                                                    split_mode: e.target.value as SplitMode,
                                                                })
                                                            }
                                                            className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                                                        >
                                                            <option value="proportional">Proportional (Fair %)</option>
                                                            <option value="equal">Equal Split (÷ All)</option>
                                                        </select>
                                                    </div>

                                                    <div className="col-span-2 flex justify-end sm:col-span-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDiscount(disc.id)}
                                                            className="text-muted-foreground hover:text-destructive p-1"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {disc.type === 'percentage' && (
                                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                                        <span className="text-muted-foreground">
                                                            Optional Max Cap ({currencySymbol}):
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            placeholder="No cap (e.g. 120)"
                                                            value={disc.cap ?? ''}
                                                            onChange={(e) =>
                                                                updateDiscount(disc.id, {
                                                                    cap: e.target.value
                                                                        ? parseFloat(e.target.value)
                                                                        : null,
                                                                })
                                                            }
                                                            className="bg-background h-7 w-32 text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* FEES SECTION */}
                            <div className="space-y-3 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                        <Truck className="size-3.5" />
                                        Delivery / Service / Extra Fees (+{formatMoney(computation.fee_total, currency)})
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addFee}
                                        className="h-7 gap-1 text-xs"
                                    >
                                        <Plus className="size-3.5" />
                                        Add Fee
                                    </Button>
                                </div>

                                {hatian.fees.length === 0 ? (
                                    <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
                                        No extra fees added. Have a delivery fee, packaging fee, or service charge? Click "Add Fee".
                                    </p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {hatian.fees.map((fee) => (
                                            <div
                                                key={fee.id}
                                                className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3"
                                            >
                                                <div className="grid grid-cols-12 items-center gap-2">
                                                    <div className="col-span-12 sm:col-span-5">
                                                        <Input
                                                            placeholder="e.g., Delivery Fee"
                                                            value={fee.name}
                                                            onChange={(e) =>
                                                                updateFee(fee.id, { name: e.target.value })
                                                            }
                                                            className="bg-background h-8 text-xs"
                                                        />
                                                    </div>

                                                    <div className="col-span-5 sm:col-span-3">
                                                        <div className="flex">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateFee(fee.id, {
                                                                        type:
                                                                            fee.type === 'amount'
                                                                                ? 'percentage'
                                                                                : 'amount',
                                                                    })
                                                                }
                                                                className="border-input bg-muted hover:bg-accent rounded-l-md border border-r-0 px-2 text-xs font-semibold"
                                                                title="Toggle Fixed Amount vs Percentage"
                                                            >
                                                                {fee.type === 'amount' ? currencySymbol : '%'}
                                                            </button>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0"
                                                                value={fee.value === 0 ? '' : fee.value}
                                                                onChange={(e) =>
                                                                    updateFee(fee.id, {
                                                                        value: parseFloat(e.target.value) || 0,
                                                                    })
                                                                }
                                                                className="bg-background h-8 rounded-l-none text-xs font-semibold"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="col-span-5 sm:col-span-3">
                                                        <select
                                                            aria-label="Fee split mode"
                                                            value={fee.split_mode}
                                                            onChange={(e) =>
                                                                updateFee(fee.id, {
                                                                    split_mode: e.target.value as SplitMode,
                                                                })
                                                            }
                                                            className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                                                        >
                                                            <option value="equal">Equal Split (÷ All)</option>
                                                            <option value="proportional">Proportional (%)</option>
                                                        </select>
                                                    </div>

                                                    <div className="col-span-2 flex justify-end sm:col-span-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFee(fee.id)}
                                                            className="text-muted-foreground hover:text-destructive p-1"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* SMART HELPER: Match Final Grab/Receipt Total */}
                            <div className="bg-muted/50 rounded-xl border p-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                                            <Wand2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>Lazy Discount Calculator (Match Final Receipt Total)</span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px]">
                                            Too many stacked Grab promos? Enter the <strong>final amount charged</strong> to your wallet/card and we’ll auto-compute the exact total discount!
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <div className="relative w-32">
                                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                                                {currencySymbol}
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="Final Paid"
                                                value={targetFinalTotalInput}
                                                onChange={(e) => setTargetFinalTotalInput(e.target.value)}
                                                className="bg-background h-8 pl-6 text-xs"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            disabled={!targetFinalTotalInput || computation.subtotal <= 0}
                                            onClick={handleMatchFinalTotal}
                                            className="h-8 text-xs"
                                        >
                                            Match Total
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. Payment Details (GCash / Maya / Bank) & Notes */}
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                                        <Wallet className="size-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">
                                            5. Where Friends Can Pay You (Optional)
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Add your GCash, Maya, or Bank details so friends can copy your number in one tap on the shared link.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addPaymentMethod}
                                    className="h-7 gap-1 text-xs"
                                >
                                    <Plus className="size-3.5" />
                                    Add Account
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {hatian.payment_methods.length > 0 && (
                                <div className="space-y-3">
                                    {hatian.payment_methods.map((pm) => (
                                        <div
                                            key={pm.id}
                                            className="space-y-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-2xs"
                                        >
                                            <div className="grid grid-cols-12 items-center gap-2">
                                                <div className="col-span-12 sm:col-span-3">
                                                    <select
                                                        aria-label="Payment channel"
                                                        value={pm.channel}
                                                        onChange={(e) =>
                                                            updatePaymentMethod(pm.id, { channel: e.target.value })
                                                        }
                                                        className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs font-medium"
                                                    >
                                                        <option value="GCash">GCash</option>
                                                        <option value="Maya">Maya</option>
                                                        <option value="GoTyme">GoTyme</option>
                                                        <option value="Maribank">Maribank</option>
                                                        <option value="Landbank">Landbank</option>
                                                        <option value="BPI">BPI</option>
                                                        <option value="BDO">BDO</option>
                                                        <option value="UnionBank">UnionBank</option>
                                                        <option value="Cash">Cash</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-6 sm:col-span-4">
                                                    <Input
                                                        placeholder="Account Name (e.g., Alex D.)"
                                                        value={pm.account_name}
                                                        onChange={(e) =>
                                                            updatePaymentMethod(pm.id, { account_name: e.target.value })
                                                        }
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="col-span-5 sm:col-span-4">
                                                    <Input
                                                        placeholder="Mobile / Account Number"
                                                        value={pm.account_number}
                                                        onChange={(e) =>
                                                            updatePaymentMethod(pm.id, {
                                                                account_number: e.target.value,
                                                            })
                                                        }
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePaymentMethod(pm.id)}
                                                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                                        title="Remove payment channel"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* QR Code / Image row */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
                                                        <QrCode className="size-3 text-purple-600 dark:text-purple-400" />
                                                        QR Code:
                                                    </span>

                                                    {pm.qr_code ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setPreviewQrModal({
                                                                        open: true,
                                                                        src: pm.qr_code!,
                                                                        title: `${pm.channel} QR Code — ${pm.account_name || 'Account'}`,
                                                                    })
                                                                }
                                                                className="group relative flex size-7 items-center justify-center overflow-hidden rounded-md border border-purple-500/40 bg-white shadow-2xs hover:ring-2 hover:ring-purple-500"
                                                                title="Click to view QR image"
                                                            >
                                                                <img
                                                                    src={pm.qr_code}
                                                                    alt="QR Thumbnail"
                                                                    className="size-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                                    <Eye className="size-3" />
                                                                </div>
                                                            </button>

                                                            <Badge
                                                                variant="outline"
                                                                className="h-5 gap-1 border-purple-500/30 bg-purple-500/10 text-[10px] text-purple-700 dark:text-purple-300"
                                                            >
                                                                <Check className="size-2.5 text-purple-600" />
                                                                QR Attached
                                                            </Badge>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setPreviewQrModal({
                                                                        open: true,
                                                                        src: pm.qr_code!,
                                                                        title: `${pm.channel} QR Code — ${pm.account_name || 'Account'}`,
                                                                    })
                                                                }
                                                                className="text-muted-foreground hover:text-foreground ml-1 text-[11px] underline"
                                                            >
                                                                Preview
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updatePaymentMethod(pm.id, { qr_code: null })
                                                                }
                                                                className="text-muted-foreground hover:text-destructive ml-1 text-[11px]"
                                                            >
                                                                Remove QR
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px] italic">
                                                            No QR attached
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`qr-upload-${pm.id}`}
                                                        className="hover:bg-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground shadow-2xs transition-colors"
                                                    >
                                                        <Upload className="size-3 text-purple-600 dark:text-purple-400" />
                                                        {pm.qr_code ? 'Replace QR Code' : '+ Attach QR Code / Image'}
                                                    </label>
                                                    <input
                                                        id={`qr-upload-${pm.id}`}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleQrUpload(pm.id, e.target.files?.[0])}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="hatian-notes" className="text-xs">
                                    Note to Friends (Optional)
                                </Label>
                                <Input
                                    id="hatian-notes"
                                    placeholder="e.g., Send GCash screenshot in our Messenger group chat!"
                                    value={hatian.notes || ''}
                                    onChange={(e) => setHatian((prev) => ({ ...prev, notes: e.target.value }))}
                                    className="text-xs"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Live Per-Person Hatian Breakdown & Share Actions (5 cols) */}
                <div className="lg:col-span-5">
                    <div className="sticky top-6 space-y-4">
                        <Card className="border border-[#E7DED3] shadow-md bg-card">
                            <CardHeader className="border-b border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/60 pb-4">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className={CATEGORY_META[hatian.category].badgeColor}>
                                        {CATEGORY_META[hatian.category].label}
                                    </Badge>
                                    {computation.effective_discount_pct > 0 && (
                                        <Badge className="bg-[#D95D28] text-white font-bold">
                                            Saved {computation.effective_discount_pct.toFixed(1)}% off orders!
                                        </Badge>
                                    )}
                                </div>

                                <CardTitle className="mt-2 text-lg text-[#0C2D37] dark:text-stone-100">
                                    {hatian.title.trim() || 'Live Hatian Breakdown'}
                                </CardTitle>
                                {hatian.merchant && (
                                    <CardDescription className="text-xs font-medium">
                                        {hatian.merchant}
                                    </CardDescription>
                                )}

                                {/* Top Totals Bar */}
                                <div className="bg-card mt-3 grid grid-cols-3 gap-2 rounded-xl border border-[#E7DED3] p-3 text-center shadow-2xs">
                                    <div>
                                        <div className="text-muted-foreground text-[11px]">Orders Subtotal</div>
                                        <div className="text-sm font-semibold text-[#0C2D37] dark:text-stone-100">
                                            {formatMoney(computation.subtotal, currency)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px]">Discounts / Fees</div>
                                        <div className="text-xs font-medium">
                                            <span className="text-[#D95D28] font-semibold">
                                                -{formatMoney(computation.discount_total, currency)}
                                            </span>
                                            {' / '}
                                            <span className="text-amber-600 dark:text-amber-400">
                                                +{formatMoney(computation.fee_total, currency)}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px]">Final Total</div>
                                        <div className="text-base font-extrabold text-[#0C2D37] dark:text-stone-100">
                                            {formatMoney(computation.grand_total, currency)}
                                        </div>
                                        {currency !== 'PHP' && (
                                            <div className="text-muted-foreground text-[10px]">
                                                ≈ {formatMoney(computation.grand_total_php, 'PHP')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 pt-4">
                                <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-[#0C2D37] dark:text-stone-300">
                                    <span>Each Person’s Exact Share</span>
                                    <span>Net to Pay</span>
                                </div>

                                {/* Per-Participant Cards */}
                                <div className="space-y-2.5">
                                    {computation.participants.map((cp) => (
                                        <div
                                            key={cp.participant.id}
                                            className="bg-card hover:border-[#D95D28]/40 rounded-xl border border-[#E7DED3] p-3 transition-all shadow-2xs"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="size-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: cp.participant.color }}
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-bold text-[#0C2D37] dark:text-stone-100">
                                                                {cp.participant.name}
                                                            </span>
                                                            {cp.participant.is_payer && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="h-4 px-1.5 text-[10px]"
                                                                >
                                                                    Payer
                                                                </Badge>
                                                            )}
                                                            <span className="text-muted-foreground text-[11px]">
                                                                ({(cp.subtotal_ratio * 100).toFixed(0)}% of order)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-base font-extrabold text-[#0C2D37] dark:text-stone-100">
                                                        {formatMoney(cp.net_total, currency)}
                                                    </div>
                                                    {currency !== 'PHP' && (
                                                        <div className="text-muted-foreground text-[11px] font-medium">
                                                            ≈ {formatMoney(cp.net_total_php, 'PHP')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Item list & Math breakdown */}
                                            <div className="mt-2 space-y-1 border-t pt-2 text-xs">
                                                {cp.items.length === 0 ? (
                                                    <div className="text-muted-foreground italic">
                                                        No items assigned yet
                                                    </div>
                                                ) : (
                                                    cp.items.map((item, idx) => (
                                                        <div
                                                            key={`${item.item_id}_${idx}`}
                                                            className="text-muted-foreground flex justify-between"
                                                        >
                                                            <span className="truncate pr-2">
                                                                {item.quantity > 1 ? `${item.quantity}× ` : ''}
                                                                {item.name}
                                                                {item.shared_with_count > 1
                                                                    ? ` (÷${item.shared_with_count})`
                                                                    : ''}
                                                            </span>
                                                            <span>{formatMoney(item.share_amount, currency)}</span>
                                                        </div>
                                                    ))
                                                )}

                                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                                                    <span className="text-muted-foreground">
                                                        Orders: <strong>{formatMoney(cp.gross_subtotal, currency)}</strong>
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {cp.discount_share > 0 && (
                                                            <span className="font-semibold text-[#D95D28]">
                                                                Discount: -{formatMoney(cp.discount_share, currency)}
                                                            </span>
                                                        )}
                                                        {cp.fee_share > 0 && (
                                                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                                                Fees: +{formatMoney(cp.fee_share, currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Primary Action Buttons */}
                                <div className="space-y-2.5 pt-3">
                                    <Button
                                        type="button"
                                        size="lg"
                                        disabled={isSaving}
                                        onClick={handleSaveAndShare}
                                        className="w-full gap-2 bg-[#D95D28] font-bold text-white shadow-md shadow-[#D95D28]/25 hover:bg-[#C2410C] transition-all text-sm cursor-pointer"
                                    >
                                        <Share2 className="size-4" />
                                        {isSaving
                                            ? 'Generating Shareable Link...'
                                            : isEditing
                                              ? 'Save Changes to Hatian Link'
                                              : 'Create Shareable Link for Friends'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCopyChatSummary}
                                        className="w-full gap-2 text-xs border-[#E7DED3] hover:bg-[#FBF8F3] dark:hover:bg-stone-800 text-[#0C2D37] dark:text-stone-100"
                                    >
                                        {copiedSummary ? (
                                            <>
                                                <Check className="size-4 text-[#15803D]" />
                                                Copied Summary for Messenger / Viber!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-4" />
                                                Copy Breakdown Text for Group Chat
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="text-muted-foreground flex items-start gap-1.5 rounded-lg bg-zinc-500/5 p-2.5 text-[11px]">
                                    <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
                                    <span>
                                        <strong>No account required!</strong> Creating a link generates a public receipt page where your friends can view how their share & group discount were computed and mark themselves paid.
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Full QR Code Preview Dialog */}
            {previewQrModal && (
                <Dialog
                    open={previewQrModal.open}
                    onOpenChange={(open) => !open && setPreviewQrModal(null)}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <QrCode className="size-4 text-purple-600 dark:text-purple-400" />
                                {previewQrModal.title}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Friends can scan this QR code or upload it to their GCash / Maya app to pay directly.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center justify-center p-2">
                            <div className="max-h-[70vh] max-w-full overflow-hidden rounded-xl border bg-white p-3 shadow-inner">
                                <img
                                    src={previewQrModal.src}
                                    alt="Payment QR Code"
                                    className="max-h-[50vh] w-auto rounded-lg object-contain"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t pt-3">
                            <a
                                href={previewQrModal.src}
                                download="payment-qr.jpg"
                                className="border-input bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                            >
                                <Download className="size-3.5" />
                                Download Image
                            </a>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setPreviewQrModal(null)}
                                className="h-8 text-xs"
                            >
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Receipt Modal Preview */}
            {previewReceiptModal && (
                <Dialog
                    open={Boolean(previewReceiptModal)}
                    onOpenChange={(open) => !open && setPreviewReceiptModal(null)}
                >
                    <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-4 sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base text-[#0C2D37] dark:text-stone-100">
                                <Receipt className="size-4 text-[#D95D28]" />
                                <span>Order Receipt #{previewReceiptModal.index + 1}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Uploaded receipt proof for {hatian.title || 'this Hatian'}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-auto rounded-xl border bg-zinc-950/5 dark:bg-zinc-950/50 p-2 flex items-center justify-center">
                            <img
                                src={previewReceiptModal.src}
                                alt={`Receipt #${previewReceiptModal.index + 1}`}
                                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t pt-3 mt-2">
                            <a
                                href={previewReceiptModal.src}
                                download={`receipt-${previewReceiptModal.index + 1}.jpg`}
                                className="border-input bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                            >
                                <Download className="size-3.5" />
                                Download Full Image
                            </a>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setPreviewReceiptModal(null)}
                                className="h-8 text-xs"
                            >
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

