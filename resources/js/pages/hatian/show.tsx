import { HatianBuilder } from '@/components/hatian/hatian-builder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    CATEGORY_META,
    compressImageToDataUrl,
    computeHatian,
    formatChatSummary,
    formatMoney,
} from '@/lib/hatian-calculator';
import { type SharedData } from '@/types';
import { HatianDetail } from '@/types/hatian';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Crown,
    Download,
    Edit3,
    ExternalLink,
    Eye,
    Image as ImageIcon,
    LayoutDashboard,
    LoaderCircle,
    PlusCircle,
    QrCode,
    Receipt,
    Share2,
    Sparkles,
    Tag,
    Trash2,
    Truck,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface ShowProps {
    hatian: HatianDetail;
}

export default function HatianShow({ hatian }: ShowProps) {
    const { auth } = usePage<SharedData>().props;
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | 'all'>('all');
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [copiedAccountIndex, setCopiedAccountIndex] = useState<number | null>(null);
    const [paymentNoteInputs, setPaymentNoteInputs] = useState<Record<string, string>>({});
    const [paymentProofInputs, setPaymentProofInputs] = useState<Record<string, string | null>>({});
    const [isUploadingProof, setIsUploadingProof] = useState<Record<string, boolean>>({});
    const [togglingParticipantId, setTogglingParticipantId] = useState<string | null>(null);
    const [selectedQrModal, setSelectedQrModal] = useState<{
        src: string;
        title: string;
        channel: string;
        accountName?: string;
        accountNumber?: string;
    } | null>(null);
    const [selectedReceiptModal, setSelectedReceiptModal] = useState<{
        src: string;
        index: number;
        totalImages: number;
    } | null>(null);
    const [selectedProofModal, setSelectedProofModal] = useState<{
        src: string;
        participantName: string;
        paymentNote?: string | null;
        netTotal: number;
    } | null>(null);
    const [markPaidModal, setMarkPaidModal] = useState<{
        participantId: string;
        participantName: string;
        netTotal: number;
    } | null>(null);

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
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/s/${hatian.share_code}` : '';

    // Settlement progress metrics
    const settlementStats = useMemo(() => {
        let paidCount = 0;
        let collectedAmount = 0;
        let unpaidAmount = 0;

        for (const cp of computation.participants) {
            const isSettled = Boolean(cp.participant.is_paid || cp.participant.is_payer);
            if (isSettled) {
                paidCount++;
                collectedAmount += cp.net_total;
            } else {
                unpaidAmount += cp.net_total;
            }
        }

        const totalParticipants = computation.participants.length;
        const progressPct = totalParticipants > 0 ? (paidCount / totalParticipants) * 100 : 0;

        return {
            paidCount,
            totalParticipants,
            collectedAmount,
            unpaidAmount,
            progressPct,
            isFullyPaid: paidCount === totalParticipants && totalParticipants > 0,
        };
    }, [computation.participants]);

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleCopySummary = async () => {
        const summary = formatChatSummary(hatian, computation, shareUrl);
        await navigator.clipboard.writeText(summary);
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 2500);
    };

    const handleCopyAccountNumber = async (accountNumber: string, idx: number) => {
        await navigator.clipboard.writeText(accountNumber);
        setCopiedAccountIndex(idx);
        setTimeout(() => setCopiedAccountIndex(null), 2000);
    };

    const handleProofUpload = async (participantId: string, file: File | undefined) => {
        if (!file) return;
        setIsUploadingProof((prev) => ({ ...prev, [participantId]: true }));
        try {
            const compressed = await compressImageToDataUrl(file, 1200, 1600);
            setPaymentProofInputs((prev) => ({ ...prev, [participantId]: compressed }));
        } catch (err) {
            console.error('Failed to compress proof image', err);
        } finally {
            setIsUploadingProof((prev) => ({ ...prev, [participantId]: false }));
        }
    };

    const handleRemoveProofInput = (participantId: string) => {
        setPaymentProofInputs((prev) => {
            const next = { ...prev };
            delete next[participantId];
            return next;
        });
    };

    const handleTogglePaid = (participantId: string, currentPaidState: boolean) => {
        if (!hatian.share_code) return;
        setTogglingParticipantId(participantId);

        const note = paymentNoteInputs[participantId];
        const proof = paymentProofInputs[participantId];
        const metaCsrf =
            typeof document !== 'undefined'
                ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                : null;

        router.patch(
            route('hatians.toggle-paid', {
                share_code: hatian.share_code,
                participant_id: participantId,
            }),
            {
                is_paid: !currentPaidState,
                payment_note: note !== undefined ? note : undefined,
                payment_proof: proof !== undefined ? proof : undefined,
                ...(metaCsrf ? { _token: metaCsrf } : {}),
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setTogglingParticipantId(null);
                    if (!currentPaidState) {
                        setPaymentProofInputs((prev) => {
                            const next = { ...prev };
                            delete next[participantId];
                            return next;
                        });
                    }
                },
            }
        );
    };

    const handleDuplicate = () => {
        if (!hatian.share_code) return;
        const metaCsrf =
            typeof document !== 'undefined'
                ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                : null;

        router.post(
            route('hatians.duplicate', hatian.share_code),
            metaCsrf ? { _token: metaCsrf } : {}
        );
    };

    const visibleParticipants =
        selectedParticipantId === 'all'
            ? computation.participants
            : computation.participants.filter((cp) => cp.participant.id === selectedParticipantId);

    return (
        <div className="bg-background text-foreground min-h-screen">
            <Head title={`${hatian.title} — Hatian Breakdown`} />

            {/* Top Navigation Header */}
            <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('home')}
                            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[#0C2D37] dark:text-stone-100"
                        >
                            <div className="flex size-8 items-center justify-center rounded-xl bg-[#D95D28] text-white shadow-xs">
                                <Receipt className="size-4" />
                            </div>
                            <span>Hatian</span>
                        </Link>
                        <span className="text-muted-foreground text-xs">/</span>
                        <Badge variant="outline" className="font-mono text-xs border-[#E7DED3]">
                            #{hatian.share_code}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-[#0C2D37] dark:text-stone-100">
                            <Link href={route('home')}>
                                <PlusCircle className="size-3.5" />
                                <span className="hidden sm:inline">New Hatian</span>
                            </Link>
                        </Button>

                        {auth.user ? (
                            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-[#E7DED3] hover:bg-[#FBF8F3] dark:hover:bg-stone-800 text-[#0C2D37] dark:text-stone-100">
                                <Link href={route('dashboard')}>
                                    <LayoutDashboard className="size-3.5 text-[#D95D28]" />
                                    <span>Dashboard</span>
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs border-[#E7DED3] hover:bg-[#FBF8F3] dark:hover:bg-stone-800 text-[#0C2D37] dark:text-stone-100">
                                <Link href={route('login')}>
                                    <span className="hidden sm:inline">Log in to Save History</span>
                                    <span className="sm:hidden">Log in</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
                {/* Action Banner for Sharing & Editing */}
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/40 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex size-2 rounded-full bg-[#D95D28]" />
                            <span className="text-xs font-bold tracking-wider text-[#D95D28] uppercase">
                                Public Shareable Hatian Link Ready
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Send this link to your friends on Messenger, Viber, or Telegram—no account or login needed to view!
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleCopyLink}
                            className="h-9 gap-1.5 bg-[#D95D28] text-xs font-bold text-white shadow-xs hover:bg-[#C2410C] transition-all cursor-pointer"
                        >
                            {copiedLink ? (
                                <>
                                    <Check className="size-3.5 text-white" />
                                    Link Copied!
                                </>
                            ) : (
                                <>
                                    <Share2 className="size-3.5" />
                                    Copy Share Link
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopySummary}
                            className="h-9 gap-1.5 text-xs border-[#E7DED3] hover:bg-[#FBF8F3] dark:hover:bg-stone-800 text-[#0C2D37] dark:text-stone-100"
                        >
                            {copiedSummary ? (
                                <>
                                    <Check className="size-3.5 text-[#15803D]" />
                                    Chat Text Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3.5" />
                                    Copy Chat Summary
                                </>
                            )}
                        </Button>

                        {hatian.can_edit && (
                            <Button
                                type="button"
                                variant={isEditingMode ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setIsEditingMode(!isEditingMode)}
                                className="h-9 gap-1.5 text-xs border-[#E7DED3]"
                            >
                                {isEditingMode ? (
                                    <>
                                        <X className="size-3.5" />
                                        Close Editor
                                    </>
                                ) : (
                                    <>
                                        <Edit3 className="size-3.5" />
                                        Edit Order / Discounts
                                    </>
                                )}
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDuplicate}
                            className="h-9 gap-1.5 text-xs"
                            title="Create a new Hatian with the same group & items"
                        >
                            <Sparkles className="size-3.5 text-[#D95D28]" />
                            Reuse Group
                        </Button>
                    </div>
                </div>

                {isEditingMode && hatian.can_edit ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#0C2D37] dark:text-stone-100">Editing Hatian: {hatian.title}</h2>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingMode(false)}>
                                <ArrowLeft className="mr-1.5 size-4" />
                                Back to Receipt View
                            </Button>
                        </div>
                        <HatianBuilder initialData={hatian} isEditing={true} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        {/* LEFT / MAIN: Who Are You Filter + Individual Share Cards (8 cols) */}
                        <div className="space-y-6 lg:col-span-8">
                            {/* Hero Receipt Header Card */}
                            <Card className="overflow-hidden shadow-xs border border-[#E7DED3]">
                                <CardHeader className="bg-[#FBF8F3] dark:bg-stone-900/50 border-b border-[#E7DED3] pb-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={CATEGORY_META[hatian.category].badgeColor}>
                                                {CATEGORY_META[hatian.category].label}
                                            </Badge>
                                            {hatian.receipt_images && hatian.receipt_images.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedReceiptModal({
                                                            src: hatian.receipt_images![0],
                                                            index: 0,
                                                            totalImages: hatian.receipt_images!.length,
                                                        })
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DED3] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#D95D28] hover:bg-stone-50 dark:bg-stone-800 transition-colors shadow-2xs"
                                                >
                                                    <Receipt className="size-3 text-[#D95D28]" />
                                                    <span>View Receipt ({hatian.receipt_images.length})</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-muted-foreground text-xs">
                                            Created {hatian.created_at_human || 'recently'}
                                        </span>
                                    </div>
                                    <CardTitle className="mt-2 text-2xl font-extrabold tracking-tight text-[#0C2D37] dark:text-stone-100">
                                        {hatian.title}
                                    </CardTitle>
                                    {hatian.merchant && (
                                        <CardDescription className="text-sm font-medium">
                                            📍 {hatian.merchant} • Paid upfront by{' '}
                                            <strong className="text-foreground">{hatian.payer_name || 'Payer'}</strong>
                                        </CardDescription>
                                    )}

                                    {/* Settlement Progress Bar */}
                                    <div className="bg-card mt-4 rounded-xl border border-[#E7DED3] p-3.5 shadow-2xs">
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-1.5 font-semibold text-[#0C2D37] dark:text-stone-200">
                                                <CheckCircle2 className="size-4 text-[#15803D]" />
                                                <span>
                                                    Settlement Status: {settlementStats.paidCount} of{' '}
                                                    {settlementStats.totalParticipants} Paid
                                                </span>
                                            </div>
                                            <div className="text-muted-foreground">
                                                {settlementStats.isFullyPaid ? (
                                                    <span className="font-bold text-[#15803D]">
                                                        🎉 All settled!
                                                    </span>
                                                ) : (
                                                    <span>
                                                        <strong className="text-[#0C2D37] dark:text-stone-100">
                                                            {formatMoney(settlementStats.unpaidAmount, currency)}
                                                        </strong>{' '}
                                                        left to collect
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                                            <div
                                                className="h-full rounded-full bg-[#15803D] transition-all duration-500"
                                                style={{ width: `${settlementStats.progressPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* "Who are you?" Quick Name Filter */}
                                <CardContent className="pt-4">
                                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                                        <Users className="size-3.5 text-[#D95D28]" />
                                        <span>Tap your name to focus on your exact share:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipantId('all')}
                                            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                                selectedParticipantId === 'all'
                                                    ? 'bg-[#0C2D37] text-white border-transparent shadow-xs dark:bg-stone-100 dark:text-stone-900'
                                                    : 'bg-background hover:bg-accent text-muted-foreground hover:text-foreground border-[#E7DED3]'
                                            }`}
                                        >
                                            Show Everyone ({computation.participants.length})
                                        </button>
                                        {computation.participants.map((cp) => {
                                            const active = selectedParticipantId === cp.participant.id;
                                            const isSettled = Boolean(
                                                cp.participant.is_paid || cp.participant.is_payer
                                            );
                                            return (
                                                <button
                                                    key={cp.participant.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedParticipantId(
                                                            active ? 'all' : cp.participant.id
                                                        )
                                                    }
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                                        active
                                                            ? 'border-transparent text-white shadow-sm'
                                                            : 'bg-background hover:bg-accent text-foreground border-[#E7DED3]'
                                                    }`}
                                                    style={
                                                        active
                                                            ? { backgroundColor: cp.participant.color }
                                                            : undefined
                                                    }
                                                >
                                                    {!active && (
                                                        <span
                                                            className="size-2.5 rounded-full"
                                                            style={{ backgroundColor: cp.participant.color }}
                                                        />
                                                    )}
                                                    <span>{cp.participant.name}</span>
                                                    <span className={active ? 'opacity-90' : 'text-muted-foreground'}>
                                                        • {formatMoney(cp.net_total, currency)}
                                                    </span>
                                                    {isSettled && (
                                                        <CheckCircle2
                                                            className={`size-3.5 ${
                                                                active ? 'text-white' : 'text-[#15803D]'
                                                            }`}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Individual Breakdown Cards */}
                            <div className="space-y-4">
                                {visibleParticipants.map((cp) => {
                                    const isSettled = Boolean(cp.participant.is_paid || cp.participant.is_payer);
                                    const canTogglePaid = hatian.allow_public_paid_toggle || hatian.can_edit;

                                    return (
                                        <Card
                                            key={cp.participant.id}
                                            className={`overflow-hidden transition-all border-[#E7DED3] ${
                                                selectedParticipantId === cp.participant.id
                                                    ? 'ring-2 ring-[#D95D28]'
                                                    : ''
                                            } ${isSettled ? 'border-[#15803D]/30' : ''}`}
                                        >
                                            <div
                                                className="h-1.5 w-full"
                                                style={{ backgroundColor: cp.participant.color }}
                                            />
                                            <CardContent className="p-5">
                                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs"
                                                            style={{ backgroundColor: cp.participant.color }}
                                                        >
                                                            {cp.participant.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="text-lg font-bold text-[#0C2D37] dark:text-stone-100">
                                                                    {cp.participant.name}
                                                                </h3>
                                                                {cp.participant.is_payer && (
                                                                    <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                                                        <Crown className="size-3" />
                                                                        Bill Payer
                                                                    </Badge>
                                                                )}
                                                                {isSettled ? (
                                                                    <Badge className="gap-1 bg-[#15803D]/15 text-[#15803D] dark:text-emerald-400 border-[#15803D]/30 font-semibold">
                                                                        <CheckCircle2 className="size-3" />
                                                                        Paid
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                                                                    >
                                                                        <Clock className="size-3" />
                                                                        To Pay
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-muted-foreground text-xs">
                                                                Order share: {(cp.subtotal_ratio * 100).toFixed(1)}% of total group items
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-muted/40 flex flex-row items-center justify-between rounded-xl border border-[#E7DED3] px-4 py-2.5 sm:flex-col sm:items-end sm:justify-center">
                                                        <span className="text-muted-foreground text-xs font-medium">
                                                            Exact Net to Pay
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-extrabold text-[#0C2D37] dark:text-stone-100">
                                                                {formatMoney(cp.net_total, currency)}
                                                            </div>
                                                            {currency !== 'PHP' && (
                                                                <div className="text-muted-foreground text-xs font-semibold">
                                                                    ≈ {formatMoney(cp.net_total_php, 'PHP')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Detailed Calculation Table for this Person */}
                                                <div className="bg-muted/20 mt-4 rounded-xl border p-3.5 text-xs">
                                                    <div className="text-muted-foreground mb-2 font-semibold tracking-wider uppercase text-[10px]">
                                                        Placed Orders / Items
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {cp.items.map((item, idx) => (
                                                            <div
                                                                key={`${item.item_id}_${idx}`}
                                                                className="flex items-center justify-between"
                                                            >
                                                                <span className="font-medium">
                                                                    {item.quantity > 1 ? `${item.quantity}× ` : ''}
                                                                    {item.name}
                                                                    {item.shared_with_count > 1 && (
                                                                        <span className="text-muted-foreground ml-1.5 rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px]">
                                                                            Shared ÷{item.shared_with_count} (
                                                                            {formatMoney(item.line_total, currency)} total)
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className="font-semibold">
                                                                    {formatMoney(item.share_amount, currency)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Subtotal, Discount Shares, Fee Shares */}
                                                    <div className="mt-3 space-y-1 border-t pt-2.5">
                                                        <div className="text-muted-foreground flex justify-between">
                                                            <span>Gross Order Subtotal</span>
                                                            <span className="font-semibold">
                                                                {formatMoney(cp.gross_subtotal, currency)}
                                                            </span>
                                                        </div>

                                                        {cp.discounts.map((d) => (
                                                            <div
                                                                key={d.discount_id}
                                                                className="flex justify-between text-[#D95D28] font-semibold"
                                                            >
                                                                <span>
                                                                    Less: {d.name} (
                                                                    {d.split_mode === 'proportional'
                                                                        ? `${(cp.subtotal_ratio * 100).toFixed(1)}% proportional share`
                                                                        : 'equal split'}
                                                                    )
                                                                </span>
                                                                <span className="font-bold">
                                                                    -{formatMoney(d.amount, currency)}
                                                                </span>
                                                            </div>
                                                        ))}

                                                        {cp.fees.map((f) => (
                                                            <div
                                                                key={f.fee_id}
                                                                className="flex justify-between text-amber-600 dark:text-amber-400"
                                                            >
                                                                <span>
                                                                    Plus: {f.name} (
                                                                    {f.split_mode === 'equal'
                                                                        ? 'equal split'
                                                                        : `${(cp.subtotal_ratio * 100).toFixed(1)}% proportional`}
                                                                    )
                                                                </span>
                                                                <span className="font-semibold">
                                                                    +{formatMoney(f.amount, currency)}
                                                                </span>
                                                            </div>
                                                        ))}

                                                        <div className="flex justify-between border-t pt-2 text-sm font-bold text-[#0C2D37] dark:text-stone-100">
                                                            <span>Final Net Share</span>
                                                            <span className="font-extrabold">
                                                                {formatMoney(cp.net_total, currency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mark as Paid / Payment Reference & Proof Section */}
                                                {!cp.participant.is_payer && canTogglePaid && (
                                                    <div className="mt-4 rounded-xl border border-[#E7DED3] bg-[#FBF8F3]/60 dark:bg-stone-900/40 p-3 sm:p-3.5 space-y-3">
                                                        {isSettled ? (
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2 text-xs text-[#15803D] font-bold">
                                                                        <CheckCircle2 className="size-4 shrink-0" />
                                                                        <span>Marked as Paid</span>
                                                                        {cp.participant.paid_at && (
                                                                            <span className="text-muted-foreground text-[10px] font-normal">
                                                                                • {new Date(cp.participant.paid_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {cp.participant.payment_note && (
                                                                        <p className="text-xs text-muted-foreground pl-6">
                                                                            "{cp.participant.payment_note}"
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
                                                                    {cp.participant.payment_proof && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                setSelectedProofModal({
                                                                                    src: cp.participant.payment_proof!,
                                                                                    participantName: cp.participant.name,
                                                                                    paymentNote: cp.participant.payment_note,
                                                                                    netTotal: cp.net_total,
                                                                                })
                                                                            }
                                                                            className="h-8 gap-1.5 border-[#E7DED3] bg-background hover:bg-stone-50 text-xs font-semibold text-[#0C2D37] dark:text-stone-100 shadow-2xs cursor-pointer"
                                                                        >
                                                                            <Receipt className="size-3.5 text-[#D95D28]" />
                                                                            <span>View Proof</span>
                                                                        </Button>
                                                                    )}

                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        disabled={togglingParticipantId === cp.participant.id}
                                                                        onClick={() => handleTogglePaid(cp.participant.id, isSettled)}
                                                                        className="h-8 text-xs text-muted-foreground hover:text-red-600 cursor-pointer"
                                                                    >
                                                                        Mark Unpaid
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-[#0C2D37] dark:text-stone-100">
                                                                        Mark Your Share as Paid:
                                                                    </span>
                                                                    {paymentProofInputs[cp.participant.id] ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D]">
                                                                            <Check className="size-3" />
                                                                            Screenshot ready
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                                                            Screenshot required *
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {paymentProofInputs[cp.participant.id] ? (
                                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                                        <div className="flex items-center gap-1.5 rounded-lg border border-[#15803D]/40 bg-[#15803D]/10 px-2.5 py-1.5 text-xs flex-1 justify-between">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setSelectedProofModal({
                                                                                        src: paymentProofInputs[cp.participant.id]!,
                                                                                        participantName: cp.participant.name,
                                                                                        paymentNote: paymentNoteInputs[cp.participant.id],
                                                                                        netTotal: cp.net_total,
                                                                                    })
                                                                                }
                                                                                className="flex items-center gap-1.5 font-semibold text-[#15803D] hover:underline cursor-pointer truncate"
                                                                                title="Preview attached screenshot"
                                                                            >
                                                                                <ImageIcon className="size-3.5 shrink-0" />
                                                                                <span className="truncate">View Attached Screenshot</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveProofInput(cp.participant.id)}
                                                                                className="text-stone-500 hover:text-red-600 ml-1 cursor-pointer p-0.5"
                                                                                title="Remove attachment"
                                                                            >
                                                                                <X className="size-3.5" />
                                                                            </button>
                                                                        </div>

                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            disabled={togglingParticipantId === cp.participant.id}
                                                                            onClick={() => handleTogglePaid(cp.participant.id, isSettled)}
                                                                            className="h-10 gap-1.5 bg-[#15803D] px-4 text-xs font-bold text-white hover:bg-[#15803D]/90 shadow-2xs cursor-pointer shrink-0"
                                                                        >
                                                                            <Check className="size-3.5" />
                                                                            <span>Confirm Paid</span>
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                setMarkPaidModal({
                                                                                    participantId: cp.participant.id,
                                                                                    participantName: cp.participant.name,
                                                                                    netTotal: cp.net_total,
                                                                                })
                                                                            }
                                                                            className="w-full sm:w-auto h-10 gap-2 bg-[#D95D28] hover:bg-[#C2410C] text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                                                                        >
                                                                            <Camera className="size-4" />
                                                                            <span>Attach Screenshot & Mark Paid</span>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR: Payment Methods & Full Group Receipt Summary (4 cols) */}
                        <div className="space-y-6 lg:col-span-4">
                            {/* Payment Channels Card */}
                            <Card className="border border-[#E7DED3] shadow-xs overflow-hidden">
                                <CardHeader className="pb-3 border-b border-[#E7DED3] bg-[#FBF8F3]/60">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-[#D95D28]/10 text-[#D95D28]">
                                            <Wallet className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base text-[#0C2D37] dark:text-stone-100">
                                                Send Payment To {hatian.payer_name || 'Payer'}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Tap a number to copy it directly to your clipboard.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-3.5">
                                    {hatian.payment_methods && hatian.payment_methods.length > 0 ? (
                                        hatian.payment_methods.map((pm, idx) => (
                                            <div
                                                key={pm.id || idx}
                                                className="bg-card space-y-2.5 rounded-xl border border-[#E7DED3] p-3 shadow-2xs"
                                            >
                                                {/* Channel Header & Account Name */}
                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge variant="secondary" className="text-xs font-bold bg-[#0C2D37] text-white dark:bg-stone-100 dark:text-stone-900">
                                                            {pm.channel}
                                                        </Badge>
                                                        {pm.account_name && (
                                                            <span className="text-xs font-bold text-[#0C2D37] dark:text-stone-100">
                                                                {pm.account_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {pm.qr_code && (
                                                        <Badge
                                                            variant="outline"
                                                            className="h-4.5 border-purple-500/40 bg-purple-500/10 px-1.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300"
                                                        >
                                                            QR Available
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Account Number & Buttons in a clean, non-overflowing container */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/40 p-2.5">
                                                    <div className="min-w-0 flex-1">
                                                        {pm.account_number ? (
                                                            <div className="font-mono text-sm font-bold tracking-wide text-[#0C2D37] dark:text-stone-100 select-all break-all">
                                                                {pm.account_number}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-muted-foreground italic">Scan QR to pay</div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                        {pm.qr_code && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setSelectedQrModal({
                                                                        src: pm.qr_code!,
                                                                        title: `${pm.channel} QR Code`,
                                                                        channel: pm.channel,
                                                                        accountName: pm.account_name,
                                                                        accountNumber: pm.account_number,
                                                                    })
                                                                }
                                                                className="h-7.5 px-2.5 gap-1.5 border-purple-500/40 text-xs font-semibold text-purple-700 hover:bg-purple-500/10 dark:text-purple-300 cursor-pointer"
                                                            >
                                                                <QrCode className="size-3.5" />
                                                                <span>Scan QR</span>
                                                            </Button>
                                                        )}

                                                        {pm.account_number && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleCopyAccountNumber(pm.account_number, idx)
                                                                }
                                                                className="h-7.5 px-2.5 gap-1 text-xs border-[#E7DED3] hover:bg-[#FBF8F3] text-[#0C2D37] dark:text-stone-100 cursor-pointer"
                                                            >
                                                                {copiedAccountIndex === idx ? (
                                                                    <>
                                                                        <Check className="size-3.5 text-[#15803D]" />
                                                                        <span>Copied</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="size-3.5" />
                                                                        <span>Copy</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Inline QR Thumbnail snippet for instant visual tap */}
                                                {pm.qr_code && (
                                                    <div className="flex items-center gap-2.5 pt-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedQrModal({
                                                                    src: pm.qr_code!,
                                                                    title: `${pm.channel} QR Code`,
                                                                    channel: pm.channel,
                                                                    accountName: pm.account_name,
                                                                    accountNumber: pm.account_number,
                                                                })
                                                            }
                                                            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-purple-500/40 bg-white p-0.5 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                                                            title="Click to enlarge QR"
                                                        >
                                                            <img
                                                                src={pm.qr_code}
                                                                alt="QR preview"
                                                                className="size-full object-contain"
                                                            />
                                                        </button>
                                                        <div className="text-[11px] text-muted-foreground leading-tight">
                                                            <span className="font-semibold text-foreground">
                                                                Tap thumbnail to enlarge QR
                                                            </span>{' '}
                                                            or download image to pay via your {pm.channel} app.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-xs">
                                            Ask {hatian.payer_name || 'the payer'} for their GCash/Maya/Bank details.
                                        </p>
                                    )}

                                    {hatian.notes && (
                                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
                                            <span className="font-semibold">Note from {hatian.payer_name || 'Payer'}: </span>
                                            <span className="text-muted-foreground">{hatian.notes}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Official Order Receipt Card */}
                            {hatian.receipt_images && hatian.receipt_images.length > 0 && (
                                <Card className="shadow-xs border border-[#E7DED3] overflow-hidden">
                                    <CardHeader className="bg-[#FBF8F3] dark:bg-stone-900/50 pb-3 border-b border-[#E7DED3]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-7 items-center justify-center rounded-lg bg-[#D95D28]/10 text-[#D95D28]">
                                                    <Receipt className="size-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base text-[#0C2D37] dark:text-stone-100">Order Receipt Attached</CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {hatian.receipt_images.length} receipt photo{hatian.receipt_images.length > 1 ? 's' : ''} uploaded by {hatian.payer_name || 'the payer'}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="border-[#E7DED3] text-[#D95D28] bg-white dark:bg-stone-800 text-xs font-semibold">
                                                Verified Proof
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <p className="text-xs text-muted-foreground">
                                            Tap any receipt photo below to inspect itemized prices, promo vouchers, and delivery charges.
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {hatian.receipt_images.map((imgUrl, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedReceiptModal({
                                                            src: imgUrl,
                                                            index: idx,
                                                            totalImages: hatian.receipt_images!.length,
                                                        })
                                                    }
                                                    className="group relative flex aspect-3/4 flex-col overflow-hidden rounded-xl border border-[#E7DED3] bg-card shadow-2xs transition-all hover:ring-2 hover:ring-[#D95D28] text-left cursor-pointer"
                                                >
                                                    <img
                                                        src={imgUrl}
                                                        alt={`Receipt photo ${idx + 1}`}
                                                        className="size-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white gap-1 text-xs font-semibold">
                                                        <Eye className="size-4" />
                                                        <span>Inspect</span>
                                                    </div>
                                                    <Badge className="absolute top-1.5 left-1.5 bg-black/60 text-white backdrop-blur-xs text-[10px] h-4.5 px-1.5">
                                                        Page {idx + 1}
                                                    </Badge>
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Full Receipt Summary Card */}
                            <Card className="shadow-xs border border-[#E7DED3]">
                                <CardHeader className="pb-3 border-b border-[#E7DED3] bg-[#FBF8F3]/50">
                                    <CardTitle className="flex items-center gap-2 text-base text-[#0C2D37] dark:text-stone-100">
                                        <Receipt className="size-4 text-[#D95D28]" />
                                        Full Receipt Summary
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Complete breakdown of orders, group discounts, and fees.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs pt-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Gross Orders Subtotal ({hatian.items.length} items)
                                        </span>
                                        <span className="font-semibold text-[#0C2D37] dark:text-stone-100">
                                            {formatMoney(computation.subtotal, currency)}
                                        </span>
                                    </div>

                                    {hatian.discounts && hatian.discounts.length > 0 && (
                                        <div className="space-y-1 border-t pt-2">
                                            <div className="flex items-center gap-1 font-semibold text-[#D95D28]">
                                                <Tag className="size-3" />
                                                <span>Earned Group Discounts</span>
                                            </div>
                                            {hatian.discounts.map((d) => (
                                                <div
                                                    key={d.id}
                                                    className="text-muted-foreground flex justify-between pl-4"
                                                >
                                                    <span>
                                                        {d.name} ({d.split_mode})
                                                    </span>
                                                    <span className="text-[#D95D28] font-bold">
                                                        {d.type === 'percentage'
                                                            ? `-${d.value}%`
                                                            : `-${formatMoney(d.value, currency)}`}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pl-4 font-bold text-[#D95D28]">
                                                <span>Total Discount Saved</span>
                                                <span>-{formatMoney(computation.discount_total, currency)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {hatian.fees && hatian.fees.length > 0 && (
                                        <div className="space-y-1 border-t pt-2">
                                            <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                                <Truck className="size-3" />
                                                <span>Delivery & Extra Fees</span>
                                            </div>
                                            {hatian.fees.map((f) => (
                                                <div
                                                    key={f.id}
                                                    className="text-muted-foreground flex justify-between pl-4"
                                                >
                                                    <span>
                                                        {f.name} ({f.split_mode})
                                                    </span>
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                        {f.type === 'percentage'
                                                            ? `+${f.value}%`
                                                            : `+${formatMoney(f.value, currency)}`}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pl-4 font-semibold text-amber-600 dark:text-amber-400">
                                                <span>Total Fees</span>
                                                <span>+{formatMoney(computation.fee_total, currency)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t pt-3 text-base font-extrabold">
                                        <span className="text-[#0C2D37] dark:text-stone-100">Final Total Paid</span>
                                        <div className="text-right">
                                            <div className="text-[#0C2D37] dark:text-stone-100 text-lg">
                                                {formatMoney(computation.grand_total, currency)}
                                            </div>
                                            {currency !== 'PHP' && (
                                                <div className="text-muted-foreground text-xs font-medium">
                                                    ≈ {formatMoney(computation.grand_total_php, 'PHP')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* QR Code Viewer Modal for Friends Paying */}
                {selectedQrModal && (
                    <Dialog
                        open={Boolean(selectedQrModal)}
                        onOpenChange={(open) => !open && setSelectedQrModal(null)}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base">
                                    <QrCode className="size-4 text-purple-600 dark:text-purple-400" />
                                    {selectedQrModal.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Scan this QR code with your {selectedQrModal.channel} app, or download it to upload from your photos.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col items-center justify-center p-2">
                                <div className="max-h-[70vh] max-w-full overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
                                    <img
                                        src={selectedQrModal.src}
                                        alt={`${selectedQrModal.channel} QR Code`}
                                        className="max-h-[50vh] w-auto rounded-lg object-contain"
                                    />
                                </div>

                                {(selectedQrModal.accountName || selectedQrModal.accountNumber) && (
                                    <div className="bg-muted/50 mt-3 w-full rounded-lg border p-2.5 text-center text-xs">
                                        {selectedQrModal.accountName && (
                                            <div className="font-semibold text-foreground">
                                                {selectedQrModal.accountName}
                                            </div>
                                        )}
                                        {selectedQrModal.accountNumber && (
                                            <div className="text-muted-foreground font-mono font-medium">
                                                {selectedQrModal.accountNumber}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t pt-3">
                                <a
                                    href={selectedQrModal.src}
                                    download={`${selectedQrModal.channel}-QR.jpg`}
                                    className="border-input bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                                >
                                    <Download className="size-3.5" />
                                    Download QR Image
                                </a>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedQrModal(null)}
                                    className="h-8 text-xs"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Receipt Modal Viewer for Participants */}
                {selectedReceiptModal && (
                    <Dialog
                        open={Boolean(selectedReceiptModal)}
                        onOpenChange={(open) => !open && setSelectedReceiptModal(null)}
                    >
                        <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-4 sm:p-6 border-[#E7DED3]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base text-[#0C2D37] dark:text-stone-100">
                                    <Receipt className="size-4 text-[#D95D28]" />
                                    <span>Order Receipt — Page {selectedReceiptModal.index + 1} of {selectedReceiptModal.totalImages}</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Original order receipt uploaded by {hatian.payer_name || 'the payer'}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-auto rounded-xl border border-[#E7DED3] bg-zinc-950/5 dark:bg-zinc-950/50 p-2 flex items-center justify-center">
                                <img
                                    src={selectedReceiptModal.src}
                                    alt={`Receipt page ${selectedReceiptModal.index + 1}`}
                                    className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
                                />
                            </div>

                            {selectedReceiptModal.totalImages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    {hatian.receipt_images?.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() =>
                                                setSelectedReceiptModal({
                                                    src: hatian.receipt_images![i],
                                                    index: i,
                                                    totalImages: hatian.receipt_images!.length,
                                                })
                                            }
                                            className={`size-2.5 rounded-full transition-all cursor-pointer ${
                                                i === selectedReceiptModal.index
                                                    ? 'bg-[#D95D28] scale-125'
                                                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                                            }`}
                                            aria-label={`Go to receipt page ${i + 1}`}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2 border-t pt-3 mt-2">
                                <a
                                    href={selectedReceiptModal.src}
                                    download={`hatian-receipt-page-${selectedReceiptModal.index + 1}.jpg`}
                                    className="border-input bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                                >
                                    <Download className="size-3.5" />
                                    Download Full Image
                                </a>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedReceiptModal(null)}
                                    className="h-8 text-xs"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Mark as Paid Dialog (Screenshot Required & Mobile Friendly) */}
                {markPaidModal && (
                    <Dialog
                        open={Boolean(markPaidModal)}
                        onOpenChange={(open) => !open && setMarkPaidModal(null)}
                    >
                        <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 border-[#E7DED3]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base text-[#0C2D37] dark:text-stone-100">
                                    <Camera className="size-4 text-[#D95D28]" />
                                    <span>Mark Payment — {markPaidModal.participantName}</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Attach a screenshot of your payment receipt for your share of{' '}
                                    <strong className="text-[#0C2D37] dark:text-stone-100 font-bold">
                                        {formatMoney(markPaidModal.netTotal, currency)}
                                    </strong>
                                    .
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                                {/* Screenshot Upload / Preview Zone */}
                                {paymentProofInputs[markPaidModal.participantId] ? (
                                    <div className="rounded-xl border border-[#15803D]/40 bg-[#15803D]/5 p-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <img
                                                src={paymentProofInputs[markPaidModal.participantId]!}
                                                alt="Proof Preview"
                                                className="size-16 rounded-lg object-cover border border-[#E7DED3] shrink-0 shadow-2xs"
                                            />
                                            <div className="text-left overflow-hidden">
                                                <div className="text-xs font-bold text-[#15803D] flex items-center gap-1">
                                                    <Check className="size-3.5" />
                                                    <span>Screenshot Attached</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    GCash / Maya / Bank Receipt ready
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <label
                                                htmlFor="modal-proof-change-input"
                                                className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[#E7DED3] bg-background hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer shadow-2xs transition-colors"
                                            >
                                                Change
                                            </label>
                                            <input
                                                id="modal-proof-change-input"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={isUploadingProof[markPaidModal.participantId]}
                                                onChange={(e) =>
                                                    handleProofUpload(markPaidModal.participantId, e.target.files?.[0])
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProofInput(markPaidModal.participantId)}
                                                className="p-1.5 text-stone-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                                title="Remove attached proof"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label
                                        htmlFor="modal-proof-upload-input"
                                        className="hover:border-[#D95D28] hover:bg-[#FBF8F3] dark:hover:bg-stone-900 group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#D95D28]/40 bg-[#FBF8F3]/40 p-6 text-center transition-all cursor-pointer"
                                    >
                                        <div className="flex size-12 items-center justify-center rounded-full bg-[#D95D28]/10 text-[#D95D28] group-hover:scale-105 transition-transform">
                                            {isUploadingProof[markPaidModal.participantId] ? (
                                                <LoaderCircle className="size-6 animate-spin" />
                                            ) : (
                                                <Camera className="size-6" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-[#0C2D37] dark:text-stone-100">
                                                {isUploadingProof[markPaidModal.participantId]
                                                    ? 'Compressing Screenshot...'
                                                    : 'Upload Receipt Screenshot *'}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Tap to select from photos or take a screenshot of your payment
                                            </p>
                                        </div>
                                    </label>
                                )}

                                <input
                                    id="modal-proof-upload-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploadingProof[markPaidModal.participantId]}
                                    onChange={(e) =>
                                        handleProofUpload(markPaidModal.participantId, e.target.files?.[0])
                                    }
                                />

                                {/* Optional Note Input */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                                        Payment Note / Reference (Optional)
                                    </label>
                                    <Input
                                        placeholder="e.g., GCash Ref #9912, sent at 2:15 PM"
                                        value={paymentNoteInputs[markPaidModal.participantId] ?? ''}
                                        onChange={(e) =>
                                            setPaymentNoteInputs((prev) => ({
                                                ...prev,
                                                [markPaidModal.participantId]: e.target.value,
                                            }))
                                        }
                                        className="h-10 text-xs border-[#E7DED3]"
                                    />
                                </div>

                                {!paymentProofInputs[markPaidModal.participantId] && (
                                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-2 text-xs text-amber-800 dark:text-amber-300">
                                        <AlertCircle className="size-4 shrink-0 text-amber-600" />
                                        <span>A screenshot of your payment is required to confirm.</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t pt-3 mt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMarkPaidModal(null)}
                                    className="h-10 text-xs border-[#E7DED3]"
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    disabled={
                                        !paymentProofInputs[markPaidModal.participantId] ||
                                        togglingParticipantId === markPaidModal.participantId ||
                                        Boolean(isUploadingProof[markPaidModal.participantId])
                                    }
                                    onClick={() => {
                                        handleTogglePaid(markPaidModal.participantId, false);
                                        setMarkPaidModal(null);
                                    }}
                                    className="h-10 flex-1 gap-1.5 bg-[#15803D] hover:bg-[#15803D]/90 text-white font-bold text-xs shadow-2xs cursor-pointer disabled:opacity-40 transition-all"
                                >
                                    {togglingParticipantId === markPaidModal.participantId ? (
                                        <>
                                            <LoaderCircle className="size-3.5 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="size-3.5" />
                                            <span>Confirm & Mark as Paid</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Payment Proof Modal Viewer */}
                {selectedProofModal && (
                    <Dialog
                        open={Boolean(selectedProofModal)}
                        onOpenChange={(open) => !open && setSelectedProofModal(null)}
                    >
                        <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 border-[#E7DED3]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base text-[#0C2D37] dark:text-stone-100">
                                    <Receipt className="size-4 text-[#D95D28]" />
                                    <span>Payment Proof — {selectedProofModal.participantName}</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Uploaded proof for their share of {formatMoney(selectedProofModal.netTotal, currency)}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-auto rounded-xl border border-[#E7DED3] bg-zinc-950/5 dark:bg-zinc-950/50 p-2 flex items-center justify-center">
                                <img
                                    src={selectedProofModal.src}
                                    alt={`Payment proof from ${selectedProofModal.participantName}`}
                                    className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
                                />
                            </div>

                            {selectedProofModal.paymentNote && (
                                <div className="bg-[#FBF8F3] dark:bg-stone-900/60 rounded-lg border border-[#E7DED3] p-2.5 text-xs">
                                    <span className="font-semibold text-[#0C2D37] dark:text-stone-100">Note: </span>
                                    <span className="text-muted-foreground">{selectedProofModal.paymentNote}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2 border-t pt-3 mt-1">
                                <a
                                    href={selectedProofModal.src}
                                    download={`payment-proof-${selectedProofModal.participantName.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                                    className="border-input bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                                >
                                    <Download className="size-3.5" />
                                    Download Proof
                                </a>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedProofModal(null)}
                                    className="h-8 text-xs"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </main>
        </div>
    );
}

