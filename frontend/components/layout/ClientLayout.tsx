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
        async function checkAuth() {
            if (isAuthPage) {
                setIsLoading(false);
                return;
            }

            try {
                const result = await authAPI.getMe();
                if (!result.success) {
                    router.push("/login");
                }
            } catch (error) {
                router.push("/login");
            } finally {
                setIsLoading(false);
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

    return (
        <>
            {!isAuthPage && <AppSidebar />}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                <main className={isAuthPage ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto p-4 md:p-8"}>
                    {children}
                </main>
            </div>
        </>
    );
}
