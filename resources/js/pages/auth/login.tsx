import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, History, LoaderCircle, Receipt, Sparkles } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout
            title="Welcome back to Hatian"
            description="Log in to access your bill history, manage settlements, and use saved payment methods."
        >
            <Head title="Log in" />

            {status && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 p-3 text-center text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {status}
                </div>
            )}

            {/* Split History Callout */}
            <div className="mb-6 rounded-xl border border-[#E7DED3] bg-[#FBF8F3] dark:border-stone-800 dark:bg-stone-900/60 p-3.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-2 font-semibold text-[#0C2D37] dark:text-stone-100 mb-1.5">
                    <History className="size-4 text-[#D95D28]" />
                    <span>Your Group Order & Bill History</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Logging in lets you track which friends have paid, review past GrabFood/Shopee splits, and keep your GCash/Maya QR codes saved for instant bill creation.
                </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                            Email address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            className="h-10 text-xs sm:text-sm border-[#E7DED3] dark:border-stone-800 focus-visible:ring-[#D95D28]"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                                Password
                            </Label>
                            {canResetPassword && (
                                <TextLink
                                    href={route('password.request')}
                                    className="text-xs text-[#D95D28] hover:underline"
                                    tabIndex={5}
                                >
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Enter your password"
                                className="h-10 text-xs sm:text-sm pr-10 border-[#E7DED3] dark:border-stone-800 focus-visible:ring-[#D95D28]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 p-1"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <EyeOff className="size-4" />
                                ) : (
                                    <Eye className="size-4" />
                                )}
                            </button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-2.5 pt-1">
                        <Checkbox
                            id="remember"
                            name="remember"
                            tabIndex={3}
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', Boolean(checked))}
                        />
                        <Label htmlFor="remember" className="text-xs text-muted-foreground font-normal cursor-pointer select-none">
                            Keep me logged in on this device
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full h-10 sm:h-11 bg-[#D95D28] text-white hover:bg-[#C2410C] font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                        tabIndex={4}
                        disabled={processing}
                    >
                        {processing ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRight className="h-4 w-4" />
                        )}
                        <span>Log in to Hatian</span>
                    </Button>
                </div>

                {/* Create Account Banner */}
                <div className="rounded-xl border border-dashed border-[#E7DED3] dark:border-stone-800 p-3.5 text-center space-y-1.5 bg-[#FBF8F3]/50 dark:bg-stone-900/30">
                    <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                        Don&apos;t have an account yet?
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        Sign up in 30 seconds to automatically claim and store your bill history.
                    </p>
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-semibold border-[#D95D28]/30 text-[#D95D28] hover:bg-[#D95D28]/10 hover:text-[#C2410C] mt-1"
                    >
                        <Link href={route('register')}>
                            <Sparkles className="size-3.5 mr-1 text-[#D95D28]" />
                            <span>Create Free Account to Save History</span>
                        </Link>
                    </Button>
                </div>

                {/* Guest Escape Link */}
                <div className="text-center pt-1 border-t border-[#E7DED3] dark:border-stone-800">
                    <Link
                        href={route('home')}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#0C2D37] dark:hover:text-stone-100 transition-colors"
                    >
                        <Receipt className="size-3.5 text-[#D95D28]" />
                        <span>Just need to split right now? <strong>Continue as Guest</strong></span>
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
