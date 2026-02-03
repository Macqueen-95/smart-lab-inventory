"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { authAPI, LoginData } from "@/lib/api"
import { LogIn, AlertCircle } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState<LoginData>({
        userid: "",
        password: "",
    })
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const result = await authAPI.login(formData)
            
            if (result.success) {
                // Store user info in localStorage
                localStorage.setItem("user", JSON.stringify(result.user))
                localStorage.setItem("isAuthenticated", "true")
                
                // Dispatch custom event to update sidebar
                window.dispatchEvent(new Event('authChange'))
                
                // Redirect to dashboard
                router.push("/")
            } else {
                setError(result.message || "Login failed")
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "An error occurred during login")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <LogIn className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>Sign in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="userid" className="text-sm font-medium text-black">
                                User ID
                            </label>
                            <Input
                                id="userid"
                                type="text"
                                placeholder="Enter your user ID"
                                value={formData.userid}
                                onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-black">
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white text-black border border-zinc-300 hover:bg-zinc-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Logging in..." : "Login"}
                        </Button>

                        <div className="text-center text-sm text-zinc-600">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-blue-600 hover:underline font-medium">
                                Register here
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
