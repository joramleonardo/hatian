import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { CATEGORY_META, compressImageToDataUrl, formatMoney, generateId } from '@/lib/hatian-calculator';
import { type BreadcrumbItem } from '@/types';
import { HatianCategory, HatianSummary, PaymentMethod } from '@/types/hatian';
import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    Percent,
    Plus,
    PlusCircle,
    QrCode,
    Receipt,
    Search,
    Sparkles,
    Trash2,
    TrendingUp,
    Upload,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface DashboardStats {
    total_hatians: number;
    active_hatians: number;
    total_collectible: number;
    total_discount_saved: number;
    total_volume: number;
}

interface DashboardProps {
    hatians: HatianSummary[];
    stats: DashboardStats;
    defaultPaymentMethods: PaymentMethod[];
}

export default function Dashboard({
    hatians = [],
    stats = {
        total_hatians: 0,
        active_hatians: 0,
        total_collectible: 0,
        total_discount_saved: 0,
        total_volume: 0,
    },
    defaultPaymentMethods = [],
}: DashboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<HatianCategory | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'settled'>('all');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Saved payment methods editor state
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods);
    const [showPaymentSettings, setShowPaymentSettings] = useState(false);
    const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);
    const [savedPaymentBanner, setSavedPaymentBanner] = useState(false);

    const filteredHatians = useMemo(() => {
        return hatians.filter((h) => {
            if (categoryFilter !== 'all' && h.category !== categoryFilter) {
                return false;
            }
            if (statusFilter === 'unpaid' && h.is_fully_paid) {
                return false;
            }
            if (statusFilter === 'settled' && !h.is_fully_paid) {
                return false;
            }
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const matchTitle = h.title.toLowerCase().includes(q);
                const matchMerchant = (h.merchant || '').toLowerCase().includes(q);
                const matchCode = h.share_code.toLowerCase().includes(q);
                return matchTitle || matchMerchant || matchCode;
            }
            return true;
        });
    }, [hatians, categoryFilter, statusFilter, searchQuery]);

    const handleCopyShareLink = async (shareCode: string) => {
        const url = `${window.location.origin}/s/${shareCode}`;
        await navigator.clipboard.writeText(url);
        setCopiedCode(shareCode);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleDuplicate = (shareCode: string) => {
        router.post(route('hatians.duplicate', shareCode));
    };

    const handleDelete = (shareCode: string, title: string) => {
        if (!window.confirm(`Delete "${title}"? This will remove its public share link.`)) {
            return;
        }
        router.delete(route('hatians.destroy', shareCode), { preserveScroll: true });
    };

    const addPaymentMethodRow = () => {
        setPaymentMethods((prev) => [
            ...prev,
            {
                id: generateId('pm'),
                channel: 'GCash',
                account_name: '',
                account_number: '',
                qr_code: null,
            },
        ]);
    };

    const updatePaymentMethodRow = (id: string, patch: Partial<PaymentMethod>) => {
        setPaymentMethods((prev) => prev.map((pm) => (pm.id === id ? { ...pm, ...patch } : pm)));
    };

    const handleQrUpload = async (id: string, file?: File | null) => {
        if (!file) return;
        try {
            const compressed = await compressImageToDataUrl(file);
            updatePaymentMethodRow(id, { qr_code: compressed });
        } catch (err) {
            console.error('Failed to process QR image', err);
        }
    };

    const removePaymentMethodRow = (id: string) => {
        setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
    };

    const handleSavePaymentMethods = () => {
        const cleaned = paymentMethods
            .filter(
                (pm) => pm.channel.trim() !== '' && (Boolean(pm.account_number?.trim()) || Boolean(pm.qr_code))
            )
            .map((pm) => ({
                ...pm,
                account_name: pm.account_name?.trim() || '',
                account_number: pm.account_number?.trim() || '',
                qr_code: pm.qr_code || null,
            }));
        setSavingPaymentMethods(true);
        router.put(
            route('settings.payment-methods'),
            { payment_methods: cleaned as unknown as Record<string, unknown>[] },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSavedPaymentBanner(true);
                    setTimeout(() => setSavedPaymentBanner(false), 2500);
                },
                onFinish: () => setSavingPaymentMethods(false),
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard — My Hatians" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                {/* Header & Primary Action */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">My Hatian Splits</h1>
                        <p className="text-muted-foreground text-sm">
                            Track your GrabFood group orders, pasabuys, barkada trips, and pending friend payments.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPaymentSettings(!showPaymentSettings)}
                            className="gap-1.5 border-[#E7DED3] hover:bg-[#FBF8F3] text-[#0C2D37] dark:text-stone-100"
                        >
                            <Wallet className="size-4 text-[#D95D28]" />
                            <span>Default Payment Accounts ({paymentMethods.length})</span>
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            className="gap-1.5 bg-[#D95D28] text-white hover:bg-[#C2410C] shadow-sm cursor-pointer"
                        >
                            <Link href={route('home')}>
                                <PlusCircle className="size-4" />
                                <span>New Hatian Split</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Default Payment Methods Drawer/Card */}
                {showPaymentSettings && (
                    <Card className="border border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/40">
                        <CardHeader className="pb-3 border-b border-[#E7DED3]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base text-[#0C2D37] dark:text-stone-100">
                                        Saved Default Payment Accounts (GCash / Maya / Bank)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Save your accounts once so they are automatically pre-filled whenever you create a new Hatian.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addPaymentMethodRow}
                                    className="h-8 gap-1 text-xs"
                                >
                                    <Plus className="size-3.5" />
                                    Add Account
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {paymentMethods.length === 0 ? (
                                <p className="text-muted-foreground text-xs">
                                    No default payment accounts saved yet. Click "Add Account" to add your GCash, Maya, or Bank details.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {paymentMethods.map((pm) => (
                                        <div
                                            key={pm.id}
                                            className="space-y-2 rounded-xl border border-border/80 bg-background/90 p-3 shadow-2xs"
                                        >
                                            <div className="grid grid-cols-12 items-center gap-2">
                                                <div className="col-span-12 sm:col-span-3">
                                                    <select
                                                        aria-label="Payment channel"
                                                        value={pm.channel}
                                                        onChange={(e) =>
                                                            updatePaymentMethodRow(pm.id, { channel: e.target.value })
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
                                                            updatePaymentMethodRow(pm.id, {
                                                                account_name: e.target.value,
                                                            })
                                                        }
                                                        className="bg-background h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="col-span-5 sm:col-span-4">
                                                    <Input
                                                        placeholder="Mobile / Account Number"
                                                        value={pm.account_number}
                                                        onChange={(e) =>
                                                            updatePaymentMethodRow(pm.id, {
                                                                account_number: e.target.value,
                                                            })
                                                        }
                                                        className="bg-background h-8 font-mono text-xs"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePaymentMethodRow(pm.id)}
                                                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                                        title="Remove payment channel"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* QR Attachment for default account */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
                                                        <QrCode className="size-3 text-purple-600 dark:text-purple-400" />
                                                        QR Code:
                                                    </span>
                                                    {pm.qr_code ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex size-6 items-center justify-center overflow-hidden rounded border border-purple-500/40 bg-white">
                                                                <img
                                                                    src={pm.qr_code}
                                                                    alt="QR"
                                                                    className="size-full object-cover"
                                                                />
                                                            </div>
                                                            <span className="font-semibold text-[#15803D] text-[11px]">
                                                                ✓ Saved with QR
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updatePaymentMethodRow(pm.id, { qr_code: null })
                                                                }
                                                                className="text-muted-foreground hover:text-destructive text-[11px] ml-1"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px] italic">
                                                            No QR image
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`dash-qr-upload-${pm.id}`}
                                                        className="hover:bg-accent inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#E7DED3] bg-background px-2.5 py-1 text-[11px] font-medium text-foreground shadow-2xs transition-colors"
                                                    >
                                                        <Upload className="size-3 text-[#D95D28]" />
                                                        {pm.qr_code ? 'Replace QR' : '+ Attach QR'}
                                                    </label>
                                                    <input
                                                        id={`dash-qr-upload-${pm.id}`}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) =>
                                                            handleQrUpload(pm.id, e.target.files?.[0])
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                {savedPaymentBanner && (
                                    <span className="text-xs font-semibold text-[#15803D]">
                                        ✓ Default payment methods saved!
                                    </span>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={savingPaymentMethods}
                                    onClick={handleSavePaymentMethods}
                                    className="bg-[#D95D28] text-white hover:bg-[#C2410C] cursor-pointer"
                                >
                                    {savingPaymentMethods ? 'Saving...' : 'Save Default Accounts'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-xs font-semibold uppercase">
                                    Left to Collect
                                </span>
                                <Clock className="size-4 text-amber-500" />
                            </div>
                            <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                                {formatMoney(stats.total_collectible)}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                Unpaid shares across {stats.active_hatians} active split(s)
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-xs font-semibold uppercase">
                                    Group Discounts Saved
                                </span>
                                <Percent className="size-4 text-[#D95D28]" />
                            </div>
                            <div className="mt-2 text-2xl font-extrabold text-[#D95D28]">
                                {formatMoney(stats.total_discount_saved)}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                Total promos & vouchers distributed fairly
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-xs font-semibold uppercase">
                                    Total Hatians
                                </span>
                                <Receipt className="size-4 text-blue-500" />
                            </div>
                            <div className="mt-2 text-2xl font-extrabold">{stats.total_hatians}</div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {stats.total_hatians - stats.active_hatians} fully settled • {stats.active_hatians} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-xs font-semibold uppercase">
                                    Total Bill Volume
                                </span>
                                <TrendingUp className="size-4 text-purple-500" />
                            </div>
                            <div className="mt-2 text-2xl font-extrabold">{formatMoney(stats.total_volume)}</div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                Combined net total of your group orders
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setCategoryFilter('all')}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                categoryFilter === 'all'
                                    ? 'bg-foreground text-background border-transparent'
                                    : 'bg-background hover:bg-accent text-muted-foreground'
                            }`}
                        >
                            All Categories
                        </button>
                        {(Object.keys(CATEGORY_META) as HatianCategory[]).map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategoryFilter(cat)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                    categoryFilter === cat
                                        ? 'bg-[#D95D28] text-white border-transparent'
                                        : 'bg-background hover:bg-accent text-muted-foreground border-[#E7DED3]'
                                }`}
                            >
                                {CATEGORY_META[cat].shortLabel}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            aria-label="Settlement status filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'unpaid' | 'settled')}
                            className="border-input bg-background h-9 rounded-md border border-[#E7DED3] px-2.5 text-xs font-medium"
                        >
                            <option value="all">All Statuses</option>
                            <option value="unpaid">Pending Collection</option>
                            <option value="settled">Fully Paid</option>
                        </select>

                        <div className="relative w-full sm:w-56">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                            <Input
                                placeholder="Search title or merchant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-8 text-xs border-[#E7DED3]"
                            />
                        </div>
                    </div>
                </div>

                {/* Hatians List */}
                {filteredHatians.length === 0 ? (
                    <Card className="border border-dashed border-[#E7DED3]">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#D95D28]/10 text-[#D95D28]">
                                <Receipt className="size-6" />
                            </div>
                            <h3 className="text-base font-bold text-[#0C2D37] dark:text-stone-100">No Hatians found</h3>
                            <p className="text-muted-foreground mt-1 max-w-md text-xs">
                                {hatians.length === 0
                                    ? 'Start splitting your first GrabFood group order, pasabuy, or barkada trip expense right now.'
                                    : 'No Hatians match your current search or filters.'}
                            </p>
                            <Button
                                asChild
                                size="sm"
                                className="mt-4 gap-1.5 bg-[#D95D28] text-white hover:bg-[#C2410C]"
                            >
                                <Link href={route('home')}>
                                    <PlusCircle className="size-4" />
                                    Create New Hatian
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {filteredHatians.map((h) => {
                            const progressPct =
                                h.participant_count > 0 ? (h.paid_count / h.participant_count) * 100 : 0;

                            return (
                                <Card key={h.id} className="flex flex-col justify-between shadow-2xs border border-[#E7DED3]">
                                    <CardHeader className="pb-3 border-b border-[#E7DED3] bg-[#FBF8F3]/50">
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge
                                                variant="outline"
                                                className={CATEGORY_META[h.category]?.badgeColor || ''}
                                            >
                                                {CATEGORY_META[h.category]?.label || h.category}
                                            </Badge>
                                            <span className="text-muted-foreground text-xs">
                                                {h.created_at_human}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-start justify-between gap-3">
                                            <div>
                                                <CardTitle className="text-base font-bold text-[#0C2D37] dark:text-stone-100">
                                                    <Link
                                                        href={route('hatians.show', h.share_code)}
                                                        className="hover:underline"
                                                    >
                                                        {h.title}
                                                    </Link>
                                                </CardTitle>
                                                {h.merchant && (
                                                    <CardDescription className="text-xs">
                                                        📍 {h.merchant}
                                                    </CardDescription>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-extrabold text-[#0C2D37] dark:text-stone-100">
                                                    {formatMoney(h.grand_total, h.currency)}
                                                </div>
                                                {h.discount_total > 0 && (
                                                    <div className="text-[11px] font-bold text-[#D95D28]">
                                                        Saved {formatMoney(h.discount_total, h.currency)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-3 pt-3">
                                        {/* Progress Bar */}
                                        <div className="bg-muted/40 rounded-xl border border-[#E7DED3] p-2.5 text-xs">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="font-medium">
                                                    {h.is_fully_paid ? (
                                                        <span className="inline-flex items-center gap-1 text-[#15803D] font-bold">
                                                            <CheckCircle2 className="size-3.5" />
                                                            All {h.participant_count} Paid
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                            <Clock className="size-3.5" />
                                                            {h.paid_count} of {h.participant_count} Paid
                                                        </span>
                                                    )}
                                                </span>
                                                {!h.is_fully_paid && (
                                                    <span className="text-muted-foreground">
                                                        <strong className="text-[#0C2D37] dark:text-stone-100">{formatMoney(h.unpaid_amount, h.currency)}</strong>{' '}
                                                        unpaid
                                                    </span>
                                                )}
                                            </div>
                                            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                                <div
                                                    className="h-full rounded-full bg-[#15803D] transition-all"
                                                    style={{ width: `${progressPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopyShareLink(h.share_code)}
                                                    className="h-8 gap-1.5 text-xs border-[#E7DED3]"
                                                >
                                                    {copiedCode === h.share_code ? (
                                                        <>
                                                            <Check className="size-3.5 text-[#15803D]" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="size-3.5" />
                                                            Copy Link
                                                        </>
                                                    )}
                                                </Button>

                                                <Button
                                                    asChild
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 gap-1.5 text-xs"
                                                >
                                                    <Link href={route('hatians.show', h.share_code)}>
                                                        <ExternalLink className="size-3.5" />
                                                        Open Receipt
                                                    </Link>
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDuplicate(h.share_code)}
                                                    className="h-8 gap-1 text-xs"
                                                    title="Duplicate for a new order with the same friends"
                                                >
                                                    <Sparkles className="size-3.5" />
                                                    Reuse
                                                </Button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(h.share_code, h.title)}
                                                    className="text-muted-foreground hover:text-destructive rounded-md p-1.5 transition-colors"
                                                    title="Delete Hatian"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
