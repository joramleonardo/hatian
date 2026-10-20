import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-[#FBF8F3] dark:bg-stone-950 text-foreground flex min-h-screen flex-col justify-between selection:bg-[#D95D28]/20 selection:text-[#D95D28]">
            {/* Top Navigation */}
            <header className="border-b border-[#E7DED3] dark:border-stone-800 bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
                    <Link href={route('home')} className="flex items-center gap-2 group">
                        <AppLogo />
                    </Link>

                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                        <Link href={route('home')}>
                            <ArrowLeft className="size-3.5" />
                            <span>Back to Split Calculator</span>
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Main Auth Content */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
                <div className="w-full max-w-md">
                    <div className="bg-card border border-[#E7DED3] dark:border-stone-800 rounded-2xl shadow-sm p-6 sm:p-8">
                        <div className="mb-6 space-y-1.5 text-center">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0C2D37] dark:text-stone-100">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                    {description}
                                </p>
                            )}
                        </div>

                        {children}
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-[#E7DED3] dark:border-stone-800 py-4 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                    <Sparkles className="size-3 text-[#D95D28]" />
                    <span>Hatian — Smart bill splitting for GrabFood orders, pasabuys & barkada trips.</span>
                </div>
            </footer>
        </div>
    );
}
