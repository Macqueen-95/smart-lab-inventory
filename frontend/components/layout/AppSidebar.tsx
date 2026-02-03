"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Map, Package, ClipboardList, Settings, Menu, ChevronLeft, ChevronRight, LogIn, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { authAPI } from "@/lib/api"

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/map", label: "Floor Map", icon: Map },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/logs", label: "Logs", icon: ClipboardList },
    { href: "/admin", label: "Admin", icon: Settings },
]

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState<{ name: string; userid: string } | null>(null)

    const checkAuth = async () => {
        try {
            const result = await authAPI.getMe()
            if (result.success && result.user) {
                setIsAuthenticated(true)
                setUser(result.user)
            } else {
                setIsAuthenticated(false)
                setUser(null)
            }
        } catch (e) {
            setIsAuthenticated(false)
            setUser(null)
        }
    }

    // Load collapsed state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sidebarCollapsed")
        if (saved === "true") {
            setIsCollapsed(true)
        }

        // Check authentication
        checkAuth()
    }, [pathname]) // Re-check on route change

    // Listen for auth changes (custom event from login/logout)
    useEffect(() => {
        const handleAuthChange = () => {
            checkAuth()
        }

        window.addEventListener('authChange', handleAuthChange)

        return () => {
            window.removeEventListener('authChange', handleAuthChange)
        }
    }, [])

    const toggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem("sidebarCollapsed", String(newState))
    }

    const handleLogout = async () => {
        try {
            await authAPI.logout()
        } catch (err) {
            console.error("Logout failed", err)
        }

        setIsAuthenticated(false)
        setUser(null)

        // Dispatch custom event to update sidebar
        window.dispatchEvent(new Event('authChange'))

        router.push("/login")
    }

    return (
        <>
            {/* Mobile Trigger */}
            <div className="md:hidden p-4 border-b flex justify-between items-center bg-white dark:bg-zinc-950">
                <h1 className="font-semibold text-lg">Smart Lab</h1>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {/* Sidebar Container */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 text-zinc-900 transform transition-all duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-screen md:flex md:flex-col",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full",
                    isCollapsed ? "md:w-16" : "md:w-64 w-64"
                )}
            >
                <div className={cn("p-6 border-b border-gray-200 flex items-center justify-between", isCollapsed && "md:px-2 md:justify-center")}>
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold tracking-tight">Smart Lab <span className="text-zinc-500 text-sm block font-normal">Inventory System</span></h1>
                    )}
                    {isCollapsed && (
                        <h1 className="text-xl font-bold">SL</h1>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleCollapse}
                        className="hidden md:flex h-8 w-8"
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-none text-sm font-medium transition-colors border-l-2",
                                    isActive
                                        ? "bg-gray-100 text-black border-black"
                                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-black",
                                    isCollapsed && "md:justify-center md:px-2"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                <div className={cn("p-4 border-t border-gray-200 space-y-2", isCollapsed && "md:px-2")}>
                    {isAuthenticated && user ? (
                        <>
                            <div className={cn("flex items-center gap-3 px-4 py-3", isCollapsed && "md:justify-center md:px-0")}>
                                <div className="h-8 w-8 rounded-none bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                {!isCollapsed && (
                                    <div className="text-xs flex-1">
                                        <p className="font-medium text-black">{user.name}</p>
                                        <p className="text-zinc-500">{user.userid}</p>
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className={cn(
                                    "w-full bg-white text-black border border-zinc-300 hover:bg-zinc-50",
                                    isCollapsed && "md:w-auto md:px-2"
                                )}
                                title={isCollapsed ? "Logout" : undefined}
                            >
                                <LogOut className="h-4 w-4" />
                                {!isCollapsed && <span className="ml-2">Logout</span>}
                            </Button>
                        </>
                    ) : (
                        <Link href="/login" onClick={() => setIsMobileOpen(false)}>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full bg-white text-black border border-zinc-300 hover:bg-zinc-50",
                                    isCollapsed && "md:w-auto md:px-2"
                                )}
                                title={isCollapsed ? "Login" : undefined}
                            >
                                <LogIn className="h-4 w-4" />
                                {!isCollapsed && <span className="ml-2">Login</span>}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    )
}
