import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Receipt, Sparkles } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface RegisterForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title="Create your free Hatian account"
            description="Keep a permanent record of all group orders, track settlements, and save your payment QRs."
        >
            <Head title="Register" />

            {/* Split History Perks Callout */}
            <div className="mb-6 rounded-xl border border-[#E7DED3] bg-[#FBF8F3] dark:border-stone-800 dark:bg-stone-900/60 p-3.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-2 font-semibold text-[#0C2D37] dark:text-stone-100 mb-1.5">
                    <Sparkles className="size-4 text-[#D95D28]" />
                    <span>Why create an account?</span>
                </div>
                <ul className="space-y-1 text-muted-foreground text-[11px] leading-relaxed list-disc pl-4">
                    <li><strong>Full Bill History:</strong> Never lose track of who owes you from past dinners or trips.</li>
                    <li><strong>Auto-Claim Guest Splits:</strong> Any splits you created earlier on this browser will be saved directly to your dashboard.</li>
                    <li><strong>Saved GCash / Maya QRs:</strong> Upload your payment QR once and reuse it across all splits.</li>
                </ul>
            </div>

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name" className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                            Your Name
                        </Label>
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="e.g. Maria Santos"
                            className="h-10 text-xs sm:text-sm border-[#E7DED3] dark:border-stone-800 focus-visible:ring-[#D95D28]"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                            Email address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder="you@example.com"
                            className="h-10 text-xs sm:text-sm border-[#E7DED3] dark:border-stone-800 focus-visible:ring-[#D95D28]"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="password" className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={3}
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                disabled={processing}
                                placeholder="Create a secure password"
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

                    <div className="grid gap-1.5">
                        <Label htmlFor="password_confirmation" className="text-xs font-semibold text-[#0C2D37] dark:text-stone-200">
                            Confirm password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                disabled={processing}
                                placeholder="Re-type your password"
                                className="h-10 text-xs sm:text-sm pr-10 border-[#E7DED3] dark:border-stone-800 focus-visible:ring-[#D95D28]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 p-1"
                                tabIndex={-1}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="size-4" />
                                ) : (
                                    <Eye className="size-4" />
                                )}
                            </button>
                        </div>
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full h-10 sm:h-11 bg-[#D95D28] text-white hover:bg-[#C2410C] font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                        tabIndex={5}
                        disabled={processing}
                    >
                        {processing ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRight className="h-4 w-4" />
                        )}
                        <span>Create Account & Save History</span>
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-xs mt-2">
                    Already have an account?{' '}
                    <TextLink href={route('login')} className="text-[#D95D28] font-semibold hover:underline" tabIndex={6}>
                        Log in
                    </TextLink>
                </div>

                {/* Guest Escape Link */}
                <div className="text-center pt-2 border-t border-[#E7DED3] dark:border-stone-800">
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
