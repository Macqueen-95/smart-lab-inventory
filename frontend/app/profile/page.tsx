"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { profileAPI, rfidAPI, authAPI } from "@/lib/api"
import { ArrowLeft, User, Lock, Radio, Camera, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<"info" | "password" | "rfid">("info")
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

    // Info Tab
    const [name, setName] = useState("")
    const [profilePictureUrl, setProfilePictureUrl] = useState("")
    const [isUploadingPicture, setIsUploadingPicture] = useState(false)

    // Password Tab
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    // RFID Tab
    const [userRfid, setUserRfid] = useState("")
    const [isScanning, setIsScanning] = useState(false)
    const [scannedRfid, setScannedRfid] = useState("")

    // Load user on mount
    useEffect(() => {
        loadUserProfile()
    }, [])

    const loadUserProfile = async () => {
        try {
            const result = await authAPI.getMe()
            if (result.success) {
                setUser(result.user)
                setName(result.user.name || "")
                setProfilePictureUrl(result.user.profile_picture_url || "")
                setUserRfid(result.user.user_rfid_uid || "")
            }
        } catch (err) {
            console.error("Failed to load profile:", err)
        }
    }

    // RFID Polling
    useEffect(() => {
        if (!isScanning) return

        const interval = setInterval(async () => {
            try {
                const result = await rfidAPI.getLatestScan()
                if (result.success && result.rfid_uid) {
                    setScannedRfid(result.rfid_uid)
                }
            } catch (err) {
                // Silent fail
            }
        }, 100)

        return () => clearInterval(interval)
    }, [isScanning])

    // Update Profile Info
    const handleUpdateInfo = async () => {
        if (!name.trim()) {
            setMessage({ type: "error", text: "Name cannot be empty" })
            return
        }

        setLoading(true)
        try {
            const result = await profileAPI.update({
                name: name.trim(),
                profile_picture_url: profilePictureUrl || undefined
            })
            if (result.success) {
                setMessage({ type: "success", text: "Profile updated successfully!" })
                setUser(result.user)
            } else {
                setMessage({ type: "error", text: result.message || "Failed to update profile" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error updating profile" })
        } finally {
            setLoading(false)
        }
    }

    // Change Password
    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage({ type: "error", text: "All password fields are required" })
            return
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "New passwords do not match" })
            return
        }

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "New password must be at least 6 characters" })
            return
        }

        setLoading(true)
        try {
            const result = await profileAPI.changePassword(currentPassword, newPassword)
            if (result.success) {
                setMessage({ type: "success", text: "Password changed successfully!" })
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                setMessage({ type: "error", text: result.message || "Failed to change password" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error changing password" })
        } finally {
            setLoading(false)
        }
    }

    // Assign RFID
    const handleAssignRfid = async () => {
        if (!scannedRfid) {
            setMessage({ type: "error", text: "Please scan an RFID tag" })
            return
        }

        setLoading(true)
        try {
            const result = await profileAPI.assignRfid(scannedRfid)
            if (result.success) {
                setMessage({ type: "success", text: `RFID assigned: ${scannedRfid}` })
                setUser(result.user)
                setUserRfid(scannedRfid)
                setScannedRfid("")
                setIsScanning(false)
            } else {
                setMessage({ type: "error", text: result.message || "Failed to assign RFID" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error assigning RFID" })
        } finally {
            setLoading(false)
        }
    }

    // Picture Upload
    const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingPicture(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()
            if (data.url) {
                setProfilePictureUrl(data.url)
                setMessage({ type: "success", text: "Picture uploaded! Click 'Save Changes' to apply." })
            } else {
                setMessage({ type: "error", text: "Failed to upload picture" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: "Error uploading picture" })
        } finally {
            setIsUploadingPicture(false)
        }
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-zinc-500">Loading profile...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
                    <p className="text-zinc-500">Manage your account settings</p>
                </div>
                <Link href="/">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </Link>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {message.text}
                </div>
            )}

            {/* User Avatar & ID */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                            {profilePictureUrl ? (
                                <img src={profilePictureUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-white" />
                            )}
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{user.name}</p>
                            <p className="text-zinc-500">@{user.userid}</p>
                            {user.user_rfid_uid && (
                                <Badge className="mt-2 bg-blue-100 text-blue-800">RFID: {user.user_rfid_uid}</Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab("info")}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === "info" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500"}`}
                >
                    <User className="h-4 w-4 inline mr-2" />
                    Account Info
                </button>
                <button
                    onClick={() => setActiveTab("password")}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === "password" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500"}`}
                >
                    <Lock className="h-4 w-4 inline mr-2" />
                    Password
                </button>
                <button
                    onClick={() => setActiveTab("rfid")}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === "rfid" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500"}`}
                >
                    <Radio className="h-4 w-4 inline mr-2" />
                    RFID Tag
                </button>
            </div>

            {/* Account Info Tab */}
            {activeTab === "info" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>Update your name and profile picture</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Profile Picture</label>
                            <div className="flex gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePictureUpload}
                                    disabled={isUploadingPicture}
                                    className="bg-white text-black"
                                />
                                <Button variant="outline" disabled={isUploadingPicture}>
                                    <Camera className="h-4 w-4 mr-2" />
                                    {isUploadingPicture ? "Uploading..." : "Upload"}
                                </Button>
                            </div>
                            {profilePictureUrl && (
                                <p className="text-sm text-zinc-500">Picture selected - will be updated when you save changes</p>
                            )}
                        </div>

                        <Button
                            onClick={handleUpdateInfo}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your account password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Current Password</label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                                className="bg-white text-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirm New Password</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="bg-white text-black"
                            />
                        </div>

                        <Button
                            onClick={handleChangePassword}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? "Updating..." : "Change Password"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* RFID Tab */}
            {activeTab === "rfid" && (
                <Card>
                    <CardHeader>
                        <CardTitle>RFID Badge Assignment</CardTitle>
                        <CardDescription>Link your personal RFID badge to your account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {user.user_rfid_uid && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    <strong>Current RFID:</strong> {user.user_rfid_uid}
                                </p>
                            </div>
                        )}

                        {!isScanning ? (
                            <Button
                                onClick={() => setIsScanning(true)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Radio className="h-4 w-4 mr-2" />
                                Scan RFID Badge
                            </Button>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={scannedRfid}
                                    onChange={(e) => setScannedRfid(e.target.value)}
                                    placeholder="Scanning... or enter RFID manually"
                                    className="w-full px-3 py-2 border rounded-md bg-yellow-50"
                                    autoFocus
                                />
                                <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                                    Listening for RFID scan... (auto-stops after scan)
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setIsScanning(false)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAssignRfid}
                                        disabled={loading || !scannedRfid}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {loading ? "Assigning..." : "Assign RFID"}
                                    </Button>
                                </div>
                            </>
                        )}

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Tip:</strong> This RFID badge will identify you when lending/borrowing items or in audit scans.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
