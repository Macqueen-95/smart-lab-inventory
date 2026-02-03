"use client"

import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { useEffect, useState } from "react";
import { authAPI } from "@/lib/api";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthPage = pathname === "/login" || pathname === "/register";
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthPage) setIsLoading(false);

        async function checkAuth() {
            try {
                const result = await authAPI.getMe();
                if (isAuthPage) {
                    if (result.success) router.push("/");
                    return;
                }
                if (!result.success) router.push("/login");
            } catch (_error) {
                if (!isAuthPage) router.push("/login");
            } finally {
                if (!isAuthPage) setIsLoading(false);
            }
        }

        checkAuth();
    }, [pathname, isAuthPage, router]);

    if (isLoading && !isAuthPage) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    // Full-page layout for login/register: no sidebar, centered on viewport
    if (isAuthPage) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-zinc-100 p-4">
                {children}
            </div>
        );
    }

    return (
        <>
            <AppSidebar />
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </>
    );
}
