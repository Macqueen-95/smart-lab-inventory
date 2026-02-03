import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Smart Lab Inventory',
    description: 'Manage lab assets efficiently',
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <header className="h-16 border-b bg-white dark:bg-zinc-950 flex items-center justify-between px-6 md:hidden">
                {/* Header content mainly for mobile or breadcrumbs if needed later */}
                <span className="font-semibold">Dashboard</span>
            </header>
            <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6">
                {children}
            </main>
        </div>
    )
}
