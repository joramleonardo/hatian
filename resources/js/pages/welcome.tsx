import { HatianBuilder } from '@/components/hatian/hatian-builder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_META, formatMoney } from '@/lib/hatian-calculator';
import { type SharedData } from '@/types';
import { HatianDetail, HatianSummary, PaymentMethod } from '@/types/hatian';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    History,
    LayoutDashboard,
    Percent,
    Receipt,
    Share2,
    Sparkles,
    Truck,
} from 'lucide-react';

interface WelcomeProps {
    recentHatians?: HatianSummary[];
    defaultPaymentMethods?: PaymentMethod[];
    editingHatian?: HatianDetail | null;
}

export default function Welcome({
    recentHatians = [],
    defaultPaymentMethods = [],
    editingHatian = null,
}: WelcomeProps) {
    const { auth } = usePage<SharedData>().props;

    return (
        <div className="bg-background text-foreground min-h-screen">
            <Head title="Hatian — Smart Group Order, Pasabuy & Travel Bill Splitter" />

            {/* Sticky Top Bar */}
            <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Link href={route('home')} className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-[#D95D28] text-white shadow-xs">
                                <Receipt className="size-5" />
                            </div>
                            <div>
                                <span className="text-lg font-extrabold tracking-tight text-[#0C2D37] dark:text-stone-100">Hatian</span>
                                <span className="text-muted-foreground ml-2 hidden text-xs sm:inline-block">
                                    Group Order, Pasabuy & Barkada Bill Splitter
                                </span>
                            </div>
                        </Link>
                    </div>

                    <nav className="flex items-center gap-2">
                        {auth.user ? (
                            <Button asChild variant="default" size="sm" className="gap-1.5 bg-[#D95D28] text-white hover:bg-[#C2410C]">
                                <Link href={route('dashboard')}>
                                    <LayoutDashboard className="size-4" />
                                    <span>My Hatians ({recentHatians.length})</span>
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" size="sm" className="text-xs sm:text-sm">
                                    <Link href={route('login')}>Log in</Link>
                                </Button>
                                <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm border-[#E7DED3] hover:bg-[#FBF8F3] dark:hover:bg-stone-800">
                                    <Link href={route('register')}>Save History (Free)</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Compact Hero Section */}
                <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div className="max-w-2xl space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/60 px-3 py-1 text-xs font-semibold text-[#D95D28]">
                            <Sparkles className="size-3.5 text-[#D95D28]" />
                            <span>Built for GrabFood Group Orders, Pasabuys & Barkada Trips</span>
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-[#0C2D37] dark:text-stone-100">
                            Paid for the group order first?{' '}
                            <span className="text-[#D95D28]">
                                Compute everyone’s exact share in seconds.
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                            Automatically distribute earned group discounts proportionally to each friend’s order, split delivery or shipping fees fairly, and share a public breakdown link—no signup required.
                        </p>
                    </div>

                    {/* How the Math Works Pills */}
                    <div className="grid grid-cols-3 gap-2 text-xs sm:w-auto">
                        <div className="bg-card flex items-center gap-2 rounded-xl border border-[#E7DED3] p-2.5 shadow-2xs">
                            <Percent className="size-4 shrink-0 text-[#D95D28]" />
                            <div>
                                <div className="font-bold text-[#0C2D37] dark:text-stone-100">Fair Promo Split</div>
                                <div className="text-muted-foreground text-[11px]">Proportional or Equal</div>
                            </div>
                        </div>
                        <div className="bg-card flex items-center gap-2 rounded-xl border border-[#E7DED3] p-2.5 shadow-2xs">
                            <Truck className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <div className="font-bold text-[#0C2D37] dark:text-stone-100">Delivery & Fees</div>
                                <div className="text-muted-foreground text-[11px]">Equal or % Charge</div>
                            </div>
                        </div>
                        <div className="bg-card flex items-center gap-2 rounded-xl border border-[#E7DED3] p-2.5 shadow-2xs">
                            <Share2 className="size-4 shrink-0 text-[#0C2D37] dark:text-teal-400" />
                            <div>
                                <div className="font-bold text-[#0C2D37] dark:text-stone-100">Public Link</div>
                                <div className="text-muted-foreground text-[11px]">View & Mark Paid</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Hatians Strip (for Guest Session or Logged-in User) */}
                {recentHatians.length > 0 && (
                    <div className="mb-6 rounded-2xl border border-[#E7DED3] bg-[#FBF8F3] dark:bg-stone-900/40 p-3.5">
                        <div className="mb-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#0C2D37] dark:text-stone-100">
                                <History className="size-3.5 text-[#D95D28]" />
                                <span>Your Recent Hatians</span>
                            </div>
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#D95D28] hover:underline"
                                >
                                    View All in Dashboard
                                    <ArrowRight className="size-3" />
                                </Link>
                            ) : (
                                <Link
                                    href={route('register')}
                                    className="text-muted-foreground hover:text-foreground text-[11px] underline"
                                >
                                    Create an account to keep these permanently
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {recentHatians.slice(0, 3).map((item) => (
                                <Link
                                    key={item.share_code}
                                    href={route('hatians.show', item.share_code)}
                                    className="bg-card hover:border-[#D95D28]/60 flex items-center justify-between rounded-xl border border-[#E7DED3] p-3 transition-all shadow-2xs"
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <Badge
                                                variant="outline"
                                                className={`h-4 px-1.5 text-[10px] ${
                                                    CATEGORY_META[item.category]?.badgeColor || ''
                                                }`}
                                            >
                                                {CATEGORY_META[item.category]?.shortLabel || 'Split'}
                                            </Badge>
                                            <span className="truncate text-xs font-bold text-[#0C2D37] dark:text-stone-100">{item.title}</span>
                                        </div>
                                        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
                                            <span>{item.participant_count} people</span>
                                            <span>•</span>
                                            {item.is_fully_paid ? (
                                                <span className="inline-flex items-center gap-1 font-medium text-[#15803D] dark:text-emerald-400">
                                                    <CheckCircle2 className="size-3" />
                                                    Settled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                                    <Clock className="size-3" />
                                                    {item.paid_count}/{item.participant_count} paid
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-extrabold text-[#0C2D37] dark:text-stone-100">
                                            {formatMoney(item.grand_total, item.currency)}
                                        </div>
                                        <div className="text-muted-foreground font-mono text-[10px]">
                                            /s/{item.share_code}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Guest-First Interactive Builder */}
                <HatianBuilder
                    initialData={editingHatian}
                    defaultPaymentMethods={defaultPaymentMethods}
                    isEditing={Boolean(editingHatian)}
                />
            </main>
        </div>
    );
}
