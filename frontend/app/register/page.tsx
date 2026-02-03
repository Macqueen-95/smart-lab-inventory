"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { authAPI, RegisterData } from "@/lib/api"
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react"

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState<RegisterData>({
        name: "",
        userid: "",
        password: "",
        confirm_password: "",
    })
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setIsLoading(true)

        // Client-side validation
        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match")
            setIsLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters")
            setIsLoading(false)
            return
        }

        try {
            const result = await authAPI.register(formData)
            
            if (result.success) {
                setSuccess("Registration successful! Redirecting to login...")
                setTimeout(() => {
                    router.push("/login")
                }, 2000)
            } else {
                setError(result.message || "Registration failed")
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "An error occurred during registration")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-green-100 rounded-full">
                            <UserPlus className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Register</CardTitle>
                    <CardDescription>Create a new account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{success}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-black">
                                Full Name *
                            </label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="userid" className="text-sm font-medium text-black">
                                User ID *
                            </label>
                            <Input
                                id="userid"
                                type="text"
                                placeholder="Choose a unique user ID"
                                value={formData.userid}
                                onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-black">
                                Password *
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password (min 6 characters)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirm_password" className="text-sm font-medium text-black">
                                Confirm Password *
                            </label>
                            <Input
                                id="confirm_password"
                                type="password"
                                placeholder="Confirm your password"
                                value={formData.confirm_password}
                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white text-black border border-zinc-300 hover:bg-zinc-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Registering..." : "Register"}
                        </Button>

                        <div className="text-center text-sm text-zinc-600">
                            Already have an account?{" "}
                            <Link href="/login" className="text-blue-600 hover:underline font-medium">
                                Login here
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
    )
}
