"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"

interface ScanningUIProps {
    isScanning: boolean
    scannedCount?: number
    icon?: string | React.ReactNode
    title: string
    description: string
    color?: "blue" | "green"
}

export function ScanningUI({
    isScanning,
    scannedCount = 0,
    icon = "📦",
    title,
    description,
    color = "blue",
}: ScanningUIProps) {
    const colorClasses = color === "blue" 
        ? {
            border: "border-blue-200",
            bg: "bg-blue-50",
            pulse: "breathing-pulse",
            circle: "bg-gradient-to-br from-blue-400 to-blue-600",
            text: "text-blue-900",
            textSecondary: "text-blue-700",
        }
        : {
            border: "border-green-200",
            bg: "bg-green-50",
            pulse: "breathing-pulse-green",
            circle: "bg-gradient-to-br from-green-400 to-green-600",
            text: "text-green-900",
            textSecondary: "text-green-700",
        }

    return (
        <Card className={`border-2 ${colorClasses.border} ${colorClasses.bg}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="text-3xl">{icon}</span>
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="relative w-32 h-32">
                        <div className={`absolute inset-0 ${colorClasses.pulse} rounded-full ${color === "blue" ? "bg-blue-100" : "bg-green-100"}`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`breathing-circle w-24 h-24 ${colorClasses.circle} rounded-full flex items-center justify-center text-white`}>
                                {typeof icon === "string" ? (
                                    <span className="text-5xl">{icon}</span>
                                ) : (
                                    <div className="text-white">{icon}</div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className={`text-lg font-semibold ${colorClasses.text}`}>
                            {isScanning ? "Listening for scans..." : "Ready to scan"}
                        </p>
                        {scannedCount > 0 && (
                            <p className={`text-sm ${colorClasses.textSecondary} mt-1`}>
                                Scanned: <span className="font-bold">{scannedCount}</span>
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
