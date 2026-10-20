import { Receipt } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#D95D28] text-white shadow-xs">
                <Receipt className="size-4" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-bold text-[#0C2D37] dark:text-stone-100">Hatian</span>
                <span className="text-muted-foreground truncate text-[10px]">Smart Bill & Promo Splitter</span>
            </div>
        </>
    );
}
